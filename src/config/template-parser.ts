/**
 * Template.yml Parser
 * 
 * Parses and validates template.yml files to extract action definitions
 * and variable configurations for code generation
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { ErrorHandler, ErrorCode, withErrorHandling, validateParameter } from '../errors/hypergen-errors.js'

export interface TemplateVariable {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'file' | 'directory'
  required?: boolean
  default?: any
  description?: string
  pattern?: string
  values?: string[]
  min?: number
  max?: number
  validation?: {
    message?: string
  }
}

export interface TemplateExample {
  title: string
  description?: string
  variables: Record<string, any>
}

export interface TemplateConfig {
  name: string
  description?: string
  version?: string
  author?: string
  category?: string
  tags?: string[]
  variables: Record<string, TemplateVariable>
  examples?: TemplateExample[]
  dependencies?: string[]
  outputs?: string[]
}

export interface ParsedTemplate {
  config: TemplateConfig
  filePath: string
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class TemplateParser {
  private static readonly SUPPORTED_VERSIONS = ['1.0.0']
  private static readonly VALID_VARIABLE_TYPES = ['string', 'number', 'boolean', 'enum', 'array', 'object']

  /**
   * Parse a template.yml file and return validated configuration
   */
  static async parseTemplateFile(filePath: string): Promise<ParsedTemplate> {
    const result: ParsedTemplate = {
      config: {} as TemplateConfig,
      filePath,
      isValid: false,
      errors: [],
      warnings: []
    }

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.errors.push(`Template file not found: ${filePath}`)
        return result
      }

      // Read and parse YAML
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = yaml.load(content) as any

      if (!parsed || typeof parsed !== 'object') {
        result.errors.push('Invalid YAML format or empty file')
        return result
      }

      // Validate and build config
      result.config = this.validateAndBuildConfig(parsed, result.errors, result.warnings)
      result.isValid = result.errors.length === 0

      return result

    } catch (error: any) {
      result.errors.push(`Failed to parse template file: ${error.message}`)
      return result
    }
  }

  /**
   * Parse all template.yml files in a directory
   */
  static async parseTemplateDirectory(dirPath: string): Promise<ParsedTemplate[]> {
    const results: ParsedTemplate[] = []

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const templatePath = path.join(dirPath, entry.name, 'template.yml')
          if (fs.existsSync(templatePath)) {
            const parsed = await this.parseTemplateFile(templatePath)
            results.push(parsed)
          }
        }
      }

    } catch (error: any) {
      // Return empty array if directory doesn't exist or can't be read
      console.warn(`Warning: Could not read template directory: ${dirPath}`)
    }

    return results
  }

  /**
   * Validate template configuration and build normalized config object
   */
  private static validateAndBuildConfig(
    parsed: any,
    errors: string[],
    warnings: string[]
  ): TemplateConfig {
    const config: TemplateConfig = {
      name: '',
      variables: {}
    }

    // Validate required fields
    if (!parsed.name || typeof parsed.name !== 'string') {
      errors.push('Template name is required and must be a string')
    } else {
      config.name = parsed.name
    }

    if (!parsed.variables || typeof parsed.variables !== 'object') {
      errors.push('Template variables section is required and must be an object')
    } else {
      this.validateVariables(parsed.variables, config, errors, warnings)
    }

    // Validate optional fields
    if (parsed.description && typeof parsed.description === 'string') {
      config.description = parsed.description
    }

    if (parsed.version) {
      if (typeof parsed.version !== 'string') {
        warnings.push('Template version should be a string')
      } else {
        config.version = parsed.version
        if (!this.SUPPORTED_VERSIONS.includes(parsed.version)) {
          warnings.push(`Unsupported template version: ${parsed.version}`)
        }
      }
    }

    if (parsed.author && typeof parsed.author === 'string') {
      config.author = parsed.author
    }

    if (parsed.category && typeof parsed.category === 'string') {
      config.category = parsed.category
    }

    if (parsed.tags) {
      if (Array.isArray(parsed.tags)) {
        config.tags = parsed.tags.filter(tag => typeof tag === 'string')
        if (config.tags.length !== parsed.tags.length) {
          warnings.push('Some tags were ignored (must be strings)')
        }
      } else {
        warnings.push('Tags should be an array of strings')
      }
    }

    if (parsed.examples) {
      if (Array.isArray(parsed.examples)) {
        config.examples = this.validateExamples(parsed.examples, config.variables, warnings)
      } else {
        warnings.push('Examples should be an array')
      }
    }

    if (parsed.dependencies) {
      if (Array.isArray(parsed.dependencies)) {
        config.dependencies = parsed.dependencies.filter(dep => typeof dep === 'string')
      } else {
        warnings.push('Dependencies should be an array of strings')
      }
    }

    if (parsed.outputs) {
      if (Array.isArray(parsed.outputs)) {
        config.outputs = parsed.outputs.filter(output => typeof output === 'string')
      } else {
        warnings.push('Outputs should be an array of strings')
      }
    }

    return config
  }

  /**
   * Validate variables section of template configuration
   */
  private static validateVariables(
    variables: any,
    config: TemplateConfig,
    errors: string[],
    warnings: string[]
  ): void {
    for (const [varName, varConfig] of Object.entries(variables)) {
      if (!varConfig || typeof varConfig !== 'object') {
        errors.push(`Variable '${varName}' must be an object`)
        continue
      }

      const variable = this.validateVariable(varName, varConfig as any, errors, warnings)
      if (variable) {
        config.variables[varName] = variable
      }
    }
  }

  /**
   * Validate individual variable configuration
   */
  private static validateVariable(
    varName: string,
    varConfig: any,
    errors: string[],
    warnings: string[]
  ): TemplateVariable | null {
    const variable: TemplateVariable = {
      type: 'string'
    }

    // Validate type
    if (!varConfig.type) {
      errors.push(`Variable '${varName}' must have a type`)
      return null
    }

    if (!this.VALID_VARIABLE_TYPES.includes(varConfig.type)) {
      errors.push(`Variable '${varName}' has invalid type: ${varConfig.type}`)
      return null
    }

    variable.type = varConfig.type

    // Validate required field
    if (varConfig.required !== undefined) {
      if (typeof varConfig.required !== 'boolean') {
        warnings.push(`Variable '${varName}' required field should be boolean`)
      } else {
        variable.required = varConfig.required
      }
    }

    // Validate default value
    if (varConfig.default !== undefined) {
      if (variable.required) {
        warnings.push(`Variable '${varName}' cannot have default value when required`)
      } else {
        variable.default = varConfig.default
      }
    }

    // Validate description
    if (varConfig.description) {
      if (typeof varConfig.description !== 'string') {
        warnings.push(`Variable '${varName}' description should be a string`)
      } else {
        variable.description = varConfig.description
      }
    }

    // Validate pattern (for string types)
    if (varConfig.pattern) {
      if (variable.type !== 'string') {
        warnings.push(`Variable '${varName}' pattern only applies to string types`)
      } else if (typeof varConfig.pattern !== 'string') {
        warnings.push(`Variable '${varName}' pattern should be a string`)
      } else {
        try {
          new RegExp(varConfig.pattern)
          variable.pattern = varConfig.pattern
        } catch (error) {
          errors.push(`Variable '${varName}' has invalid regex pattern: ${varConfig.pattern}`)
        }
      }
    }

    // Validate enum values
    if (varConfig.values) {
      if (variable.type !== 'enum') {
        warnings.push(`Variable '${varName}' values only apply to enum types`)
      } else if (!Array.isArray(varConfig.values)) {
        errors.push(`Variable '${varName}' values must be an array`)
      } else {
        variable.values = varConfig.values.filter(val => typeof val === 'string')
        if (variable.values.length === 0) {
          errors.push(`Variable '${varName}' enum must have at least one value`)
        }
      }
    }

    // Validate min/max (for number types)
    if (varConfig.min !== undefined) {
      if (variable.type !== 'number') {
        warnings.push(`Variable '${varName}' min only applies to number types`)
      } else if (typeof varConfig.min !== 'number') {
        warnings.push(`Variable '${varName}' min should be a number`)
      } else {
        variable.min = varConfig.min
      }
    }

    if (varConfig.max !== undefined) {
      if (variable.type !== 'number') {
        warnings.push(`Variable '${varName}' max only applies to number types`)
      } else if (typeof varConfig.max !== 'number') {
        warnings.push(`Variable '${varName}' max should be a number`)
      } else {
        variable.max = varConfig.max
      }
    }

    return variable
  }

  /**
   * Validate examples section
   */
  private static validateExamples(
    examples: any[],
    variables: Record<string, TemplateVariable>,
    warnings: string[]
  ): TemplateExample[] {
    const validExamples: TemplateExample[] = []

    for (const [index, example] of examples.entries()) {
      if (!example || typeof example !== 'object') {
        warnings.push(`Example ${index + 1} must be an object`)
        continue
      }

      if (!example.title || typeof example.title !== 'string') {
        warnings.push(`Example ${index + 1} must have a title`)
        continue
      }

      if (!example.variables || typeof example.variables !== 'object') {
        warnings.push(`Example ${index + 1} must have variables`)
        continue
      }

      const validExample: TemplateExample = {
        title: example.title,
        variables: example.variables
      }

      if (example.description && typeof example.description === 'string') {
        validExample.description = example.description
      }

      // Validate example variables against template variables
      for (const [varName, varValue] of Object.entries(example.variables)) {
        if (!variables[varName]) {
          warnings.push(`Example ${index + 1} references undefined variable: ${varName}`)
        }
      }

      validExamples.push(validExample)
    }

    return validExamples
  }

  /**
   * Validate variable value against template variable definition
   */
  static validateVariableValue(
    varName: string,
    value: any,
    variable: TemplateVariable
  ): { isValid: boolean; error?: string } {
    // Check required
    if (variable.required && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: `Variable '${varName}' is required` }
    }

    // If value is undefined and not required, use default
    if (value === undefined && variable.default !== undefined) {
      return { isValid: true }
    }

    // If value is undefined and no default, skip validation
    if (value === undefined) {
      return { isValid: true }
    }

    // Type validation
    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { isValid: false, error: `Variable '${varName}' must be a string` }
        }
        if (variable.pattern) {
          const regex = new RegExp(variable.pattern)
          if (!regex.test(value)) {
            return { isValid: false, error: `Variable '${varName}' does not match pattern: ${variable.pattern}` }
          }
        }
        break

      case 'number':
        if (typeof value !== 'number') {
          return { isValid: false, error: `Variable '${varName}' must be a number` }
        }
        if (variable.min !== undefined && value < variable.min) {
          return { isValid: false, error: `Variable '${varName}' must be >= ${variable.min}` }
        }
        if (variable.max !== undefined && value > variable.max) {
          return { isValid: false, error: `Variable '${varName}' must be <= ${variable.max}` }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { isValid: false, error: `Variable '${varName}' must be a boolean` }
        }
        break

      case 'enum':
        if (!variable.values || !variable.values.includes(value)) {
          return { isValid: false, error: `Variable '${varName}' must be one of: ${variable.values?.join(', ')}` }
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          return { isValid: false, error: `Variable '${varName}' must be an array` }
        }
        break

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { isValid: false, error: `Variable '${varName}' must be an object` }
        }
        break
    }

    return { isValid: true }
  }

  /**
   * Get resolved variable value (with default if not provided)
   */
  static getResolvedValue(value: any, variable: TemplateVariable): any {
    if (value !== undefined) {
      return value
    }
    return variable.default
  }
}