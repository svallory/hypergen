/**
 * Action Execution Engine
 * 
 * Handles action discovery, parameter resolution, and execution
 */

import createDebug from 'debug'
import { ActionRegistry } from './registry.js'
import { ActionParameterResolver } from './parameter-resolver.js'
import { DefaultActionUtils, ConsoleActionLogger } from './utils.js'
import type { 
  ActionContext, 
  ActionResult, 
  ActionLogger, 
  ActionUtils
} from './types.js'
import { ActionExecutionError } from './types.js'
import { ErrorHandler, ErrorCode, HypergenError, validateParameter } from '../errors/hypergen-errors.js'
import { type PromptOptions } from '../prompts/interactive-prompts.js'

const debug = createDebug('hypergen:v8:action:executor')

export class ActionExecutor {
  private parameterResolver = new ActionParameterResolver()
  private defaultUtils = new DefaultActionUtils()
  private defaultLogger = new ConsoleActionLogger()

  /**
   * Execute an action by name with provided parameters
   * @deprecated Use executeInteractively instead for better user experience
   */
  async execute(
    actionName: string,
    parameters: Record<string, any> = {},
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult> {
    debug('Executing action (legacy): %s with parameters: %o', actionName, parameters)

    try {
      // Get action from registry
      const registry = ActionRegistry.getInstance()
      const action = registry.get(actionName)

      if (!action) {
        throw ErrorHandler.createActionNotFoundError(actionName)
      }

      // Resolve parameters using legacy method
      const resolvedParams = await this.parameterResolver.resolveParameters(
        action.metadata,
        parameters
      )

      // Build execution context
      const executionContext: ActionContext = {
        variables: resolvedParams,
        projectRoot: context.projectRoot || process.cwd(),
        templatePath: context.templatePath,
        logger: context.logger || this.defaultLogger,
        utils: context.utils || this.defaultUtils,
        dryRun: context.dryRun || false,
        force: context.force || false
      }

      debug('Action context prepared for %s: %o', actionName, {
        variableCount: Object.keys(resolvedParams).length,
        projectRoot: executionContext.projectRoot,
        hasTemplatePath: !!executionContext.templatePath
      })

      // Execute action
      const startTime = Date.now()
      const result = await action.fn(executionContext)
      const executionTime = Date.now() - startTime

      debug('Action %s completed in %dms: %o', actionName, executionTime, {
        success: result.success,
        filesCreated: result.filesCreated?.length || 0,
        filesModified: result.filesModified?.length || 0,
        filesDeleted: result.filesDeleted?.length || 0
      })

      return result
    } catch (error: any) {
      debug('Action execution failed: %s', error.message)
      
      if (error instanceof HypergenError) {
        throw error
      }

      if (error instanceof ActionExecutionError) {
        throw ErrorHandler.createError(
          ErrorCode.ACTION_EXECUTION_FAILED,
          error.message,
          { action: actionName }
        )
      }

      throw ErrorHandler.createError(
        ErrorCode.ACTION_EXECUTION_FAILED,
        error.message || 'Action execution failed',
        { action: actionName }
      )
    }
  }

  /**
   * Execute an action with interactive parameter resolution
   */
  async executeInteractively(
    actionName: string,
    parameters: Record<string, any> = {},
    context: Partial<ActionContext> = {},
    options: {
      useDefaults?: boolean
      dryRun?: boolean
      force?: boolean
      skipOptional?: boolean
      timeout?: number
    } = {}
  ): Promise<ActionResult> {
    debug('Executing action interactively: %s with parameters: %o', actionName, parameters)

    try {
      // Get action from registry
      const registry = ActionRegistry.getInstance()
      const action = registry.get(actionName)

      if (!action) {
        throw ErrorHandler.createActionNotFoundError(actionName)
      }

      // Resolve parameters with interactive prompts
      const resolvedParams = await this.parameterResolver.resolveParametersInteractively(
        action.metadata,
        parameters,
        options
      )

      // Build execution context
      const executionContext: ActionContext = {
        variables: resolvedParams,
        projectRoot: context.projectRoot || process.cwd(),
        templatePath: context.templatePath,
        logger: context.logger || this.defaultLogger,
        utils: context.utils || this.defaultUtils,
        // Add execution options to context
        dryRun: options.dryRun || false,
        force: options.force || false
      }

      debug('Action context prepared for %s: %o', actionName, {
        variableCount: Object.keys(resolvedParams).length,
        projectRoot: executionContext.projectRoot,
        hasTemplatePath: !!executionContext.templatePath,
        dryRun: executionContext.dryRun,
        force: executionContext.force
      })

      // Handle dry run
      if (options.dryRun) {
        debug('Dry run mode: simulating action execution')
        return {
          success: true,
          message: `[DRY RUN] Action '${actionName}' would execute with parameters: ${Object.keys(resolvedParams).join(', ')}`,
          filesCreated: [],
          filesModified: [],
          filesDeleted: []
        }
      }

      // Execute action
      const startTime = Date.now()
      const result = await action.fn(executionContext)
      const executionTime = Date.now() - startTime

      debug('Action %s completed in %dms: %o', actionName, executionTime, {
        success: result.success,
        filesCreated: result.filesCreated?.length || 0,
        filesModified: result.filesModified?.length || 0,
        filesDeleted: result.filesDeleted?.length || 0
      })

      return result
    } catch (error: any) {
      debug('Action execution with prompts failed: %s', error.message)
      
      if (error instanceof HypergenError) {
        throw error
      }

      if (error instanceof ActionExecutionError) {
        throw ErrorHandler.createError(
          ErrorCode.ACTION_EXECUTION_FAILED,
          error.message,
          { action: actionName }
        )
      }

      throw ErrorHandler.createError(
        ErrorCode.ACTION_EXECUTION_FAILED,
        error.message || 'Action execution failed',
        { action: actionName }
      )
    }
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeSequence(
    actions: Array<{ name: string; parameters?: Record<string, any> }>,
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult[]> {
    debug('Executing action sequence: %d actions', actions.length)

    const results: ActionResult[] = []

    for (const actionConfig of actions) {
      const result = await this.execute(
        actionConfig.name,
        actionConfig.parameters || {},
        context
      )

      results.push(result)

      // Stop execution if an action fails
      if (!result.success) {
        debug('Action sequence stopped due to failure: %s', actionConfig.name)
        break
      }
    }

    return results
  }

  /**
   * Execute multiple actions in parallel
   */
  async executeParallel(
    actions: Array<{ name: string; parameters?: Record<string, any> }>,
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult[]> {
    debug('Executing actions in parallel: %d actions', actions.length)

    const promises = actions.map(actionConfig =>
      this.execute(actionConfig.name, actionConfig.parameters || {}, context)
    )

    return Promise.all(promises)
  }

  /**
   * Validate action parameters without executing
   */
  async validateParameters(
    actionName: string,
    parameters: Record<string, any> = {}
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const registry = ActionRegistry.getInstance()
      const action = registry.get(actionName)

      if (!action) {
        return {
          valid: false,
          errors: [`Action '${actionName}' not found`]
        }
      }

      await this.parameterResolver.resolveParameters(action.metadata, parameters)
      
      return { valid: true, errors: [] }
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message]
      }
    }
  }

  /**
   * Get information about an action
   */
  getActionInfo(actionName: string): {
    exists: boolean
    metadata?: any
    parameterCount?: number
    requiredParameters?: string[]
  } {
    const registry = ActionRegistry.getInstance()
    const action = registry.get(actionName)

    if (!action) {
      return { exists: false }
    }

    const requiredParameters = action.metadata.parameters
      ?.filter(p => p.required)
      .map(p => p.name) || []

    return {
      exists: true,
      metadata: action.metadata,
      parameterCount: action.metadata.parameters?.length || 0,
      requiredParameters
    }
  }

  /**
   * Get list of available action names
   */
  getAvailableActionNames(): string[] {
    const registry = ActionRegistry.getInstance()
    return registry.getAll().map(action => action.metadata.name).sort()
  }

  /**
   * Get actions by category
   */
  getActionsByCategory(category: string): string[] {
    const registry = ActionRegistry.getInstance()
    return registry.getByCategory(category).map(action => action.metadata.name).sort()
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const registry = ActionRegistry.getInstance()
    return registry.getCategories()
  }

  /**
   * Search actions by name or description
   */
  searchActions(query: string): string[] {
    const registry = ActionRegistry.getInstance()
    const results = registry.query({ search: query })
    return results.map(action => action.metadata.name).sort()
  }
}