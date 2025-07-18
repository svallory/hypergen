/**
 * Action Decorator Implementation
 * 
 * Provides the @action decorator for defining generator actions
 */

import createDebug from 'debug'
import type { ActionMetadata, ActionFunction, DecoratedAction } from './types.js'
import { ActionRegistry } from './registry.js'

const debug = createDebug('hypergen:v8:action:decorator')

// Symbol to store metadata on functions
const ACTION_METADATA_SYMBOL = Symbol('actionMetadata')

/**
 * Action decorator factory
 * 
 * @param metadata Action configuration including name, description, and parameters
 * @returns Decorator function
 */
export function action(metadata: ActionMetadata) {
  return function <T extends ActionFunction>(
    target: T,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ): T {
    debug('Decorating action: %s', metadata.name)

    // Validate metadata
    validateActionMetadata(metadata)

    // Store metadata on the function
    const actionMetadata: ActionMetadata = {
      name: metadata.name,
      description: metadata.description,
      parameters: metadata.parameters || [],
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      examples: metadata.examples || []
    }

    // Attach metadata to function using symbol
    ;(target as any)[ACTION_METADATA_SYMBOL] = actionMetadata

    // Register with action registry
    const registry = ActionRegistry.getInstance()
    registry.register(target, actionMetadata)

    debug('Action registered: %s in category %s', metadata.name, actionMetadata.category)

    return target
  }
}

/**
 * Extract action metadata from a decorated function
 */
export function getActionMetadata(fn: ActionFunction): ActionMetadata | undefined {
  return (fn as any)[ACTION_METADATA_SYMBOL]
}

/**
 * Check if a function is decorated with @action
 */
export function isActionFunction(fn: any): fn is ActionFunction {
  return typeof fn === 'function' && ACTION_METADATA_SYMBOL in fn
}

/**
 * Validate action metadata
 */
function validateActionMetadata(metadata: ActionMetadata): void {
  if (!metadata.name) {
    throw new Error('Action name is required')
  }

  if (!/^[a-z][a-z0-9-]*$/i.test(metadata.name)) {
    throw new Error('Action name must be alphanumeric with hyphens (kebab-case recommended)')
  }

  if (metadata.parameters) {
    for (const param of metadata.parameters) {
      validateParameterDefinition(param)
    }
  }
}

/**
 * Validate parameter definition
 */
function validateParameterDefinition(param: any): void {
  if (!param.name) {
    throw new Error('Parameter name is required')
  }

  if (!param.type) {
    throw new Error(`Parameter ${param.name} must have a type`)
  }

  const validTypes = ['string', 'boolean', 'number', 'enum', 'array', 'object', 'file', 'directory']
  if (!validTypes.includes(param.type)) {
    throw new Error(`Invalid parameter type '${param.type}' for ${param.name}. Must be one of: ${validTypes.join(', ')}`)
  }

  // Validate enum parameters
  if (param.type === 'enum') {
    if (!param.values || !Array.isArray(param.values) || param.values.length === 0) {
      throw new Error(`Enum parameter ${param.name} must have a non-empty values array`)
    }
  }

  // Validate number constraints
  if (param.type === 'number') {
    if (param.min !== undefined && typeof param.min !== 'number') {
      throw new Error(`Parameter ${param.name} min constraint must be a number`)
    }
    if (param.max !== undefined && typeof param.max !== 'number') {
      throw new Error(`Parameter ${param.name} max constraint must be a number`)
    }
    if (param.min !== undefined && param.max !== undefined && param.min > param.max) {
      throw new Error(`Parameter ${param.name} min (${param.min}) cannot be greater than max (${param.max})`)
    }
  }
}