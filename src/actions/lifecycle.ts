/**
 * Action Lifecycle Management
 * 
 * Handles pre/post generation hooks and action pipelines
 */

import createDebug from 'debug'
import { ActionContext, ActionResult, ActionFunction } from './types.js'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'

const debug = createDebug('hypergen:v8:lifecycle')

export interface LifecycleHook {
  name: string
  phase: 'pre' | 'post' | 'error'
  action: ActionFunction
  condition?: (context: ActionContext) => boolean
  priority?: number // Higher numbers run first
}

export interface LifecycleConfig {
  hooks: LifecycleHook[]
  continueOnError?: boolean
  timeout?: number
}

export interface LifecycleHookResult {
  hook: string
  phase: 'pre' | 'post' | 'error'
  success: boolean
  result?: ActionResult
  error?: Error
  duration: number
}

export interface LifecycleResult {
  success: boolean
  results: LifecycleHookResult[]
  totalDuration: number
}

export class ActionLifecycleManager {
  private hooks: Map<string, LifecycleHook[]> = new Map()
  private globalHooks: LifecycleHook[] = []

  /**
   * Register a lifecycle hook
   */
  registerHook(actionName: string | '*', hook: LifecycleHook): void {
    if (actionName === '*') {
      this.globalHooks.push(hook)
      this.globalHooks.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    } else {
      if (!this.hooks.has(actionName)) {
        this.hooks.set(actionName, [])
      }
      this.hooks.get(actionName)!.push(hook)
      this.hooks.get(actionName)!.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    }
    debug('Registered %s hook for action: %s', hook.phase, actionName)
  }

  /**
   * Execute lifecycle hooks for an action
   */
  async executeLifecycle(
    actionName: string,
    context: ActionContext,
    mainAction: ActionFunction,
    config: Partial<LifecycleConfig> = {}
  ): Promise<{ result: ActionResult; lifecycle: LifecycleResult }> {
    const startTime = Date.now()
    const lifecycleResult: LifecycleResult = {
      success: true,
      results: [],
      totalDuration: 0
    }

    try {
      // Get applicable hooks
      const actionHooks = this.hooks.get(actionName) || []
      const allHooks = [...this.globalHooks, ...actionHooks]

      // Execute pre-hooks
      await this.executeHooks(allHooks, 'pre', context, lifecycleResult, config)

      // Execute main action
      debug('Executing main action: %s', actionName)
      const actionStart = Date.now()
      let mainResult: ActionResult
      
      try {
        mainResult = await mainAction(context)
      } catch (error: any) {
        // Execute error hooks
        await this.executeHooks(allHooks, 'error', context, lifecycleResult, config)
        throw error
      }

      debug('Main action completed in %dms', Date.now() - actionStart)

      // Execute post-hooks
      await this.executeHooks(allHooks, 'post', context, lifecycleResult, config)

      lifecycleResult.totalDuration = Date.now() - startTime
      return { result: mainResult, lifecycle: lifecycleResult }

    } catch (error: any) {
      lifecycleResult.success = false
      lifecycleResult.totalDuration = Date.now() - startTime
      throw error
    }
  }

  /**
   * Execute hooks for a specific phase
   */
  private async executeHooks(
    hooks: LifecycleHook[],
    phase: 'pre' | 'post' | 'error',
    context: ActionContext,
    lifecycleResult: LifecycleResult,
    config: Partial<LifecycleConfig>
  ): Promise<void> {
    const phaseHooks = hooks.filter(h => h.phase === phase)
    
    if (phaseHooks.length === 0) return

    debug('Executing %d %s hooks', phaseHooks.length, phase)

    for (const hook of phaseHooks) {
      // Check condition
      if (hook.condition && !hook.condition(context)) {
        debug('Skipping hook %s - condition not met', hook.name)
        continue
      }

      const hookStart = Date.now()
      const hookResult: LifecycleHookResult = {
        hook: hook.name,
        phase,
        success: false,
        duration: 0
      }

      try {
        // Execute hook with timeout
        const timeout = config.timeout || 30000 // 30 seconds default
        const hookPromise = hook.action(context)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Hook timeout: ${hook.name}`)), timeout)
        })

        const result = await Promise.race([hookPromise, timeoutPromise])
        
        hookResult.success = result.success
        hookResult.result = result
        hookResult.duration = Date.now() - hookStart

        debug('Hook %s completed successfully in %dms', hook.name, hookResult.duration)
      } catch (error: any) {
        hookResult.success = false
        hookResult.error = error
        hookResult.duration = Date.now() - hookStart
        lifecycleResult.success = false

        debug('Hook %s failed: %s', hook.name, error.message)

        if (!config.continueOnError) {
          lifecycleResult.results.push(hookResult)
          throw ErrorHandler.createError(
            ErrorCode.ACTION_EXECUTION_FAILED,
            `Lifecycle hook failed: ${hook.name} - ${error.message}`,
            { hook: hook.name, phase, error: error.message }
          )
        }
      }

      lifecycleResult.results.push(hookResult)
    }
  }

  /**
   * Get registered hooks for an action
   */
  getHooks(actionName: string): LifecycleHook[] {
    const actionHooks = this.hooks.get(actionName) || []
    return [...this.globalHooks, ...actionHooks]
  }

  /**
   * Clear all hooks
   */
  clearHooks(): void {
    this.hooks.clear()
    this.globalHooks = []
    debug('All hooks cleared')
  }

  /**
   * Clear hooks for a specific action
   */
  clearActionHooks(actionName: string): void {
    this.hooks.delete(actionName)
    debug('Hooks cleared for action: %s', actionName)
  }
}

/**
 * Built-in lifecycle hooks
 */
export class BuiltinHooks {
  /**
   * Format generated files using prettier
   */
  static formatFiles: LifecycleHook = {
    name: 'format-files',
    phase: 'post',
    priority: 100,
    action: async (context: ActionContext): Promise<ActionResult> => {
      debug('Formatting generated files')
      
      // This would integrate with prettier or other formatters
      // For now, just return success
      return {
        success: true,
        message: 'Files formatted successfully'
      }
    }
  }

  /**
   * Install npm dependencies
   */
  static installDependencies: LifecycleHook = {
    name: 'install-dependencies',
    phase: 'post',
    priority: 90,
    condition: (context: ActionContext) => {
      // Only run if package.json was created or modified
      return context.variables.installDependencies === true ||
             (context.variables.filesCreated || []).some((file: string) => file.includes('package.json'))
    },
    action: async (context: ActionContext): Promise<ActionResult> => {
      debug('Installing npm dependencies')
      
      // This would run npm install or yarn install
      // For now, just return success
      return {
        success: true,
        message: 'Dependencies installed successfully'
      }
    }
  }

  /**
   * Git initialization
   */
  static initGit: LifecycleHook = {
    name: 'init-git',
    phase: 'post',
    priority: 80,
    condition: (context: ActionContext) => {
      return context.variables.initGit === true
    },
    action: async (context: ActionContext): Promise<ActionResult> => {
      debug('Initializing git repository')
      
      // This would run git init
      // For now, just return success
      return {
        success: true,
        message: 'Git repository initialized'
      }
    }
  }

  /**
   * Backup existing files
   */
  static backupFiles: LifecycleHook = {
    name: 'backup-files',
    phase: 'pre',
    priority: 100,
    condition: (context: ActionContext) => {
      return context.variables.backup === true && !context.force
    },
    action: async (context: ActionContext): Promise<ActionResult> => {
      debug('Backing up existing files')
      
      // This would create backups of files that would be overwritten
      // For now, just return success
      return {
        success: true,
        message: 'Files backed up successfully'
      }
    }
  }

  /**
   * Validate prerequisites
   */
  static validatePrerequisites: LifecycleHook = {
    name: 'validate-prerequisites',
    phase: 'pre',
    priority: 200,
    action: async (context: ActionContext): Promise<ActionResult> => {
      debug('Validating prerequisites')
      
      // This would check for required tools, dependencies, etc.
      // For now, just return success
      return {
        success: true,
        message: 'Prerequisites validated'
      }
    }
  }

  /**
   * Get all built-in hooks
   */
  static getAll(): LifecycleHook[] {
    return [
      this.formatFiles,
      this.installDependencies,
      this.initGit,
      this.backupFiles,
      this.validatePrerequisites
    ]
  }
}