import { describe, it, expect, beforeEach } from 'bun:test'
import { TemplateParser, type TemplateConfig, type TemplateDependency } from '../src/config/template-parser'
import { TemplateDependencyManager } from '../src/config/dependency-manager'

describe('Template Versioning and Dependencies', () => {
  let dependencyManager: TemplateDependencyManager

  beforeEach(() => {
    dependencyManager = new TemplateDependencyManager()
  })

  describe('Dependency Parsing', () => {
    it('should parse string dependencies as npm packages', async () => {
      const templateYaml = `
name: test-template
variables:
  name:
    type: string
    required: true
dependencies:
  - react
  - lodash
  - "@types/react"
`
      const parsed = await TemplateParser.parseTemplateFile('')
      // Simulate parsing the YAML
      const yamlData = {
        name: 'test-template',
        variables: {
          name: { type: 'string', required: true }
        },
        dependencies: ['react', 'lodash', '@types/react']
      }

      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], [])
      
      expect(config.dependencies).toHaveLength(3)
      expect(config.dependencies[0]).toEqual({
        name: 'react',
        type: 'npm'
      })
      expect(config.dependencies[1]).toEqual({
        name: 'lodash',
        type: 'npm'
      })
    })

    it('should parse object dependencies with full configuration', async () => {
      const yamlData = {
        name: 'advanced-template',
        variables: {
          name: { type: 'string', required: true }
        },
        dependencies: [
          {
            name: 'react',
            version: '^18.0.0',
            type: 'npm'
          },
          {
            name: 'my-custom-template',
            type: 'github',
            url: 'github:owner/repo',
            version: 'v1.0.0',
            optional: true
          },
          {
            name: 'dev-tools',
            type: 'npm',
            dev: true,
            optional: true
          }
        ]
      }

      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], [])
      
      expect(config.dependencies).toHaveLength(3)
      
      const reactDep = config.dependencies[0] as TemplateDependency
      expect(reactDep.name).toBe('react')
      expect(reactDep.version).toBe('^18.0.0')
      expect(reactDep.type).toBe('npm')
      
      const customDep = config.dependencies[1] as TemplateDependency
      expect(customDep.name).toBe('my-custom-template')
      expect(customDep.type).toBe('github')
      expect(customDep.optional).toBe(true)
      
      const devDep = config.dependencies[2] as TemplateDependency
      expect(devDep.dev).toBe(true)
      expect(devDep.optional).toBe(true)
    })
  })

  describe('Engine Compatibility', () => {
    it('should parse engine requirements', async () => {
      const yamlData = {
        name: 'engine-test',
        variables: {},
        engines: {
          hypergen: '>=8.0.0',
          node: '>=16.0.0'
        }
      }

      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], [])
      
      expect(config.engines).toBeDefined()
      expect(config.engines!.hypergen).toBe('>=8.0.0')
      expect(config.engines!.node).toBe('>=16.0.0')
    })

    it('should validate version compatibility', () => {
      // Test basic compatibility check
      expect(TemplateParser.isVersionCompatible()).toBe(true)
      expect(TemplateParser.isVersionCompatible({ hypergen: '>=8.0.0' })).toBe(true)
      expect(TemplateParser.isVersionCompatible({ node: '>=16.0.0' })).toBe(true)
    })

    it('should compare semantic versions correctly', () => {
      expect(TemplateParser.compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(TemplateParser.compareVersions('1.0.1', '1.0.0')).toBe(1)
      expect(TemplateParser.compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(TemplateParser.compareVersions('2.0.0', '1.9.9')).toBe(1)
      expect(TemplateParser.compareVersions('1.0', '1.0.0')).toBe(0)
    })
  })

  describe('Lifecycle Hooks', () => {
    it('should parse lifecycle hooks', async () => {
      const yamlData = {
        name: 'hooks-test',
        variables: {},
        hooks: {
          pre: ['validate-environment', 'check-dependencies'],
          post: ['format-code', 'run-tests'],
          error: ['cleanup-temp-files']
        }
      }

      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], [])
      
      expect(config.hooks).toBeDefined()
      expect(config.hooks!.pre).toEqual(['validate-environment', 'check-dependencies'])
      expect(config.hooks!.post).toEqual(['format-code', 'run-tests'])
      expect(config.hooks!.error).toEqual(['cleanup-temp-files'])
    })

    it('should filter invalid hooks', async () => {
      const yamlData = {
        name: 'invalid-hooks-test',
        variables: {},
        hooks: {
          pre: ['valid-hook', 123, null, 'another-valid-hook'],
          post: 'invalid-format',
          error: []
        }
      }

      const warnings: string[] = []
      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], warnings)
      
      expect(config.hooks!.pre).toEqual(['valid-hook', 'another-valid-hook'])
      expect(config.hooks!.post).toBeUndefined()
      expect(config.hooks!.error).toEqual([])
      expect(warnings).toContain('Some pre hooks were ignored (must be strings)')
      expect(warnings).toContain('Post hooks should be an array of strings')
    })
  })

  describe('Dependency Resolution', () => {
    it('should handle empty dependencies', async () => {
      const template: TemplateConfig = {
        name: 'no-deps',
        variables: {}
      }

      const result = await dependencyManager.resolveDependencies(template)
      
      expect(result.dependencies).toHaveLength(0)
      expect(result.conflicts).toHaveLength(0)
      expect(result.missing).toHaveLength(0)
    })

    it('should handle missing required dependencies', async () => {
      const template: TemplateConfig = {
        name: 'missing-deps',
        variables: {},
        dependencies: [
          {
            name: 'non-existent-package',
            type: 'npm',
            optional: false
          }
        ]
      }

      const result = await dependencyManager.resolveDependencies(template)
      
      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0].resolved).toBe(false)
      expect(result.dependencies[0].error).toBeDefined()
      expect(result.missing).toHaveLength(1)
      expect(result.missing[0].name).toBe('non-existent-package')
    })

    it('should skip optional dependencies that fail to resolve', async () => {
      const template: TemplateConfig = {
        name: 'optional-deps',
        variables: {},
        dependencies: [
          {
            name: 'non-existent-optional',
            type: 'npm',
            optional: true
          }
        ]
      }

      const result = await dependencyManager.resolveDependencies(template)
      
      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0].resolved).toBe(false)
      expect(result.dependencies[0].optional).toBe(true)
      expect(result.missing).toHaveLength(0) // Optional deps don't go to missing
    })

    it('should skip dev dependencies when requested', async () => {
      const template: TemplateConfig = {
        name: 'dev-deps',
        variables: {},
        dependencies: [
          {
            name: 'production-dep',
            type: 'npm',
            dev: false
          },
          {
            name: 'dev-dep',
            type: 'npm',
            dev: true
          }
        ]
      }

      const result = await dependencyManager.resolveDependencies(template, {
        skipDev: true
      })
      
      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0].name).toBe('production-dep')
    })

    it('should detect version conflicts', async () => {
      const template: TemplateConfig = {
        name: 'conflict-test',
        variables: {},
        dependencies: [
          {
            name: 'conflicted-package',
            version: '1.0.0',
            type: 'npm'
          },
          {
            name: 'conflicted-package',
            version: '2.0.0',
            type: 'npm'
          }
        ]
      }

      const result = await dependencyManager.resolveDependencies(template)
      
      // Both dependencies will fail to resolve, but conflicts should still be detected
      expect(result.dependencies).toHaveLength(2)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].name).toBe('conflicted-package')
      expect(result.conflicts[0].versions).toEqual(['1.0.0', '2.0.0'])
    })
  })

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = dependencyManager.getCacheStats()
      
      expect(stats.size).toBe(0)
      expect(stats.entries).toEqual([])
    })

    it('should clear cache when requested', () => {
      dependencyManager.clearCache()
      
      const stats = dependencyManager.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('Mixed Dependency Types', () => {
    it('should handle mixed string and object dependencies', async () => {
      const yamlData = {
        name: 'mixed-deps',
        variables: {},
        dependencies: [
          'react', // string
          {
            name: 'custom-template',
            type: 'github',
            url: 'github:owner/repo'
          }, // object
          'lodash' // string
        ]
      }

      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], [])
      
      expect(config.dependencies).toHaveLength(3)
      
      const deps = config.dependencies as TemplateDependency[]
      expect(deps[0].name).toBe('react')
      expect(deps[0].type).toBe('npm')
      
      expect(deps[1].name).toBe('custom-template')
      expect(deps[1].type).toBe('github')
      
      expect(deps[2].name).toBe('lodash')
      expect(deps[2].type).toBe('npm')
    })
  })

  describe('Validation Errors', () => {
    it('should handle invalid dependency objects', async () => {
      const yamlData = {
        name: 'invalid-deps',
        variables: {},
        dependencies: [
          { type: 'npm' }, // missing name
          { name: 123 }, // invalid name type
          'valid-dep'
        ]
      }

      const warnings: string[] = []
      const config = TemplateParser['validateAndBuildConfig'](yamlData, [], warnings)
      
      expect(config.dependencies).toHaveLength(1) // Only valid dep should remain
      expect(warnings).toContain('Dependency 1 must have a name')
      expect(warnings).toContain('Dependency 2 must have a name')
    })
  })
})