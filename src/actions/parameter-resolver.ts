/**
 * Action Parameter Resolver
 * 
 * Handles parameter validation and resolution for action execution
 */

import createDebug from 'debug'
import type { 
  ActionMetadata, 
  ActionParameter, 
  ParameterType
} from './types.js'
import { ActionParameterError } from './types.js'
import { InteractivePrompter, type PromptOptions } from '../prompts/interactive-prompts.js'
import { TemplateParser, type TemplateVariable } from '../config/template-parser.js'

const debug = createDebug('hypergen:v8:action:parameters')

export class ActionParameterResolver {
  
  /**
   * Resolve and validate action parameters (legacy method)
   * @deprecated Use resolveParametersInteractively instead
   */
  async resolveParameters(
    metadata: ActionMetadata,
    provided: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    debug('Resolving parameters for action (legacy): %s', metadata.name)
    
    const resolved: Record<string, any> = { ...provided }
    
    if (!metadata.parameters || metadata.parameters.length === 0) {
      debug('No parameters defined for action: %s', metadata.name)
      return resolved
    }

    for (const param of metadata.parameters) {
      await this.resolveParameter(param, resolved)
    }

    debug('Parameters resolved for %s: %o', metadata.name, Object.keys(resolved))
    return resolved
  }

  /**
   * Resolve a single parameter
   */
  private async resolveParameter(
    param: ActionParameter,
    resolved: Record<string, any>
  ): Promise<void> {
    // Skip if value already provided
    if (resolved[param.name] !== undefined) {
      // Validate the provided value
      this.validateParameterValue(param.name, resolved[param.name], param, resolved)
      return
    }

    // Apply default value if available
    if (param.default !== undefined) {
      resolved[param.name] = param.default
      debug('Applied default value for %s: %o', param.name, param.default)
    } else if (param.required) {
      // For now, throw error; in full CLI integration, this would prompt
      throw new ActionParameterError(
        `Required parameter '${param.name}' not provided`,
        param.name,
        undefined,
        param.type
      )
    }

    // Validate the resolved value
    if (resolved[param.name] !== undefined) {
      this.validateParameterValue(param.name, resolved[param.name], param, resolved)
    }
  }

  /**
   * Resolve parameters with proper precedence and interactive prompts
   * 
   * Resolution order:
   * 1. Command line arguments (highest priority)
   * 2. Default values (only if --defaults flag is used)
   * 3. Interactive prompts (for any missing values)
   */
  async resolveParametersInteractively(
    metadata: ActionMetadata,
    provided: Record<string, any> = {},
    options: {
      useDefaults?: boolean
      dryRun?: boolean
      force?: boolean
      skipOptional?: boolean
      timeout?: number
      intro?: string
      outro?: string
    } = {}
  ): Promise<Record<string, any>> {
    debug('Resolving parameters interactively for action: %s', metadata.name)
    
    const resolved: Record<string, any> = { ...provided }
    
    if (!metadata.parameters || metadata.parameters.length === 0) {
      debug('No parameters defined for action: %s', metadata.name)
      return resolved
    }

    // Step 1: Apply provided values and validate them
    for (const param of metadata.parameters) {
      if (resolved[param.name] !== undefined) {
        this.validateParameterValue(param.name, resolved[param.name], param, resolved)
        debug('Using provided value for %s: %o', param.name, resolved[param.name])
      }
    }

    // Step 2: Apply default values if --defaults flag is used
    if (options.useDefaults) {
      for (const param of metadata.parameters) {
        if (resolved[param.name] === undefined && param.default !== undefined) {
          resolved[param.name] = param.default
          debug('Applied default value for %s: %o', param.name, param.default)
        }
      }
    }

    // Step 3: Identify parameters that still need values
    const parametersNeedingValues = metadata.parameters.filter(param => {
      const hasValue = resolved[param.name] !== undefined
      const isRequired = param.required
      const isOptional = !param.required
      
      // We need a value if:
      // - It's required and has no value
      // - It's optional but has no value and we're not skipping optional
      return !hasValue && (isRequired || (!options.skipOptional && isOptional))
    })

    // Step 4: Prompt for missing values
    if (parametersNeedingValues.length > 0) {
      // First check if we have any required parameters that still need values
      const requiredParametersNeedingValues = parametersNeedingValues.filter(param => param.required)
      
      if (requiredParametersNeedingValues.length > 0) {
        // In test mode, throw an error instead of prompting
        if (process.env.NODE_ENV === 'test') {
          throw new ActionParameterError(
            `Required parameter '${requiredParametersNeedingValues[0].name}' not provided and no default available`,
            requiredParametersNeedingValues[0].name,
            undefined,
            requiredParametersNeedingValues[0].type
          )
        }
        
        // We need to prompt for required parameters
        const templateVariables: Record<string, TemplateVariable> = {}
        for (const param of parametersNeedingValues) {
          templateVariables[param.name] = this.convertParameterToVariable(param)
        }

        const prompter = new InteractivePrompter()
        const promptResult = await prompter.promptForParameters(
          templateVariables,
          resolved,
          {
            interactive: true,
            skipOptional: options.skipOptional || false,
            timeout: options.timeout,
            intro: options.intro || `🎯 Configure parameters for ${metadata.name}`,
            outro: options.outro || '✅ Parameters configured!'
          }
        )

        if (promptResult.cancelled) {
          throw new ActionParameterError(
            'Parameter configuration cancelled by user',
            'interactive',
            undefined,
            'string'
          )
        }

        if (promptResult.errors.length > 0) {
          throw new ActionParameterError(
            `Parameter validation failed: ${promptResult.errors.join(', ')}`,
            'validation',
            undefined,
            'string'
          )
        }

        // Merge prompted values
        Object.assign(resolved, promptResult.values)
      } else {
        // Only optional parameters need values, and we might skip them
        if (!options.skipOptional) {
          // In test mode, skip optional prompts
          if (process.env.NODE_ENV === 'test') {
            debug('Skipping optional parameter prompts in test mode')
            return resolved
          }
          
          const templateVariables: Record<string, TemplateVariable> = {}
          for (const param of parametersNeedingValues) {
            templateVariables[param.name] = this.convertParameterToVariable(param)
          }

          const prompter = new InteractivePrompter()
          const promptResult = await prompter.promptForParameters(
            templateVariables,
            resolved,
            {
              interactive: true,
              skipOptional: false,
              timeout: options.timeout,
              intro: options.intro || `🎯 Configure parameters for ${metadata.name}`,
              outro: options.outro || '✅ Parameters configured!'
            }
          )

          if (!promptResult.cancelled && promptResult.errors.length === 0) {
            Object.assign(resolved, promptResult.values)
          }
        }
      }
    }

    // Step 5: Final validation - ensure all required parameters have values
    for (const param of metadata.parameters) {
      if (resolved[param.name] !== undefined) {
        this.validateParameterValue(param.name, resolved[param.name], param, resolved)
      } else if (param.required) {
        throw new ActionParameterError(
          `Required parameter '${param.name}' not provided and no default available`,
          param.name,
          undefined,
          param.type
        )
      }
    }

    debug('Parameters resolved interactively for %s: %o', metadata.name, Object.keys(resolved))
    return resolved
  }

  /**
   * Convert ActionParameter to TemplateVariable format
   */
  private convertParameterToVariable(param: ActionParameter): TemplateVariable {
    return {
      type: param.type,
      description: param.description,
      required: param.required,
      default: param.default,
      values: param.values,
      pattern: param.pattern,
      min: param.min,
      max: param.max,
      validation: param.validation
    }
  }

  /**
   * Validate a parameter value against its definition
   */
  private validateParameterValue(
    name: string,
    value: any,
    param: ActionParameter,
    allValues: Record<string, any>
  ): void {
    const validation = this.validateParameterType(name, value, param, allValues)
    
    if (!validation.valid) {
      throw new ActionParameterError(
        `Parameter validation failed for '${name}': ${validation.message}`,
        name,
        value,
        param.type
      )
    }
  }

  /**
   * Validate parameter type and constraints
   */
  private validateParameterType(
    name: string,
    value: any,
    param: ActionParameter,
    allValues: Record<string, any>
  ): { valid: boolean; message?: string } {
    // Type validation
    switch (param.type) {
      case 'string':
        return this.validateStringParameter(value, param)
      
      case 'boolean':
        return this.validateBooleanParameter(value, param)
      
      case 'number':
        return this.validateNumberParameter(value, param)
      
      case 'enum':
        return this.validateEnumParameter(value, param)
      
      case 'array':
        return this.validateArrayParameter(value, param)
      
      case 'object':
        return this.validateObjectParameter(value, param)
      
      case 'file':
        return this.validateFileParameter(value, param)
      
      case 'directory':
        return this.validateDirectoryParameter(value, param)
      
      default:
        return { 
          valid: false, 
          message: `Unknown parameter type: ${param.type}` 
        }
    }
  }

  private validateStringParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: `Expected string, got ${typeof value}` }
    }

    // Pattern validation
    if (param.pattern) {
      const regex = new RegExp(param.pattern)
      if (!regex.test(value)) {
        return { 
          valid: false, 
          message: param.validation?.message || `Value does not match pattern: ${param.pattern}` 
        }
      }
    }

    return { valid: true }
  }

  private validateBooleanParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'boolean') {
      return { valid: false, message: `Expected boolean, got ${typeof value}` }
    }

    return { valid: true }
  }

  private validateNumberParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, message: `Expected number, got ${typeof value}` }
    }

    // Range validation
    if (param.min !== undefined && value < param.min) {
      return { valid: false, message: `Value ${value} is below minimum ${param.min}` }
    }

    if (param.max !== undefined && value > param.max) {
      return { valid: false, message: `Value ${value} is above maximum ${param.max}` }
    }

    return { valid: true }
  }

  private validateEnumParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (!param.values || !Array.isArray(param.values)) {
      return { valid: false, message: 'Enum parameter missing values array' }
    }

    if (!param.values.includes(value)) {
      return { 
        valid: false, 
        message: `Value '${value}' is not in allowed values: ${param.values.join(', ')}` 
      }
    }

    return { valid: true }
  }

  private validateArrayParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (!Array.isArray(value)) {
      return { valid: false, message: `Expected array, got ${typeof value}` }
    }

    return { valid: true }
  }

  private validateObjectParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, message: `Expected object, got ${typeof value}` }
    }

    return { valid: true }
  }

  private validateFileParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: 'File path must be a string' }
    }

    // Could add file existence validation here in the future
    // For now, just validate it's a non-empty string
    if (value.trim().length === 0) {
      return { valid: false, message: 'File path cannot be empty' }
    }

    return { valid: true }
  }

  private validateDirectoryParameter(
    value: any, 
    param: ActionParameter
  ): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: 'Directory path must be a string' }
    }

    // Could add directory existence validation here in the future
    // For now, just validate it's a non-empty string
    if (value.trim().length === 0) {
      return { valid: false, message: 'Directory path cannot be empty' }
    }

    return { valid: true }
  }
}