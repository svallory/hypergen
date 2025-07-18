/**
 * V8 Template Configuration Types
 * 
 * Core type definitions for the new template.yml configuration system
 */

// Core template configuration interface
export interface TemplateConfig {
  title?: string
  description?: string
  includes?: TemplateInclude[]
  variables?: Record<string, VariableDefinition>
  files?: string[]
  hooks?: TemplateHooks
}

// Template inclusion for composition
export interface TemplateInclude {
  url: string
  variables?: Record<string, any>
  condition?: string
}

// Rich variable definition
export interface VariableDefinition {
  type: VariableType
  required?: boolean
  default?: any
  prompt?: string
  description?: string
  internal?: boolean
  validation?: VariableValidation
  // Type-specific properties
  values?: string[] // for enum
  min?: number // for number
  max?: number // for number
  pattern?: string // for string
}

// Variable types supported
export type VariableType = 'string' | 'boolean' | 'number' | 'enum' | 'array' | 'object'

// Validation rules
export interface VariableValidation {
  required?: boolean
  custom?: string // path to custom validator
  message?: string // custom error message
}

// Template lifecycle hooks
export interface TemplateHooks {
  before?: HookDefinition[]
  after?: HookDefinition[]
}

export interface HookDefinition {
  action: string
  condition?: string
  variables?: Record<string, any>
}

// Parsed configuration with resolved includes
export interface ParsedTemplateConfig extends TemplateConfig {
  basePath: string
  resolvedIncludes: ParsedTemplateConfig[]
  allVariables: Record<string, VariableDefinition> // merged from includes
}

// Variables resolved with user input
export interface ResolvedVariables {
  values: Record<string, any>
  metadata: {
    prompted: string[]
    computed: string[]
    defaults: string[]
  }
}

// Configuration and validation
export interface ParserOptions {
  allowRemoteIncludes?: boolean
  includeCache?: Map<string, ParsedTemplateConfig>
  customValidators?: Record<string, ValidatorFunction>
  conflictResolution?: ConflictResolutionStrategy
}

export type ValidatorFunction = (value: any, context: ValidationContext) => ValidationResult
export type ConflictResolutionStrategy = 'fail' | 'override' | 'merge' | 'prompt'

export interface ValidationContext {
  variableName: string
  allVariables: Record<string, any>
  templatePath: string
}

export interface ValidationResult {
  valid: boolean
  message?: string
  code?: string
}

// Error types
export class TemplateConfigError extends Error {
  constructor(
    message: string,
    public configPath: string,
    public field?: string,
    public validationErrors?: ValidationError[]
  ) {
    super(message)
  }
}

export interface ValidationError {
  field: string
  value: any
  message: string
  code: string
}