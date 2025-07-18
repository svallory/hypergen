/**
 * V8 Template Configuration Parser
 * 
 * Implements template.yml parsing with rich variable types and validation
 */

import yaml from 'yaml'
import fs from 'fs-extra'
import path from 'path'
import createDebug from 'debug'
import type {
  TemplateConfig,
  ParsedTemplateConfig,
  ResolvedVariables,
  VariableDefinition,
  ValidationResult,
  ValidationError,
  ParserOptions,
  ValidatorFunction,
  ValidationContext
} from './types.js'
import { TemplateConfigError } from './types.js'

const debug = createDebug('hypergen:v8:config')

export class TemplateConfigParser {
  private options: Required<ParserOptions>
  private urlManager?: any // TemplateURLManager - using any to avoid circular import

  constructor(options: ParserOptions = {}) {
    this.options = {
      allowRemoteIncludes: options.allowRemoteIncludes ?? false,
      includeCache: options.includeCache ?? new Map(),
      customValidators: options.customValidators ?? {},
      conflictResolution: options.conflictResolution ?? 'fail'
    }
  }

  async parseConfig(configPath: string): Promise<ParsedTemplateConfig> {
    debug('Parsing config: %s', configPath)
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8')
      const basePath = path.dirname(configPath)
      
      return await this.parseConfigFromString(configContent, basePath, configPath)
    } catch (error) {
      throw new TemplateConfigError(
        `Failed to read config file: ${error.message}`,
        configPath
      )
    }
  }

  async parseConfigFromString(
    yamlContent: string, 
    basePath: string = process.cwd(),
    configPath: string = 'inline'
  ): Promise<ParsedTemplateConfig> {
    debug('Parsing YAML content')
    
    try {
      const config = yaml.parse(yamlContent) as TemplateConfig
      
      // Validate schema
      const validationResult = this.validateConfig(config)
      if (!validationResult.valid) {
        throw new TemplateConfigError(
          'Config validation failed',
          configPath,
          undefined,
          validationResult.errors
        )
      }

      // Build parsed config
      const parsedConfig: ParsedTemplateConfig = {
        ...config,
        basePath,
        resolvedIncludes: [],
        allVariables: { ...config.variables }
      }

      // Process includes if present
      if (config.includes && config.includes.length > 0) {
        await this.resolveIncludes(parsedConfig, configPath)
      }

      debug('Config parsed successfully: %o', {
        title: parsedConfig.title,
        variableCount: Object.keys(parsedConfig.allVariables || {}).length,
        includeCount: parsedConfig.resolvedIncludes.length
      })

      return parsedConfig
    } catch (error) {
      if (error instanceof TemplateConfigError) {
        throw error
      }
      
      throw new TemplateConfigError(
        `YAML parsing failed: ${error.message}`,
        configPath
      )
    }
  }

  validateConfig(config: any): { valid: boolean; errors?: ValidationError[] } {
    const errors: ValidationError[] = []

    if (!config || typeof config !== 'object') {
      errors.push({
        field: 'root',
        value: config,
        message: 'Config must be an object',
        code: 'INVALID_TYPE'
      })
      return { valid: false, errors }
    }

    // Validate variables section
    if (config.variables) {
      if (typeof config.variables !== 'object') {
        errors.push({
          field: 'variables',
          value: config.variables,
          message: 'Variables must be an object',
          code: 'INVALID_TYPE'
        })
      } else {
        for (const [name, definition] of Object.entries(config.variables)) {
          const varErrors = this.validateVariableDefinition(name, definition as any)
          errors.push(...varErrors)
        }
      }
    }

    // Validate includes section
    if (config.includes) {
      if (!Array.isArray(config.includes)) {
        errors.push({
          field: 'includes',
          value: config.includes,
          message: 'Includes must be an array',
          code: 'INVALID_TYPE'
        })
      } else {
        config.includes.forEach((include: any, index: number) => {
          if (!include.url) {
            errors.push({
              field: `includes[${index}].url`,
              value: include,
              message: 'Include must have a url property',
              code: 'MISSING_REQUIRED'
            })
          }
        })
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }
  }

  private validateVariableDefinition(name: string, definition: any): ValidationError[] {
    const errors: ValidationError[] = []
    const fieldPrefix = `variables.${name}`

    if (!definition || typeof definition !== 'object') {
      errors.push({
        field: fieldPrefix,
        value: definition,
        message: 'Variable definition must be an object',
        code: 'INVALID_TYPE'
      })
      return errors
    }

    // Type is required
    if (!definition.type) {
      errors.push({
        field: `${fieldPrefix}.type`,
        value: definition.type,
        message: 'Variable type is required',
        code: 'MISSING_REQUIRED'
      })
    } else {
      const validTypes = ['string', 'boolean', 'number', 'enum', 'array', 'object']
      if (!validTypes.includes(definition.type)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          value: definition.type,
          message: `Invalid variable type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_VALUE'
        })
      }
    }

    // Validate enum values
    if (definition.type === 'enum') {
      if (!definition.values || !Array.isArray(definition.values) || definition.values.length === 0) {
        errors.push({
          field: `${fieldPrefix}.values`,
          value: definition.values,
          message: 'Enum variables must have a non-empty values array',
          code: 'MISSING_REQUIRED'
        })
      }
    }

    // Validate number constraints
    if (definition.type === 'number') {
      if (definition.min !== undefined && typeof definition.min !== 'number') {
        errors.push({
          field: `${fieldPrefix}.min`,
          value: definition.min,
          message: 'Number min constraint must be a number',
          code: 'INVALID_TYPE'
        })
      }
      if (definition.max !== undefined && typeof definition.max !== 'number') {
        errors.push({
          field: `${fieldPrefix}.max`,
          value: definition.max,
          message: 'Number max constraint must be a number',
          code: 'INVALID_TYPE'
        })
      }
    }

    return errors
  }

  async resolveVariables(
    config: ParsedTemplateConfig, 
    provided: Record<string, any> = {}
  ): Promise<ResolvedVariables> {
    debug('Resolving variables with provided: %o', provided)
    
    const resolved: ResolvedVariables = {
      values: { ...provided },
      metadata: {
        prompted: [],
        computed: [],
        defaults: []
      }
    }

    const variables = config.allVariables || {}
    
    // First pass: handle non-internal variables
    for (const [name, definition] of Object.entries(variables)) {
      if (definition.internal) {
        continue // Handle internal variables in second pass
      }

      if (resolved.values[name] === undefined) {
        if (definition.default !== undefined) {
          resolved.values[name] = definition.default
          resolved.metadata.defaults.push(name)
          debug('Applied default for %s: %o', name, definition.default)
        } else if (definition.required) {
          // For now, we'll skip prompting and just validate required fields
          // TODO: Implement actual prompting when we integrate with the CLI
          throw new TemplateConfigError(
            `Required variable '${name}' not provided`,
            config.basePath,
            `variables.${name}`
          )
        }
      }

      // Validate the value
      if (resolved.values[name] !== undefined) {
        const validation = this.validateVariableValue(name, resolved.values[name], definition, resolved.values)
        if (!validation.valid) {
          throw new TemplateConfigError(
            `Variable validation failed for '${name}': ${validation.message}`,
            config.basePath,
            `variables.${name}`
          )
        }
      }
    }

    // Second pass: handle internal (computed) variables
    for (const [name, definition] of Object.entries(variables)) {
      if (!definition.internal) {
        continue
      }

      if (definition.default !== undefined) {
        // For now, treat internal variable defaults as static values
        // TODO: Implement template rendering for computed variables
        resolved.values[name] = definition.default
        resolved.metadata.computed.push(name)
        debug('Computed internal variable %s: %o', name, definition.default)
      }
    }

    debug('Variables resolved: %o', resolved)
    return resolved
  }

  private validateVariableValue(
    name: string, 
    value: any, 
    definition: VariableDefinition,
    allValues: Record<string, any>
  ): ValidationResult {
    // Type validation
    switch (definition.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, message: `Expected string, got ${typeof value}` }
        }
        if (definition.pattern) {
          const regex = new RegExp(definition.pattern)
          if (!regex.test(value)) {
            return { 
              valid: false, 
              message: definition.validation?.message || `Value does not match pattern: ${definition.pattern}` 
            }
          }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, message: `Expected boolean, got ${typeof value}` }
        }
        break

      case 'number':
        if (typeof value !== 'number') {
          return { valid: false, message: `Expected number, got ${typeof value}` }
        }
        if (definition.min !== undefined && value < definition.min) {
          return { valid: false, message: `Value ${value} is below minimum ${definition.min}` }
        }
        if (definition.max !== undefined && value > definition.max) {
          return { valid: false, message: `Value ${value} is above maximum ${definition.max}` }
        }
        break

      case 'enum':
        if (!definition.values?.includes(value)) {
          return { 
            valid: false, 
            message: `Value '${value}' is not in allowed values: ${definition.values?.join(', ')}` 
          }
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, message: `Expected array, got ${typeof value}` }
        }
        break

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, message: `Expected object, got ${typeof value}` }
        }
        break
    }

    // Custom validation
    if (definition.validation?.custom) {
      const validator = this.options.customValidators[definition.validation.custom]
      if (validator) {
        const context: ValidationContext = {
          variableName: name,
          allVariables: allValues,
          templatePath: '' // TODO: Pass actual template path
        }
        const result = validator(value, context)
        if (!result.valid) {
          return result
        }
      }
    }

    return { valid: true }
  }

  private async resolveIncludes(config: ParsedTemplateConfig, configPath: string): Promise<void> {
    debug('Resolving %d includes', config.includes?.length || 0)
    
    if (!config.includes) {
      return
    }

    for (const include of config.includes) {
      debug('Processing include: %s', include.url)
      
      try {
        let includeConfig: ParsedTemplateConfig

        // Check cache first
        if (this.options.includeCache.has(include.url)) {
          includeConfig = this.options.includeCache.get(include.url)!
          debug('Found cached include: %s', include.url)
        } else {
          // Resolve include URL
          includeConfig = await this.resolveIncludeUrl(include.url, config.basePath)
          this.options.includeCache.set(include.url, includeConfig)
        }

        // Merge variables
        this.mergeVariables(config, includeConfig)
        
        // Add to resolved includes
        config.resolvedIncludes.push(includeConfig)
        
        debug('Include resolved successfully: %s', include.url)
      } catch (error) {
        throw new TemplateConfigError(
          `Failed to resolve include '${include.url}': ${error.message}`,
          configPath,
          'includes'
        )
      }
    }
  }

  private async resolveIncludeUrl(url: string, basePath: string): Promise<ParsedTemplateConfig> {
    if (!this.options.allowRemoteIncludes && !url.startsWith('./') && !url.startsWith('../') && !path.isAbsolute(url)) {
      throw new Error('Remote includes are disabled')
    }

    // Import URL manager dynamically to avoid circular dependencies
    const { TemplateURLManager } = await import('./url-resolution/index.js')
    
    // Create URL manager if not exists
    if (!this.urlManager) {
      this.urlManager = new TemplateURLManager({
        cache: {
          cacheDir: path.join(process.cwd(), '.hypergen', 'cache'),
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          maxSize: 100 * 1024 * 1024, // 100MB
          integrityCheck: true
        }
      })
      await this.urlManager.initialize()
    }

    try {
      // Resolve the URL
      const resolved = await this.urlManager.resolveURL(url, basePath)
      
      // Parse the resolved template content
      return await this.parseConfigFromString(resolved.content, resolved.basePath, url)
    } catch (error) {
      throw new Error(`Failed to resolve include '${url}': ${error.message}`)
    }
  }

  private mergeVariables(target: ParsedTemplateConfig, source: ParsedTemplateConfig): void {
    if (!source.allVariables) {
      return
    }

    for (const [name, definition] of Object.entries(source.allVariables)) {
      if (target.allVariables[name]) {
        // Handle conflict based on strategy
        switch (this.options.conflictResolution) {
          case 'fail':
            throw new Error(`Variable conflict: '${name}' is defined in multiple templates`)
          case 'override':
            target.allVariables[name] = definition
            debug('Variable override: %s', name)
            break
          case 'merge':
            // TODO: Implement smart merging
            target.allVariables[name] = { ...target.allVariables[name], ...definition }
            debug('Variable merge: %s', name)
            break
          case 'prompt':
            // TODO: Implement user prompting for conflicts
            throw new Error('Prompt conflict resolution not yet implemented')
        }
      } else {
        target.allVariables[name] = definition
        debug('Variable added from include: %s', name)
      }
    }
  }
}