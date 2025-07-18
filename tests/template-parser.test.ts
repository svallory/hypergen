import { TemplateParser } from '../src/config/template-parser'
import { beforeEach, afterEach, describe, it, expect } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'

describe('TemplateParser', () => {
  let tempDir: string
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'hypergen-test-'))
  })
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('parseTemplateFile', () => {
    it('should parse valid template.yml file', async () => {
      const templateContent = `
name: test-template
description: Test template for unit testing
version: 1.0.0
author: Test Author
category: test
tags: [test, unit]

variables:
  name:
    type: string
    required: true
    description: Component name
    pattern: "^[a-zA-Z][a-zA-Z0-9]*$"
  
  type:
    type: enum
    values: [functional, class]
    default: functional
    description: Component type
    
  withTests:
    type: boolean
    default: true
    description: Include test files

examples:
  - title: Basic component
    description: Create a basic component
    variables:
      name: Button
      type: functional
      withTests: true
`
      
      const templatePath = path.join(tempDir, 'template.yml')
      fs.writeFileSync(templatePath, templateContent)
      
      const result = await TemplateParser.parseTemplateFile(templatePath)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.config.name).toBe('test-template')
      expect(result.config.description).toBe('Test template for unit testing')
      expect(result.config.version).toBe('1.0.0')
      expect(result.config.author).toBe('Test Author')
      expect(result.config.category).toBe('test')
      expect(result.config.tags).toEqual(['test', 'unit'])
      
      // Check variables
      expect(Object.keys(result.config.variables)).toHaveLength(3)
      expect(result.config.variables.name.type).toBe('string')
      expect(result.config.variables.name.required).toBe(true)
      expect(result.config.variables.name.pattern).toBe('^[a-zA-Z][a-zA-Z0-9]*$')
      
      expect(result.config.variables.type.type).toBe('enum')
      expect(result.config.variables.type.values).toEqual(['functional', 'class'])
      expect(result.config.variables.type.default).toBe('functional')
      
      expect(result.config.variables.withTests.type).toBe('boolean')
      expect(result.config.variables.withTests.default).toBe(true)
      
      // Check examples
      expect(result.config.examples).toHaveLength(1)
      expect(result.config.examples![0].title).toBe('Basic component')
      expect(result.config.examples![0].variables.name).toBe('Button')
    })

    it('should return errors for invalid template.yml', async () => {
      const templateContent = `
# Missing required name field
description: Test template
variables:
  invalidType:
    type: invalid-type
    required: not-a-boolean
`
      
      const templatePath = path.join(tempDir, 'template.yml')
      fs.writeFileSync(templatePath, templateContent)
      
      const result = await TemplateParser.parseTemplateFile(templatePath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Template name is required'))).toBe(true)
      expect(result.errors.some(e => e.includes('invalid type'))).toBe(true)
    })

    it('should return error for non-existent file', async () => {
      const result = await TemplateParser.parseTemplateFile('/non/existent/file.yml')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('not found'))).toBe(true)
    })
  })

  describe('parseTemplateDirectory', () => {
    it('should parse all templates in directory', async () => {
      // Create test template structure
      const template1Dir = path.join(tempDir, 'template1')
      const template2Dir = path.join(tempDir, 'template2')
      
      fs.mkdirSync(template1Dir, { recursive: true })
      fs.mkdirSync(template2Dir, { recursive: true })
      
      const template1Content = `
name: template1
description: First template
variables:
  name:
    type: string
    required: true
`
      
      const template2Content = `
name: template2
description: Second template
variables:
  type:
    type: enum
    values: [a, b, c]
`
      
      fs.writeFileSync(path.join(template1Dir, 'template.yml'), template1Content)
      fs.writeFileSync(path.join(template2Dir, 'template.yml'), template2Content)
      
      const results = await TemplateParser.parseTemplateDirectory(tempDir)
      
      expect(results).toHaveLength(2)
      
      const names = results.map(r => r.config.name).sort()
      expect(names).toEqual(['template1', 'template2'])
      
      expect(results.every(r => r.isValid)).toBe(true)
    })

    it('should return empty array for non-existent directory', async () => {
      const results = await TemplateParser.parseTemplateDirectory('/non/existent/directory')
      expect(results).toHaveLength(0)
    })
  })

  describe('validateVariableValue', () => {
    it('should validate string values', () => {
      const variable = {
        type: 'string' as const,
        required: true,
        pattern: '^[a-zA-Z]+$'
      }
      
      expect(TemplateParser.validateVariableValue('test', 'validName', variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 'invalid123', variable).isValid).toBe(false)
      expect(TemplateParser.validateVariableValue('test', undefined, variable).isValid).toBe(false)
    })

    it('should validate enum values', () => {
      const variable = {
        type: 'enum' as const,
        values: ['a', 'b', 'c'],
        required: true
      }
      
      expect(TemplateParser.validateVariableValue('test', 'a', variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 'b', variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 'd', variable).isValid).toBe(false)
    })

    it('should validate boolean values', () => {
      const variable = {
        type: 'boolean' as const,
        required: true
      }
      
      expect(TemplateParser.validateVariableValue('test', true, variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', false, variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 'true', variable).isValid).toBe(false)
    })

    it('should validate number values with min/max', () => {
      const variable = {
        type: 'number' as const,
        min: 1,
        max: 10,
        required: true
      }
      
      expect(TemplateParser.validateVariableValue('test', 5, variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 1, variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 10, variable).isValid).toBe(true)
      expect(TemplateParser.validateVariableValue('test', 0, variable).isValid).toBe(false)
      expect(TemplateParser.validateVariableValue('test', 11, variable).isValid).toBe(false)
    })

    it('should handle optional values with defaults', () => {
      const variable = {
        type: 'string' as const,
        required: false,
        default: 'default-value'
      }
      
      expect(TemplateParser.validateVariableValue('test', undefined, variable).isValid).toBe(true)
      expect(TemplateParser.getResolvedValue(undefined, variable)).toBe('default-value')
      expect(TemplateParser.getResolvedValue('custom', variable)).toBe('custom')
    })
  })

  describe('edge cases', () => {
    it('should handle malformed YAML', async () => {
      const templateContent = `
name: test
invalid: yaml: content:
  - this is
  - malformed
variables:
  name:
    type: string
`
      
      const templatePath = path.join(tempDir, 'template.yml')
      fs.writeFileSync(templatePath, templateContent)
      
      const result = await TemplateParser.parseTemplateFile(templatePath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Failed to parse'))).toBe(true)
    })

    it('should handle empty file', async () => {
      const templatePath = path.join(tempDir, 'template.yml')
      fs.writeFileSync(templatePath, '')
      
      const result = await TemplateParser.parseTemplateFile(templatePath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid YAML format'))).toBe(true)
    })
  })
})