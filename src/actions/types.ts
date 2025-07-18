/**
 * V8 Action System Types
 * 
 * Type definitions for the decorator-based action system
 */

// Action decorator metadata
export interface ActionMetadata {
  name: string
  description?: string
  parameters?: ActionParameter[]
  category?: string
  tags?: string[]
  examples?: ActionExample[]
}

// Action parameter definition (similar to template variables)
export interface ActionParameter {
  name: string
  type: ParameterType
  required?: boolean
  default?: any
  prompt?: string
  description?: string
  validation?: ParameterValidation
  // Type-specific properties
  values?: string[] // for enum
  min?: number // for number
  max?: number // for number
  pattern?: string // for string
}

export type ParameterType = 'string' | 'boolean' | 'number' | 'enum' | 'array' | 'object' | 'file' | 'directory'

export interface ParameterValidation {
  required?: boolean
  custom?: string // path to custom validator
  message?: string // custom error message
}

// Action execution context
export interface ActionContext {
  variables: Record<string, any> // resolved parameters
  projectRoot: string
  templatePath?: string
  logger: ActionLogger
  utils: ActionUtils
  dryRun?: boolean // if true, don't actually write files
  force?: boolean // if true, overwrite existing files
}

// Action execution result
export interface ActionResult {
  success: boolean
  message?: string
  filesCreated?: string[]
  filesModified?: string[]
  filesDeleted?: string[]
  data?: any
}

// Action function signature
export type ActionFunction = (context: ActionContext) => Promise<ActionResult>

// Decorated action interface
export interface DecoratedAction {
  metadata: ActionMetadata
  fn: ActionFunction
  module: string
  exported: boolean
}

// Action example for documentation
export interface ActionExample {
  title: string
  description?: string
  parameters: Record<string, any>
  expectedResult?: Partial<ActionResult>
}

// Logging interface
export interface ActionLogger {
  success(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

// Utilities interface for action implementations
export interface ActionUtils {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  ensureDir(path: string): Promise<void>
  copyFile(src: string, dest: string): Promise<void>
  pathExists(path: string): Promise<boolean>
  glob(pattern: string, options?: { cwd?: string }): Promise<string[]>
  installPackages(packages: string[], options?: { dev?: boolean }): Promise<void>
  runCommand(command: string, options?: { cwd?: string }): Promise<string>
}

// Error types
export class ActionExecutionError extends Error {
  constructor(
    message: string,
    public actionName: string,
    public parameterErrors?: string[],
    public cause?: Error
  ) {
    super(message)
    this.name = 'ActionExecutionError'
  }
}

export class ActionParameterError extends Error {
  constructor(
    message: string,
    public parameterName: string,
    public parameterValue: any,
    public expectedType: ParameterType
  ) {
    super(message)
    this.name = 'ActionParameterError'
  }
}

// Registry query options
export interface ActionQueryOptions {
  category?: string
  tags?: string[]
  search?: string
}