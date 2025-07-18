/**
 * V8 Action System
 * 
 * Export point for the decorator-based action system
 */

// Core exports
export * from './types.js'
export { action, getActionMetadata, isActionFunction } from './decorator.js'
export { ActionRegistry } from './registry.js'
export { ActionParameterResolver } from './parameter-resolver.js'
export { ActionExecutor } from './executor.js'
export { 
  DefaultActionUtils, 
  ConsoleActionLogger, 
  SilentActionLogger 
} from './utils.js'

// Explicitly export error classes
export { ActionExecutionError, ActionParameterError } from './types.js'

// Re-export main types for convenience
export type {
  ActionMetadata,
  ActionParameter,
  ActionContext,
  ActionResult,
  ActionFunction,
  ActionLogger,
  ActionUtils,
  DecoratedAction
} from './types.js'