/**
 * Action Composition and Pipelines
 * 
 * Enables building complex workflows by composing actions in pipelines
 * with support for conditional execution, parallel processing, and data flow
 */

import createDebug from 'debug'
import { ActionExecutor } from './executor.js'
import { getCommunicationManager, type ActionCommunicationManager } from './communication.js'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'
import type { ActionContext, ActionResult } from './types.js'

const debug = createDebug('hypergen:v8:pipelines')

export interface PipelineStep {
  id: string
  name: string // action name
  parameters?: Record<string, any>
  condition?: string // expression to evaluate
  parallel?: boolean
  dependsOn?: string[] // step IDs this step depends on
  timeout?: number
  retries?: number
  continueOnError?: boolean
  tags?: string[]
}

export interface PipelineConfig {
  name: string
  description?: string
  version?: string
  author?: string
  steps: PipelineStep[]
  variables?: Record<string, any>
  environment?: Record<string, string>
  hooks?: {
    beforePipeline?: string[]
    afterPipeline?: string[]
    beforeStep?: string[]
    afterStep?: string[]
    onError?: string[]
  }
  settings?: {
    timeout?: number
    retries?: number
    continueOnError?: boolean
    parallel?: boolean
    maxParallelSteps?: number
  }
}

export interface PipelineExecution {
  id: string
  pipelineId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  duration?: number
  steps: StepExecution[]
  variables: Record<string, any>
  environment: Record<string, string>
  errors: string[]
  metadata: {
    totalSteps: number
    completedSteps: number
    failedSteps: number
    skippedSteps: number
  }
}

export interface StepExecution {
  stepId: string
  actionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled'
  startTime?: Date
  endTime?: Date
  duration?: number
  result?: ActionResult
  error?: string
  retryCount: number
  dependenciesMet: boolean
  conditionResult?: boolean
}

export interface PipelineContext extends ActionContext {
  pipeline: PipelineExecution
  step: StepExecution
  stepData: Record<string, any>
  pipelineVariables: Record<string, any>
}

export class ActionPipelineManager {
  private executor: ActionExecutor
  private communicationManager: ActionCommunicationManager
  private pipelines = new Map<string, PipelineConfig>()
  private executions = new Map<string, PipelineExecution>()

  constructor(executor?: ActionExecutor) {
    this.executor = executor || new ActionExecutor()
    this.communicationManager = getCommunicationManager()
  }

  /**
   * Register a pipeline definition
   */
  registerPipeline(config: PipelineConfig): void {
    debug('Registering pipeline: %s', config.name)
    
    // Validate pipeline configuration
    this.validatePipelineConfig(config)
    
    this.pipelines.set(config.name, config)
    debug('Pipeline registered: %s with %d steps', config.name, config.steps.length)
  }

  /**
   * Execute a pipeline
   */
  async executePipeline(
    pipelineName: string,
    variables: Record<string, any> = {},
    context: Partial<ActionContext> = {}
  ): Promise<PipelineExecution> {
    debug('Executing pipeline: %s', pipelineName)

    const pipeline = this.pipelines.get(pipelineName)
    if (!pipeline) {
      throw ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        `Pipeline '${pipelineName}' not found`,
        { action: pipelineName }
      )
    }

    // Create execution instance
    const executionId = this.generateExecutionId()
    const execution: PipelineExecution = {
      id: executionId,
      pipelineId: pipeline.name,
      status: 'pending',
      startTime: new Date(),
      steps: pipeline.steps.map(step => ({
        stepId: step.id,
        actionId: `${executionId}_${step.id}`,
        status: 'pending',
        retryCount: 0,
        dependenciesMet: false
      })),
      variables: { ...pipeline.variables, ...variables },
      environment: { ...pipeline.environment, ...process.env },
      errors: [],
      metadata: {
        totalSteps: pipeline.steps.length,
        completedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0
      }
    }

    this.executions.set(executionId, execution)

    try {
      execution.status = 'running'

      // Execute pipeline hooks - beforePipeline
      if (pipeline.hooks?.beforePipeline) {
        await this.executeHooks(pipeline.hooks.beforePipeline, execution, context)
      }

      // Execute pipeline steps
      await this.executeSteps(pipeline, execution, context)

      // Execute pipeline hooks - afterPipeline
      if (pipeline.hooks?.afterPipeline) {
        await this.executeHooks(pipeline.hooks.afterPipeline, execution, context)
      }

      execution.status = execution.metadata.failedSteps > 0 ? 'failed' : 'completed'
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()

      debug('Pipeline execution completed: %s [%s]', pipelineName, execution.status)
      return execution

    } catch (error: any) {
      debug('Pipeline execution failed: %s - %s', pipelineName, error.message)
      
      execution.status = 'failed'
      execution.endTime = new Date()
      execution.duration = execution.endTime!.getTime() - execution.startTime.getTime()
      execution.errors.push(error.message)

      // Execute error hooks
      if (pipeline.hooks?.onError) {
        await this.executeHooks(pipeline.hooks.onError, execution, context)
      }

      throw error
    }
  }

  /**
   * Execute pipeline steps with dependency resolution and parallel processing
   */
  private async executeSteps(
    pipeline: PipelineConfig,
    execution: PipelineExecution,
    context: Partial<ActionContext>
  ): Promise<void> {
    const stepMap = new Map(pipeline.steps.map(step => [step.id, step]))
    const stepExecutionMap = new Map(execution.steps.map(step => [step.stepId, step]))
    const completedSteps = new Set<string>()
    const runningSteps = new Set<string>()

    // Process steps until all are completed or failed
    while (completedSteps.size < pipeline.steps.length) {
      const readySteps = this.getReadySteps(pipeline.steps, stepExecutionMap, completedSteps, runningSteps)
      
      if (readySteps.length === 0) {
        // Check if there are any running steps
        if (runningSteps.size === 0) {
          // No ready steps and no running steps - deadlock or all failed
          break
        }
        // Wait for running steps to complete
        await this.waitForRunningSteps(runningSteps, stepExecutionMap)
        continue
      }

      // Execute ready steps (potentially in parallel)
      const stepPromises = readySteps.map(async (step) => {
        const stepExecution = stepExecutionMap.get(step.id)!
        runningSteps.add(step.id)

        try {
          await this.executeStep(step, stepExecution, execution, context, pipeline)
          // Don't increment here - let executeStep handle the counting
        } catch (error: any) {
          debug('Step failed: %s - %s', step.id, error.message)
          stepExecution.error = error.message
          stepExecution.status = 'failed'
          execution.metadata.failedSteps++
          execution.errors.push(`Step ${step.id}: ${error.message}`)

          if (!step.continueOnError && !pipeline.settings?.continueOnError) {
            throw error
          }
        } finally {
          runningSteps.delete(step.id)
          completedSteps.add(step.id)
        }
      })

      // Wait for steps to complete (parallel or sequential based on configuration)
      if (pipeline.settings?.parallel || readySteps.some(s => s.parallel)) {
        await Promise.allSettled(stepPromises)
      } else {
        // Execute sequentially
        for (const promise of stepPromises) {
          await promise
        }
      }
    }
  }

  /**
   * Execute a single pipeline step
   */
  private async executeStep(
    step: PipelineStep,
    stepExecution: StepExecution,
    execution: PipelineExecution,
    context: Partial<ActionContext>,
    pipeline: PipelineConfig
  ): Promise<void> {
    debug('Executing step: %s (%s)', step.id, step.name)

    stepExecution.status = 'running'
    stepExecution.startTime = new Date()

    // Check step condition
    if (step.condition) {
      const conditionResult = this.evaluateCondition(step.condition, execution.variables)
      stepExecution.conditionResult = conditionResult
      
      if (!conditionResult) {
        debug('Step condition not met, skipping: %s', step.id)
        stepExecution.status = 'skipped'
        stepExecution.endTime = new Date()
        stepExecution.duration = stepExecution.endTime.getTime() - stepExecution.startTime!.getTime()
        execution.metadata.skippedSteps++
        return
      }
    }

    // Execute step hooks - beforeStep
    if (pipeline.hooks?.beforeStep) {
      await this.executeHooks(pipeline.hooks.beforeStep, execution, context, stepExecution)
    }

    // Prepare step context
    const stepContext: Partial<ActionContext> = {
      ...context,
      variables: {
        ...execution.variables,
        ...step.parameters
      },
      communication: {
        actionId: stepExecution.actionId,
        manager: this.communicationManager,
        sendMessage: (type: string, payload: any, target?: string) => {
          this.communicationManager.sendMessage({
            source: stepExecution.actionId,
            target,
            type,
            payload: { ...payload, stepId: step.id, pipelineId: execution.pipelineId },
            timestamp: new Date()
          })
        },
        getSharedData: (key: string) => this.communicationManager.getSharedData(key),
        setSharedData: (key: string, value: any) => {
          this.communicationManager.setSharedData(key, value, stepExecution.actionId)
          // Also update pipeline variables
          execution.variables[key] = value
        },
        waitForAction: (actionId: string, timeout?: number) =>
          this.communicationManager.waitForAction(actionId, timeout),
        subscribeToMessages: (messageType: string, handler: (message: any) => void) =>
          this.communicationManager.subscribeToMessages(stepExecution.actionId, messageType, handler)
      }
    }

    // Execute the action with retries
    let lastError: Error | undefined
    const maxRetries = step.retries || pipeline.settings?.retries || 0

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        stepExecution.retryCount = attempt

        const result = await this.executor.executeInteractively(
          step.name,
          stepContext.variables || {},
          stepContext,
          {
            timeout: step.timeout || pipeline.settings?.timeout,
            actionId: stepExecution.actionId
          }
        )

        stepExecution.result = result
        stepExecution.status = result.success ? 'completed' : 'failed'
        stepExecution.endTime = new Date()
        stepExecution.duration = stepExecution.endTime.getTime() - stepExecution.startTime!.getTime()

        // Update pipeline variables with step results
        if (result.metadata) {
          for (const [key, value] of Object.entries(result.metadata)) {
            execution.variables[`${step.id}_${key}`] = value
          }
        }

        if (!result.success) {
          throw new Error(result.message || 'Step execution failed')
        }

        // Execute step hooks - afterStep
        if (pipeline.hooks?.afterStep) {
          await this.executeHooks(pipeline.hooks.afterStep, execution, context, stepExecution)
        }

        // Update completion count
        execution.metadata.completedSteps++
        debug('Step completed successfully: %s', step.id)
        return

      } catch (error: any) {
        lastError = error
        stepExecution.error = error.message

        if (attempt < maxRetries) {
          debug('Step failed, retrying (%d/%d): %s', attempt + 1, maxRetries, step.id)
          await this.delay(1000 * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }

    // All retries exhausted
    stepExecution.status = 'failed'
    stepExecution.endTime = new Date()
    stepExecution.duration = stepExecution.endTime.getTime() - stepExecution.startTime!.getTime()
    
    throw lastError || new Error(`Step ${step.id} failed after ${maxRetries} retries`)
  }

  /**
   * Get steps that are ready to execute (dependencies met)
   */
  private getReadySteps(
    steps: PipelineStep[],
    stepExecutions: Map<string, StepExecution>,
    completedSteps: Set<string>,
    runningSteps: Set<string>
  ): PipelineStep[] {
    return steps.filter(step => {
      const execution = stepExecutions.get(step.id)!
      
      // Skip if already completed, failed, or running
      if (completedSteps.has(step.id) || runningSteps.has(step.id) || 
          execution.status === 'failed' || execution.status === 'skipped') {
        return false
      }

      // Check dependencies
      if (step.dependsOn) {
        const dependenciesMet = step.dependsOn.every(depId => completedSteps.has(depId))
        execution.dependenciesMet = dependenciesMet
        return dependenciesMet
      }

      execution.dependenciesMet = true
      return true
    })
  }

  /**
   * Wait for running steps to complete
   */
  private async waitForRunningSteps(
    runningSteps: Set<string>,
    stepExecutions: Map<string, StepExecution>
  ): Promise<void> {
    return new Promise((resolve) => {
      const checkSteps = () => {
        const stillRunning = Array.from(runningSteps).some(stepId => {
          const execution = stepExecutions.get(stepId)!
          return execution.status === 'running'
        })

        if (!stillRunning) {
          resolve()
        } else {
          setTimeout(checkSteps, 100) // Check every 100ms
        }
      }
      checkSteps()
    })
  }

  /**
   * Execute pipeline hooks
   */
  private async executeHooks(
    hooks: string[],
    execution: PipelineExecution,
    context: Partial<ActionContext>,
    stepExecution?: StepExecution
  ): Promise<void> {
    for (const hookName of hooks) {
      try {
        debug('Executing hook: %s', hookName)
        
        const hookContext: Partial<ActionContext> = {
          ...context,
          variables: {
            ...execution.variables,
            pipelineId: execution.pipelineId,
            executionId: execution.id,
            stepId: stepExecution?.stepId
          }
        }

        await this.executor.executeInteractively(hookName, {}, hookContext)
      } catch (error: any) {
        debug('Hook execution failed: %s - %s', hookName, error.message)
        // Continue with other hooks even if one fails
      }
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple expression evaluation - in production, use a proper expression parser
      let expression = condition.trim()
      
      // Replace variable references
      for (const [name, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${name}\\b`, 'g')
        expression = expression.replace(regex, JSON.stringify(value))
      }
      
      // Evaluate safely
      return Boolean(new Function('return ' + expression)())
    } catch (error) {
      debug('Condition evaluation failed: %s', condition)
      return false
    }
  }

  /**
   * Validate pipeline configuration
   */
  private validatePipelineConfig(config: PipelineConfig): void {
    if (!config.name) {
      throw ErrorHandler.createError(
        ErrorCode.VALIDATION_ERROR,
        'Pipeline name is required'
      )
    }

    if (!config.steps || config.steps.length === 0) {
      throw ErrorHandler.createError(
        ErrorCode.VALIDATION_ERROR,
        'Pipeline must have at least one step'
      )
    }

    // Validate step IDs are unique
    const stepIds = new Set<string>()
    for (const step of config.steps) {
      if (!step.id) {
        throw ErrorHandler.createError(
          ErrorCode.VALIDATION_ERROR,
          'Step ID is required'
        )
      }

      if (stepIds.has(step.id)) {
        throw ErrorHandler.createError(
          ErrorCode.VALIDATION_ERROR,
          `Duplicate step ID: ${step.id}`
        )
      }
      stepIds.add(step.id)

      if (!step.name) {
        throw ErrorHandler.createError(
          ErrorCode.VALIDATION_ERROR,
          `Step ${step.id} must have an action name`
        )
      }
    }

    // Validate dependencies
    for (const step of config.steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            throw ErrorHandler.createError(
              ErrorCode.VALIDATION_ERROR,
              `Step ${step.id} depends on unknown step: ${depId}`
            )
          }
        }
      }
    }

    // Check for circular dependencies
    this.detectCircularDependencies(config.steps)
  }

  /**
   * Detect circular dependencies in pipeline steps
   */
  private detectCircularDependencies(steps: PipelineStep[]): void {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const stepMap = new Map(steps.map(step => [step.id, step]))

    const visit = (stepId: string): void => {
      if (visiting.has(stepId)) {
        throw ErrorHandler.createError(
          ErrorCode.VALIDATION_ERROR,
          `Circular dependency detected involving step: ${stepId}`
        )
      }

      if (visited.has(stepId)) {
        return
      }

      visiting.add(stepId)
      const step = stepMap.get(stepId)
      
      if (step?.dependsOn) {
        for (const depId of step.dependsOn) {
          visit(depId)
        }
      }

      visiting.delete(stepId)
      visited.add(stepId)
    }

    for (const step of steps) {
      visit(step.id)
    }
  }

  /**
   * Get pipeline definition
   */
  getPipeline(name: string): PipelineConfig | undefined {
    return this.pipelines.get(name)
  }

  /**
   * Get all registered pipelines
   */
  getAllPipelines(): PipelineConfig[] {
    return Array.from(this.pipelines.values())
  }

  /**
   * Get pipeline execution
   */
  getExecution(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get all executions
   */
  getAllExecutions(): PipelineExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Get executions by status
   */
  getExecutionsByStatus(status: PipelineExecution['status']): PipelineExecution[] {
    return Array.from(this.executions.values()).filter(exec => exec.status === status)
  }

  /**
   * Cancel a running pipeline execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId)
    if (!execution || execution.status !== 'running') {
      return false
    }

    debug('Cancelling pipeline execution: %s', executionId)
    execution.status = 'cancelled'
    execution.endTime = new Date()
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime()

    // Cancel running steps
    for (const step of execution.steps) {
      if (step.status === 'running') {
        step.status = 'cancelled'
        step.endTime = new Date()
        step.duration = step.endTime.getTime() - (step.startTime?.getTime() || execution.startTime.getTime())
      }
    }

    return true
  }

  /**
   * Clear execution history
   */
  clearExecutions(): void {
    debug('Clearing pipeline execution history')
    this.executions.clear()
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    totalPipelines: number
    totalExecutions: number
    runningExecutions: number
    completedExecutions: number
    failedExecutions: number
  } {
    const executions = Array.from(this.executions.values())
    
    return {
      totalPipelines: this.pipelines.size,
      totalExecutions: executions.length,
      runningExecutions: executions.filter(e => e.status === 'running').length,
      completedExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length
    }
  }
}

// Global pipeline manager instance
let globalPipelineManager: ActionPipelineManager | undefined

/**
 * Get or create the global pipeline manager
 */
export function getPipelineManager(executor?: ActionExecutor): ActionPipelineManager {
  if (!globalPipelineManager) {
    globalPipelineManager = new ActionPipelineManager(executor)
  }
  return globalPipelineManager
}

/**
 * Set the global pipeline manager
 */
export function setPipelineManager(manager: ActionPipelineManager): void {
  globalPipelineManager = manager
}

/**
 * Clear the global pipeline manager
 */
export function clearPipelineManager(): void {
  globalPipelineManager = undefined
}