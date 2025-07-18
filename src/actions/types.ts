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
  communication?: ActionCommunication // cross-action communication
}

// Cross-action communication interface
export interface ActionCommunication {
  actionId: string
  manager: any // ActionCommunicationManager
  sendMessage: (type: string, payload: any, target?: string) => void
  getSharedData: (key: string) => any
  setSharedData: (key: string, value: any) => void
  waitForAction: (actionId: string, timeout?: number) => Promise<any>
  subscribeToMessages: (messageType: string, handler: (message: any) => void) => () => void
}

// Action execution result
export interface ActionResult {
  success: boolean
  message?: string
  filesCreated?: string[]
  filesModified?: string[]
  filesDeleted?: string[]
  data?: any
  metadata?: any
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
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
  trace(message: string): void
}

// Utilities interface for action implementations
export interface ActionUtils {
  fileExists(path: string): boolean
  readFile(path: string): string
  writeFile(path: string, content: string): void
  createDirectory(path: string): void
  copyFile(src: string, dest: string): void
  deleteFile(path: string): void
  globFiles(pattern: string, options?: { cwd?: string }): string[]
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