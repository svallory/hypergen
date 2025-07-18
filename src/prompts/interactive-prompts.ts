/**
 * Interactive Prompts System
 * 
 * Uses @clack/prompts for beautiful interactive prompts when parameters are missing
 */

import * as p from '@clack/prompts'
import type { Option } from '@clack/prompts'
import { setTimeout } from 'timers/promises'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'
import type { TemplateVariable } from '../config/template-parser.js'

export interface PromptOptions {
  /**
   * Whether to use interactive prompts
   */
  interactive?: boolean
  
  /**
   * Whether to skip optional parameters
   */
  skipOptional?: boolean
  
  /**
   * Timeout for prompts in milliseconds
   */
  timeout?: number
  
  /**
   * Custom intro message
   */
  intro?: string
  
  /**
   * Custom outro message
   */
  outro?: string
}

export interface PromptResult {
  /**
   * Whether the user completed the prompts
   */
  completed: boolean
  
  /**
   * Whether the user cancelled
   */
  cancelled: boolean
  
  /**
   * Resolved parameter values
   */
  values: Record<string, any>
  
  /**
   * Any errors that occurred
   */
  errors: string[]
}

export class InteractivePrompter {
  private defaultOptions: PromptOptions = {
    interactive: true,
    skipOptional: false,
    timeout: 300000, // 5 minutes
    intro: '🎯 Let\'s configure your generator parameters',
    outro: '✅ Configuration complete!'
  }

  /**
   * Prompt for missing parameters
   */
  async promptForParameters(
    variables: Record<string, TemplateVariable>,
    providedValues: Record<string, any> = {},
    options: PromptOptions = {}
  ): Promise<PromptResult> {
    const opts = { ...this.defaultOptions, ...options }
    
    if (!opts.interactive) {
      return {
        completed: false,
        cancelled: false,
        values: providedValues,
        errors: ['Interactive prompts disabled']
      }
    }

    const result: PromptResult = {
      completed: false,
      cancelled: false,
      values: { ...providedValues },
      errors: []
    }

    try {
      // Start the prompt session
      p.intro(opts.intro || this.defaultOptions.intro!)

      // Get missing parameters
      const missingParams = this.getMissingParameters(variables, providedValues, opts.skipOptional)
      
      if (missingParams.length === 0) {
        p.outro('All parameters already provided!')
        result.completed = true
        return result
      }

      // Create timeout promise
      const timeoutPromise = opts.timeout ? 
        setTimeout(opts.timeout).then(() => { throw new Error('Prompt timeout') }) : 
        new Promise(() => {}) // Never resolves

      // Create prompts
      const promptsPromise = this.createPrompts(missingParams, variables)

      // Race between prompts and timeout
      const promptResults = await Promise.race([promptsPromise, timeoutPromise]) as Record<string, any>

      // Handle cancellation
      if (p.isCancel(promptResults)) {
        p.cancel('Operation cancelled')
        result.cancelled = true
        return result
      }

      // Merge results
      result.values = { ...result.values, ...promptResults }
      result.completed = true

      // Validate all parameters
      const validation = this.validateParameters(variables, result.values)
      if (!validation.valid) {
        result.errors = validation.errors
        p.outro(`❌ Validation failed: ${validation.errors.join(', ')}`)
        return result
      }

      p.outro(opts.outro || this.defaultOptions.outro!)
      return result

    } catch (error: any) {
      if (error.message === 'Prompt timeout') {
        p.cancel('⏰ Prompt timeout - operation cancelled')
        result.cancelled = true
        result.errors.push('Prompt timeout')
      } else {
        p.cancel(`❌ Error: ${error.message}`)
        result.errors.push(error.message)
      }
      return result
    }
  }

  /**
   * Get parameters that need to be prompted for
   */
  private getMissingParameters(
    variables: Record<string, TemplateVariable>,
    providedValues: Record<string, any>,
    skipOptional: boolean = false
  ): string[] {
    const missing: string[] = []

    for (const [name, variable] of Object.entries(variables)) {
      const hasValue = providedValues[name] !== undefined && providedValues[name] !== null && providedValues[name] !== ''
      
      if (!hasValue) {
        if (variable.required || (!skipOptional && variable.default === undefined)) {
          missing.push(name)
        }
      }
    }

    return missing
  }

  /**
   * Create prompts for missing parameters
   */
  private async createPrompts(
    parameterNames: string[],
    variables: Record<string, TemplateVariable>
  ): Promise<Record<string, any>> {
    const prompts: Record<string, any> = {}

    for (const name of parameterNames) {
      const variable = variables[name]
      if (!variable) continue

      const prompt = await this.createPromptForVariable(name, variable)
      prompts[name] = prompt
    }

    return p.group(prompts, {
      onCancel: () => {
        p.cancel('Operation cancelled')
        process.exit(0)
      }
    })
  }

  /**
   * Create a prompt for a specific variable
   */
  private async createPromptForVariable(
    name: string,
    variable: TemplateVariable
  ): Promise<any> {
    const message = variable.description || `Enter ${name}`
    const hint = this.getVariableHint(variable)

    switch (variable.type) {
      case 'string':
        return p.text({
          message,
          placeholder: variable.default?.toString() || `Enter ${name}`,
          defaultValue: variable.default?.toString(),
          validate: (value) => this.validateStringInput(value, variable)
        })

      case 'number':
        return p.text({
          message,
          placeholder: variable.default?.toString() || 'Enter number',
          defaultValue: variable.default?.toString(),
          validate: (value) => this.validateNumberInput(value, variable)
        })

      case 'boolean':
        return p.confirm({
          message,
          initialValue: variable.default ?? false
        })

      case 'enum':
        if (!variable.values || variable.values.length === 0) {
          throw new Error(`Enum variable '${name}' has no values defined`)
        }
        
        // Check if this should be a multi-select based on default value or naming
        const isMultiSelect = Array.isArray(variable.default) || 
                             name.toLowerCase().includes('methods') ||
                             name.toLowerCase().includes('tags') ||
                             name.toLowerCase().includes('features') ||
                             name.toLowerCase().includes('options')

        if (isMultiSelect) {
          const options = variable.values.map(value => ({
            value,
            label: value,
            hint: this.getEnumValueHint(value)
          }))

          return p.multiselect({
            message,
            options,
            initialValues: Array.isArray(variable.default) ? variable.default : [],
            required: variable.required
          })
        } else {
          const options = variable.values.map(value => ({
            value,
            label: value,
            hint: this.getEnumValueHint(value)
          }))

          return p.select({
            message,
            options,
            initialValue: variable.default
          })
        }

      case 'array':
        return p.text({
          message: `${message} (comma-separated)`,
          placeholder: Array.isArray(variable.default) ? variable.default.join(', ') : 'item1, item2, item3',
          defaultValue: Array.isArray(variable.default) ? variable.default.join(', ') : '',
          validate: (value) => this.validateArrayInput(value, variable)
        })

      default:
        return p.text({
          message,
          placeholder: variable.default?.toString() || `Enter ${name}`,
          defaultValue: variable.default?.toString()
        })
    }
  }

  /**
   * Get hint text for a variable
   */
  private getVariableHint(variable: TemplateVariable): string | undefined {
    const hints: string[] = []

    if (variable.pattern) {
      hints.push(`Pattern: ${variable.pattern}`)
    }

    if (variable.min !== undefined) {
      hints.push(`Min: ${variable.min}`)
    }

    if (variable.max !== undefined) {
      hints.push(`Max: ${variable.max}`)
    }

    if (variable.default !== undefined) {
      hints.push(`Default: ${variable.default}`)
    }

    return hints.length > 0 ? hints.join(', ') : undefined
  }

  /**
   * Get hint text for enum values
   */
  private getEnumValueHint(value: string): string | undefined {
    // Common enum value hints
    const hints: Record<string, string> = {
      'GET': 'Retrieve data',
      'POST': 'Create new resource',
      'PUT': 'Update entire resource',
      'PATCH': 'Update partial resource',
      'DELETE': 'Remove resource',
      'react': 'React framework',
      'vue': 'Vue.js framework',
      'angular': 'Angular framework',
      'svelte': 'Svelte framework',
      'typescript': 'TypeScript language',
      'javascript': 'JavaScript language',
      'small': 'Small size variant',
      'medium': 'Medium size variant',
      'large': 'Large size variant',
      'true': 'Enable feature',
      'false': 'Disable feature'
    }

    return hints[value.toLowerCase()]
  }

  /**
   * Validate string input
   */
  private validateStringInput(value: string, variable: TemplateVariable): string | undefined {
    if (variable.required && (!value || value.trim() === '')) {
      return 'This field is required'
    }

    if (value && variable.pattern) {
      const regex = new RegExp(variable.pattern)
      if (!regex.test(value)) {
        return `Must match pattern: ${variable.pattern}`
      }
    }

    if (value && variable.min !== undefined && value.length < variable.min) {
      return `Must be at least ${variable.min} characters`
    }

    if (value && variable.max !== undefined && value.length > variable.max) {
      return `Must be no more than ${variable.max} characters`
    }

    return undefined
  }

  /**
   * Validate number input
   */
  private validateNumberInput(value: string, variable: TemplateVariable): string | undefined {
    if (variable.required && (!value || value.trim() === '')) {
      return 'This field is required'
    }

    if (value) {
      const num = Number(value)
      if (isNaN(num)) {
        return 'Must be a valid number'
      }

      if (variable.min !== undefined && num < variable.min) {
        return `Must be at least ${variable.min}`
      }

      if (variable.max !== undefined && num > variable.max) {
        return `Must be no more than ${variable.max}`
      }
    }

    return undefined
  }

  /**
   * Validate array input
   */
  private validateArrayInput(value: string, variable: TemplateVariable): string | undefined {
    if (variable.required && (!value || value.trim() === '')) {
      return 'This field is required'
    }

    if (value) {
      const items = value.split(',').map(item => item.trim()).filter(item => item)
      
      if (variable.min !== undefined && items.length < variable.min) {
        return `Must have at least ${variable.min} items`
      }

      if (variable.max !== undefined && items.length > variable.max) {
        return `Must have no more than ${variable.max} items`
      }
    }

    return undefined
  }

  /**
   * Validate all parameters
   */
  private validateParameters(
    variables: Record<string, TemplateVariable>,
    values: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const [name, variable] of Object.entries(variables)) {
      const value = values[name]
      
      // Check required
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`${name} is required`)
        continue
      }

      // Skip validation for undefined optional values
      if (value === undefined || value === null || value === '') {
        continue
      }

      // Type-specific validation
      switch (variable.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${name} must be a string`)
          } else if (variable.pattern) {
            const regex = new RegExp(variable.pattern)
            if (!regex.test(value)) {
              errors.push(`${name} must match pattern: ${variable.pattern}`)
            }
          }
          break

        case 'number':
          const num = typeof value === 'string' ? Number(value) : value
          if (isNaN(num)) {
            errors.push(`${name} must be a number`)
          } else {
            if (variable.min !== undefined && num < variable.min) {
              errors.push(`${name} must be at least ${variable.min}`)
            }
            if (variable.max !== undefined && num > variable.max) {
              errors.push(`${name} must be no more than ${variable.max}`)
            }
          }
          break

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${name} must be a boolean`)
          }
          break

        case 'enum':
          if (variable.values) {
            if (Array.isArray(value)) {
              // Multi-select enum
              const invalidValues = value.filter(v => !variable.values!.includes(v))
              if (invalidValues.length > 0) {
                errors.push(`${name} contains invalid values: ${invalidValues.join(', ')}`)
              }
            } else {
              // Single-select enum
              if (!variable.values.includes(value)) {
                errors.push(`${name} must be one of: ${variable.values.join(', ')}`)
              }
            }
          }
          break

        case 'array':
          if (!Array.isArray(value)) {
            // Try to parse comma-separated string
            if (typeof value === 'string') {
              const items = value.split(',').map(item => item.trim()).filter(item => item)
              values[name] = items // Update the value
            } else {
              errors.push(`${name} must be an array`)
            }
          }
          break
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a spinner for long-running operations
   */
  static createSpinner(message: string = 'Working...') {
    return p.spinner()
  }

  /**
   * Show a note to the user
   */
  static note(message: string, title?: string) {
    p.note(message, title)
  }

  /**
   * Show a log message
   */
  static log(message: string) {
    p.log.message(message)
  }

  /**
   * Show an error message
   */
  static error(message: string) {
    p.log.error(message)
  }

  /**
   * Show a warning message
   */
  static warn(message: string) {
    p.log.warn(message)
  }

  /**
   * Show a success message
   */
  static success(message: string) {
    p.log.success(message)
  }

  /**
   * Show an info message
   */
  static info(message: string) {
    p.log.info(message)
  }

  /**
   * Create a simple confirmation prompt
   */
  static async confirm(message: string, initialValue: boolean = false): Promise<boolean> {
    const result = await p.confirm({
      message,
      initialValue
    })

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled')
      process.exit(0)
    }

    return result
  }

  /**
   * Create a simple text input prompt
   */
  static async text(
    message: string, 
    placeholder?: string, 
    defaultValue?: string,
    validate?: (value: string) => string | undefined
  ): Promise<string> {
    const result = await p.text({
      message,
      placeholder,
      defaultValue,
      validate
    })

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled')
      process.exit(0)
    }

    return result
  }

  /**
   * Create a simple select prompt
   */
  static async select<T extends string>(
    message: string, 
    options: Array<Option<T>>,
    initialValue?: T
  ): Promise<T> {
    const result = await p.select({
      message,
      options,
      initialValue
    })

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled')
      process.exit(0)
    }

    return result
  }

  /**
   * Create a multi-select prompt
   */
  static async multiselect<T extends string>(
    message: string, 
    options: Array<Option<T>>,
    initialValues: T[] = [],
    required: boolean = false
  ): Promise<T[]> {
    const result = await p.multiselect({
      message,
      options,
      initialValues,
      required
    })

    if (p.isCancel(result)) {
      p.cancel('Operation cancelled')
      process.exit(0)
    }

    return result
  }
}