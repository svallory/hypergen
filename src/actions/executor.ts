/**
 * Action Execution Engine
 * 
 * Handles action discovery, parameter resolution, and execution
 */

import createDebug from 'debug'
import { ActionRegistry } from './registry.js'
import { ActionParameterResolver } from './parameter-resolver.js'
import { DefaultActionUtils, ConsoleActionLogger } from './utils.js'
import { ActionLifecycleManager, BuiltinHooks } from './lifecycle.js'
import { TemplateCompositionEngine } from '../config/template-composition.js'
import { TemplateParser } from '../config/template-parser.js'
import { 
  ActionCommunicationManager, 
  getCommunicationManager,
  type CommunicationConfig 
} from './communication.js'
import type { 
  ActionContext, 
  ActionResult, 
  ActionLogger, 
  ActionUtils,
  ActionFunction
} from './types.js'
import { ActionExecutionError } from './types.js'
import { ErrorHandler, ErrorCode, HypergenError, validateParameter } from '../errors/hypergen-errors.js'
import { type PromptOptions } from '../prompts/interactive-prompts.js'

const debug = createDebug('hypergen:v8:action:executor')

export class ActionExecutor {
  private parameterResolver = new ActionParameterResolver()
  private defaultUtils = new DefaultActionUtils()
  private defaultLogger = new ConsoleActionLogger()
  private lifecycleManager = new ActionLifecycleManager()
  private compositionEngine = new TemplateCompositionEngine()
  private communicationManager: ActionCommunicationManager

  constructor(communicationConfig?: Partial<CommunicationConfig>) {
    // Register built-in lifecycle hooks
    for (const hook of BuiltinHooks.getAll()) {
      this.lifecycleManager.registerHook('*', hook)
    }

    // Initialize communication manager
    this.communicationManager = getCommunicationManager(communicationConfig)
  }

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
      actionId?: string
    } = {}
  ): Promise<ActionResult> {
    debug('Executing action interactively: %s with parameters: %o', actionName, parameters)

    // Generate action ID for communication tracking
    const actionId = options.actionId || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Register action with communication manager
      this.communicationManager.registerAction(actionId, actionName, parameters)

      // Get action from registry
      const registry = ActionRegistry.getInstance()
      const action = registry.get(actionName)

      if (!action) {
        const error = ErrorHandler.createActionNotFoundError(actionName)
        this.communicationManager.failAction(actionId, error.message)
        throw error
      }

      // Resolve parameters with interactive prompts
      const resolvedParams = await this.parameterResolver.resolveParametersInteractively(
        action.metadata,
        parameters,
        options
      )

      // Update action state with resolved parameters
      this.communicationManager.updateActionState(actionId, { resolvedParameters: resolvedParams })

      // Build execution context with communication support
      const executionContext: ActionContext = {
        variables: resolvedParams,
        projectRoot: context.projectRoot || process.cwd(),
        templatePath: context.templatePath,
        logger: context.logger || this.defaultLogger,
        utils: context.utils || this.defaultUtils,
        // Add execution options to context
        dryRun: options.dryRun || false,
        force: options.force || false,
        // Add communication capabilities
        communication: {
          actionId,
          manager: this.communicationManager,
          sendMessage: (type: string, payload: any, target?: string) => {
            this.communicationManager.sendMessage({
              source: actionId,
              target,
              type,
              payload,
              timestamp: new Date()
            })
          },
          getSharedData: (key: string) => this.communicationManager.getSharedData(key),
          setSharedData: (key: string, value: any) => this.communicationManager.setSharedData(key, value, actionId),
          waitForAction: (targetActionId: string, timeout?: number) => 
            this.communicationManager.waitForAction(targetActionId, timeout),
          subscribeToMessages: (messageType: string, handler: (message: any) => void) =>
            this.communicationManager.subscribeToMessages(actionId, messageType, handler)
        }
      }

      debug('Action context prepared for %s: %o', actionName, {
        variableCount: Object.keys(resolvedParams).length,
        projectRoot: executionContext.projectRoot,
        hasTemplatePath: !!executionContext.templatePath,
        dryRun: executionContext.dryRun,
        force: executionContext.force,
        actionId
      })

      // Handle dry run
      if (options.dryRun) {
        debug('Dry run mode: simulating action execution')
        const dryRunResult = {
          success: true,
          message: `[DRY RUN] Action '${actionName}' would execute with parameters: ${Object.keys(resolvedParams).join(', ')}`,
          filesCreated: [],
          filesModified: [],
          filesDeleted: []
        }
        this.communicationManager.completeAction(actionId, dryRunResult)
        return dryRunResult
      }

      // Execute action with lifecycle management
      const mainAction: ActionFunction = async (ctx: ActionContext) => {
        return await action.fn(ctx)
      }

      const { result, lifecycle } = await this.lifecycleManager.executeLifecycle(
        actionName,
        executionContext,
        mainAction,
        {
          timeout: options.timeout,
          continueOnError: false
        }
      )

      // Complete action with communication manager
      this.communicationManager.completeAction(actionId, {
        filesCreated: result.filesCreated,
        message: result.message
      })

      debug('Action %s completed with lifecycle: %o', actionName, {
        success: result.success,
        lifecycleSuccess: lifecycle.success,
        totalDuration: lifecycle.totalDuration,
        hooksExecuted: lifecycle.results.length
      })

      return result
    } catch (error: any) {
      debug('Action execution with prompts failed: %s', error.message)
      
      // Fail action with communication manager
      this.communicationManager.failAction(actionId, error.message || 'Action execution failed')
      
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

  /**
   * Execute a template with composition support
   */
  async executeTemplate(
    templatePath: string,
    parameters: Record<string, any> = {},
    options: {
      useDefaults?: boolean
      dryRun?: boolean
      force?: boolean
      skipOptional?: boolean
      timeout?: number
    } = {}
  ): Promise<ActionResult> {
    debug('Executing template with composition: %s', templatePath)

    try {
      // Parse template configuration
      const parsed = await TemplateParser.parseTemplateFile(templatePath)
      if (!parsed.isValid) {
        throw ErrorHandler.createError(
          ErrorCode.TEMPLATE_PARSING_ERROR,
          `Invalid template configuration: ${parsed.errors.join(', ')}`,
          { templatePath, errors: parsed.errors }
        )
      }

      // Compose template with inheritance and includes
      const composed = await this.compositionEngine.compose(parsed.config, {
        variables: parameters,
        projectRoot: process.cwd()
      })

      debug('Template composition complete: %s includes, %d conflicts', 
        composed.resolvedIncludes.length, composed.conflicts.length)

      // Log composition details
      if (composed.resolvedIncludes.length > 0) {
        debug('Template includes: %o', composed.resolvedIncludes.map(inc => ({
          url: inc.url,
          included: inc.included,
          reason: inc.reason
        })))
      }

      if (composed.conflicts.length > 0) {
        debug('Template conflicts resolved: %o', composed.conflicts)
      }

      // Create action context with composed template variables
      const executionContext: ActionContext = {
        variables: { ...parameters },
        projectRoot: process.cwd(),
        templatePath,
        logger: this.defaultLogger,
        utils: this.defaultUtils,
        dryRun: options.dryRun || false,
        force: options.force || false
      }

      // Merge composed variables into context
      for (const [name, variable] of Object.entries(composed.variables)) {
        if (executionContext.variables[name] === undefined) {
          executionContext.variables[name] = variable.default
        }
      }

      // For now, return a successful result indicating template composition
      // In a full implementation, this would execute the template rendering
      return {
        success: true,
        message: `Template '${parsed.config.name}' composed successfully with ${composed.resolvedIncludes.length} includes and ${composed.conflicts.length} conflicts resolved`,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        metadata: {
          template: parsed.config,
          composition: {
            includes: composed.resolvedIncludes,
            conflicts: composed.conflicts,
            variables: Object.keys(composed.variables)
          }
        }
      }
    } catch (error: any) {
      debug('Template execution failed: %s', error.message)
      
      if (error instanceof HypergenError) {
        throw error
      }

      throw ErrorHandler.createError(
        ErrorCode.TEMPLATE_EXECUTION_ERROR,
        error.message || 'Template execution failed',
        { templatePath }
      )
    }
  }

  /**
   * Register a lifecycle hook for actions
   */
  registerLifecycleHook(actionName: string, hook: import('./lifecycle.js').LifecycleHook): void {
    this.lifecycleManager.registerHook(actionName, hook)
  }

  /**
   * Get lifecycle hooks for an action
   */
  getLifecycleHooks(actionName: string): import('./lifecycle.js').LifecycleHook[] {
    return this.lifecycleManager.getHooks(actionName)
  }

  /**
   * Clear lifecycle hooks
   */
  clearLifecycleHooks(actionName?: string): void {
    if (actionName) {
      this.lifecycleManager.clearActionHooks(actionName)
    } else {
      this.lifecycleManager.clearHooks()
    }
  }

  /**
   * Get communication manager instance
   */
  getCommunicationManager(): ActionCommunicationManager {
    return this.communicationManager
  }

  /**
   * Execute multiple actions with communication support
   */
  async executeWorkflow(
    actions: Array<{
      name: string
      parameters?: Record<string, any>
      actionId?: string
      dependsOn?: string[]
      parallel?: boolean
    }>,
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult[]> {
    debug('Executing workflow with %d actions', actions.length)

    const results: ActionResult[] = []
    const actionIds = new Map<string, string>()

    // Generate action IDs and register dependencies
    for (const actionConfig of actions) {
      const actionId = actionConfig.actionId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      actionIds.set(actionConfig.name, actionId)

      // Set shared data about dependencies
      if (actionConfig.dependsOn) {
        this.communicationManager.setSharedData(`${actionId}_dependencies`, actionConfig.dependsOn, 'workflow')
      }
    }

    // Execute actions with dependency management
    for (const actionConfig of actions) {
      const actionId = actionIds.get(actionConfig.name)!

      // Wait for dependencies to complete
      if (actionConfig.dependsOn) {
        debug('Waiting for dependencies: %o', actionConfig.dependsOn)
        for (const dependency of actionConfig.dependsOn) {
          const dependencyId = actionIds.get(dependency)
          if (dependencyId) {
            await this.communicationManager.waitForAction(dependencyId, 30000) // 30 second timeout
          }
        }
      }

      // Execute action
      const result = await this.executeInteractively(
        actionConfig.name,
        actionConfig.parameters || {},
        context,
        { actionId }
      )

      results.push(result)

      // Stop workflow if action fails (unless marked as optional)
      if (!result.success) {
        debug('Workflow stopped due to action failure: %s', actionConfig.name)
        break
      }
    }

    return results
  }

  /**
   * Get workflow status and statistics
   */
  getWorkflowStatus(): {
    activeActions: number
    completedActions: number
    failedActions: number
    totalMessages: number
    sharedDataEntries: number
  } {
    return this.communicationManager.getStats()
  }

  /**
   * Clear communication state
   */
  clearCommunicationState(): void {
    this.communicationManager.clear()
  }
}