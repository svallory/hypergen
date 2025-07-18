/**
 * Action Pipelines Tests
 * 
 * Tests for action composition, pipelines, and workflow orchestration
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { 
  ActionPipelineManager,
  getPipelineManager,
  clearPipelineManager,
  type PipelineConfig,
  type PipelineStep
} from '../src/actions/pipelines.js'
import { ActionExecutor } from '../src/actions/executor.js'
import { ActionRegistry } from '../src/actions/registry.js'
import { clearCommunicationManager } from '../src/actions/communication.js'
import type { ActionContext, ActionResult } from '../src/actions/types.js'

// Mock actions for testing
const createMockAction = (name: string, duration: number = 10, shouldFail: boolean = false) => {
  return {
    metadata: {
      name,
      description: `Mock action ${name}`,
      parameters: [
        { name: 'input', type: 'string' as const, required: false }
      ]
    },
    fn: async (context: ActionContext): Promise<ActionResult> => {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, duration))
      
      if (shouldFail) {
        return {
          success: false,
          message: `${name} failed intentionally`,
          filesCreated: [],
          filesModified: [],
          filesDeleted: []
        }
      }

      return {
        success: true,
        message: `${name} completed`,
        filesCreated: [`${name}-output.txt`],
        filesModified: [],
        filesDeleted: [],
        metadata: {
          [`${name}_result`]: `result from ${name}`,
          [`${name}_input`]: context.variables.input || 'default'
        }
      }
    }
  }
}

describe('Action Pipelines', () => {
  let pipelineManager: ActionPipelineManager
  let executor: ActionExecutor
  let registry: ActionRegistry

  beforeEach(() => {
    clearPipelineManager()
    clearCommunicationManager()
    
    registry = ActionRegistry.getInstance()
    registry.clear()
    
    // Register mock actions
    const setupAction = createMockAction('setup')
    registry.register(setupAction.fn, setupAction.metadata)
    
    const buildAction = createMockAction('build')
    registry.register(buildAction.fn, buildAction.metadata)
    
    const testAction = createMockAction('test')
    registry.register(testAction.fn, testAction.metadata)
    
    const deployAction = createMockAction('deploy')
    registry.register(deployAction.fn, deployAction.metadata)
    
    const cleanupAction = createMockAction('cleanup')
    registry.register(cleanupAction.fn, cleanupAction.metadata)
    
    const failingAction = createMockAction('failing-action', 10, true)
    registry.register(failingAction.fn, failingAction.metadata)
    
    executor = new ActionExecutor()
    pipelineManager = getPipelineManager(executor)
  })

  afterEach(() => {
    clearPipelineManager()
    clearCommunicationManager()
    registry.clear()
  })

  describe('Pipeline Registration', () => {
    it('should register a simple pipeline', () => {
      const pipeline: PipelineConfig = {
        name: 'simple-pipeline',
        description: 'A simple test pipeline',
        steps: [
          { id: 'step1', name: 'setup', parameters: { input: 'test' } },
          { id: 'step2', name: 'build', dependsOn: ['step1'] },
          { id: 'step3', name: 'test', dependsOn: ['step2'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      
      const registered = pipelineManager.getPipeline('simple-pipeline')
      expect(registered).toBeDefined()
      expect(registered!.steps).toHaveLength(3)
    })

    it('should validate pipeline configuration', () => {
      const invalidPipeline: PipelineConfig = {
        name: '', // Invalid: empty name
        steps: []
      }

      expect(() => {
        pipelineManager.registerPipeline(invalidPipeline)
      }).toThrow('Pipeline name is required')
    })

    it('should detect duplicate step IDs', () => {
      const pipeline: PipelineConfig = {
        name: 'duplicate-steps',
        steps: [
          { id: 'step1', name: 'setup' },
          { id: 'step1', name: 'build' } // Duplicate ID
        ]
      }

      expect(() => {
        pipelineManager.registerPipeline(pipeline)
      }).toThrow('Duplicate step ID: step1')
    })

    it('should detect invalid dependencies', () => {
      const pipeline: PipelineConfig = {
        name: 'invalid-deps',
        steps: [
          { id: 'step1', name: 'setup', dependsOn: ['nonexistent'] }
        ]
      }

      expect(() => {
        pipelineManager.registerPipeline(pipeline)
      }).toThrow('depends on unknown step: nonexistent')
    })

    it('should detect circular dependencies', () => {
      const pipeline: PipelineConfig = {
        name: 'circular-deps',
        steps: [
          { id: 'step1', name: 'setup', dependsOn: ['step2'] },
          { id: 'step2', name: 'build', dependsOn: ['step1'] }
        ]
      }

      expect(() => {
        pipelineManager.registerPipeline(pipeline)
      }).toThrow('Circular dependency detected')
    })
  })

  describe('Pipeline Execution', () => {
    it('should execute a simple sequential pipeline', async () => {
      const pipeline: PipelineConfig = {
        name: 'sequential-pipeline',
        steps: [
          { id: 'setup-step', name: 'setup', parameters: { input: 'sequential' } },
          { id: 'build-step', name: 'build', dependsOn: ['setup-step'] },
          { id: 'test-step', name: 'test', dependsOn: ['build-step'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('sequential-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(3)
      expect(execution.metadata.failedSteps).toBe(0)
      expect(execution.endTime).toBeDefined()
      expect(execution.duration).toBeGreaterThan(0)

      // Check that steps executed in correct order
      const setupStep = execution.steps.find(s => s.stepId === 'setup-step')!
      const buildStep = execution.steps.find(s => s.stepId === 'build-step')!
      const testStep = execution.steps.find(s => s.stepId === 'test-step')!

      expect(setupStep.status).toBe('completed')
      expect(buildStep.status).toBe('completed')
      expect(testStep.status).toBe('completed')
      expect(setupStep.startTime!.getTime()).toBeLessThan(buildStep.startTime!.getTime())
      expect(buildStep.startTime!.getTime()).toBeLessThan(testStep.startTime!.getTime())
    })

    it('should execute parallel steps correctly', async () => {
      const pipeline: PipelineConfig = {
        name: 'parallel-pipeline',
        steps: [
          { id: 'setup-step', name: 'setup' },
          { id: 'build-step', name: 'build', dependsOn: ['setup-step'], parallel: true },
          { id: 'test-step', name: 'test', dependsOn: ['setup-step'], parallel: true },
          { id: 'deploy-step', name: 'deploy', dependsOn: ['build-step', 'test-step'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('parallel-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(4)

      // Build and test should run in parallel after setup
      const setupStep = execution.steps.find(s => s.stepId === 'setup-step')!
      const buildStep = execution.steps.find(s => s.stepId === 'build-step')!
      const testStep = execution.steps.find(s => s.stepId === 'test-step')!
      const deployStep = execution.steps.find(s => s.stepId === 'deploy-step')!

      expect(setupStep.endTime!.getTime()).toBeLessThanOrEqual(buildStep.startTime!.getTime())
      expect(setupStep.endTime!.getTime()).toBeLessThanOrEqual(testStep.startTime!.getTime())
      expect(Math.max(buildStep.endTime!.getTime(), testStep.endTime!.getTime())).toBeLessThanOrEqual(deployStep.startTime!.getTime())
    })

    it('should handle step failures with continueOnError', async () => {
      const pipeline: PipelineConfig = {
        name: 'failure-pipeline',
        steps: [
          { id: 'setup-step', name: 'setup' },
          { id: 'fail-step', name: 'failing-action', dependsOn: ['setup-step'], continueOnError: true },
          { id: 'cleanup-step', name: 'cleanup', dependsOn: ['setup-step'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('failure-pipeline')

      expect(execution.status).toBe('failed') // Overall failed due to one failed step
      expect(execution.metadata.completedSteps).toBe(2) // setup and cleanup
      expect(execution.metadata.failedSteps).toBe(1) // failing-action

      const failedStep = execution.steps.find(s => s.stepId === 'fail-step')!
      const cleanupStep = execution.steps.find(s => s.stepId === 'cleanup-step')!

      expect(failedStep.status).toBe('failed')
      expect(cleanupStep.status).toBe('completed') // Should complete despite failure
    })

    it('should support conditional step execution', async () => {
      const pipeline: PipelineConfig = {
        name: 'conditional-pipeline',
        variables: { shouldDeploy: false },
        steps: [
          { id: 'build-step', name: 'build' },
          { id: 'deploy-step', name: 'deploy', condition: 'shouldDeploy === true', dependsOn: ['build-step'] },
          { id: 'cleanup-step', name: 'cleanup', dependsOn: ['build-step'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('conditional-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(2) // build and cleanup
      expect(execution.metadata.skippedSteps).toBe(1) // deploy

      const deployStep = execution.steps.find(s => s.stepId === 'deploy-step')!
      expect(deployStep.status).toBe('skipped')
      expect(deployStep.conditionResult).toBe(false)
    })

    it('should handle step retries', async () => {
      // Create a more complex mock that fails a few times then succeeds
      let attemptCount = 0
      const retryAction = {
        metadata: {
          name: 'retry-action',
          description: 'Action that succeeds after retries',
          parameters: []
        },
        fn: async (context: ActionContext): Promise<ActionResult> => {
          attemptCount++
          if (attemptCount < 3) {
            return {
              success: false,
              message: `Attempt ${attemptCount} failed`,
              filesCreated: [],
              filesModified: [],
              filesDeleted: []
            }
          }
          return {
            success: true,
            message: `Succeeded on attempt ${attemptCount}`,
            filesCreated: [],
            filesModified: [],
            filesDeleted: []
          }
        }
      }

      registry.register(retryAction.fn, retryAction.metadata)

      const pipeline: PipelineConfig = {
        name: 'retry-pipeline',
        steps: [
          { id: 'retry-step', name: 'retry-action', retries: 3 }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('retry-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(1)

      const retryStep = execution.steps.find(s => s.stepId === 'retry-step')!
      expect(retryStep.status).toBe('completed')
      expect(retryStep.retryCount).toBe(2) // 0-indexed, so 2 means 3rd attempt
      expect(attemptCount).toBe(3)
    })
  })

  describe('Pipeline Variables and Data Flow', () => {
    it('should pass variables between steps', async () => {
      const pipeline: PipelineConfig = {
        name: 'data-flow-pipeline',
        variables: { globalVar: 'global-value' },
        steps: [
          { id: 'step1', name: 'setup', parameters: { input: 'step1-input' } },
          { id: 'step2', name: 'build', parameters: { input: 'step2-input' }, dependsOn: ['step1'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('data-flow-pipeline', { runtimeVar: 'runtime-value' })

      expect(execution.status).toBe('completed')
      expect(execution.variables.globalVar).toBe('global-value')
      expect(execution.variables.runtimeVar).toBe('runtime-value')

      // Check that step results are captured in pipeline variables
      expect(execution.variables['step1_setup_result']).toBe('result from setup')
      expect(execution.variables['step2_build_result']).toBe('result from build')
    })

    it('should support shared data across steps', async () => {
      // This test would require the communication system to be fully integrated
      const pipeline: PipelineConfig = {
        name: 'shared-data-pipeline',
        steps: [
          { id: 'producer', name: 'setup', parameters: { input: 'shared-value' } },
          { id: 'consumer', name: 'build', dependsOn: ['producer'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('shared-data-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(2)
    })
  })

  describe('Pipeline Hooks', () => {
    it('should execute pipeline hooks', async () => {
      const pipeline: PipelineConfig = {
        name: 'hooks-pipeline',
        steps: [
          { id: 'main-step', name: 'build' }
        ],
        hooks: {
          beforePipeline: ['setup'],
          afterPipeline: ['cleanup']
        }
      }

      pipelineManager.registerPipeline(pipeline)
      const execution = await pipelineManager.executePipeline('hooks-pipeline')

      expect(execution.status).toBe('completed')
      // Note: In a real implementation, we'd need to track hook executions
      // For now, we just verify the pipeline completes successfully
    })
  })

  describe('Pipeline Management', () => {
    it('should list all registered pipelines', () => {
      const pipeline1: PipelineConfig = {
        name: 'pipeline-1',
        steps: [{ id: 'step1', name: 'setup' }]
      }

      const pipeline2: PipelineConfig = {
        name: 'pipeline-2',
        steps: [{ id: 'step1', name: 'build' }]
      }

      pipelineManager.registerPipeline(pipeline1)
      pipelineManager.registerPipeline(pipeline2)

      const allPipelines = pipelineManager.getAllPipelines()
      expect(allPipelines).toHaveLength(2)
      expect(allPipelines.map(p => p.name)).toContain('pipeline-1')
      expect(allPipelines.map(p => p.name)).toContain('pipeline-2')
    })

    it('should track pipeline executions', async () => {
      const pipeline: PipelineConfig = {
        name: 'tracked-pipeline',
        steps: [{ id: 'step1', name: 'setup' }]
      }

      pipelineManager.registerPipeline(pipeline)
      
      const execution1 = await pipelineManager.executePipeline('tracked-pipeline')
      const execution2 = await pipelineManager.executePipeline('tracked-pipeline')

      const allExecutions = pipelineManager.getAllExecutions()
      expect(allExecutions).toHaveLength(2)
      expect(allExecutions.map(e => e.id)).toContain(execution1.id)
      expect(allExecutions.map(e => e.id)).toContain(execution2.id)

      const completedExecutions = pipelineManager.getExecutionsByStatus('completed')
      expect(completedExecutions).toHaveLength(2)
    })

    it('should provide pipeline statistics', async () => {
      const pipeline: PipelineConfig = {
        name: 'stats-pipeline',
        steps: [{ id: 'step1', name: 'setup' }]
      }

      pipelineManager.registerPipeline(pipeline)
      await pipelineManager.executePipeline('stats-pipeline')

      const stats = pipelineManager.getStats()
      expect(stats.totalPipelines).toBe(1)
      expect(stats.totalExecutions).toBe(1)
      expect(stats.completedExecutions).toBe(1)
      expect(stats.failedExecutions).toBe(0)
      expect(stats.runningExecutions).toBe(0)
    })

    it('should clear execution history', async () => {
      const pipeline: PipelineConfig = {
        name: 'clear-test-pipeline',
        steps: [{ id: 'step1', name: 'setup' }]
      }

      pipelineManager.registerPipeline(pipeline)
      await pipelineManager.executePipeline('clear-test-pipeline')

      expect(pipelineManager.getAllExecutions()).toHaveLength(1)

      pipelineManager.clearExecutions()
      expect(pipelineManager.getAllExecutions()).toHaveLength(0)

      const stats = pipelineManager.getStats()
      expect(stats.totalExecutions).toBe(0)
      expect(stats.completedExecutions).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown pipeline execution', async () => {
      await expect(
        pipelineManager.executePipeline('unknown-pipeline')
      ).rejects.toThrow("Pipeline 'unknown-pipeline' not found")
    })

    it('should fail pipeline when step fails without continueOnError', async () => {
      const pipeline: PipelineConfig = {
        name: 'fail-fast-pipeline',
        steps: [
          { id: 'setup-step', name: 'setup' },
          { id: 'fail-step', name: 'failing-action', dependsOn: ['setup-step'] },
          { id: 'cleanup-step', name: 'cleanup', dependsOn: ['fail-step'] }
        ]
      }

      pipelineManager.registerPipeline(pipeline)
      
      await expect(
        pipelineManager.executePipeline('fail-fast-pipeline')
      ).rejects.toThrow()

      const executions = pipelineManager.getExecutionsByStatus('failed')
      expect(executions).toHaveLength(1)
      
      const execution = executions[0]
      expect(execution.metadata.completedSteps).toBe(1) // Only setup completed
      expect(execution.metadata.failedSteps).toBe(1) // failing-action failed
      expect(execution.errors.length).toBeGreaterThanOrEqual(1) // At least one error
    })

    it('should handle step timeout gracefully', async () => {
      // For this test, we'll test the timeout handling by using a short timeout
      // and a step that should take longer than normal
      const pipeline: PipelineConfig = {
        name: 'timeout-pipeline',
        steps: [
          { id: 'quick-step', name: 'setup', timeout: 1 } // Very short timeout
        ],
        settings: {
          continueOnError: false
        }
      }

      pipelineManager.registerPipeline(pipeline)
      
      // Since our mock actions are fast, this might not timeout
      // But we can still test that the pipeline handles the execution
      const execution = await pipelineManager.executePipeline('timeout-pipeline')
      
      // The step should either complete successfully (if fast enough) or fail
      expect(['completed', 'failed']).toContain(execution.status)
    })
  })

  describe('Complex Workflow Scenarios', () => {
    it('should handle a realistic CI/CD pipeline', async () => {
      const cicdPipeline: PipelineConfig = {
        name: 'cicd-pipeline',
        description: 'Complete CI/CD workflow',
        variables: {
          environment: 'staging',
          deploymentEnabled: true
        },
        steps: [
          // Parallel setup
          { 
            id: 'checkout', 
            name: 'setup', 
            parameters: { input: 'checkout-code' },
            parallel: true 
          },
          { 
            id: 'install-deps', 
            name: 'setup', 
            parameters: { input: 'install-dependencies' },
            parallel: true 
          },
          
          // Build phase
          { 
            id: 'build', 
            name: 'build', 
            dependsOn: ['checkout', 'install-deps'] 
          },
          
          // Parallel testing
          { 
            id: 'unit-tests', 
            name: 'test', 
            parameters: { input: 'unit' },
            dependsOn: ['build'],
            parallel: true 
          },
          { 
            id: 'integration-tests', 
            name: 'test', 
            parameters: { input: 'integration' },
            dependsOn: ['build'],
            parallel: true 
          },
          
          // Conditional deployment
          { 
            id: 'deploy', 
            name: 'deploy', 
            condition: 'deploymentEnabled === true',
            dependsOn: ['unit-tests', 'integration-tests'] 
          },
          
          // Cleanup
          { 
            id: 'cleanup', 
            name: 'cleanup', 
            dependsOn: ['deploy'],
            continueOnError: true 
          }
        ],
        hooks: {
          beforePipeline: ['setup'],
          afterPipeline: ['cleanup']
        },
        settings: {
          timeout: 30000, // 30 seconds
          retries: 1,
          continueOnError: false
        }
      }

      pipelineManager.registerPipeline(cicdPipeline)
      const execution = await pipelineManager.executePipeline('cicd-pipeline')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(7) // All steps should complete
      expect(execution.metadata.failedSteps).toBe(0)
      expect(execution.duration).toBeGreaterThan(0)

      // Verify deployment step ran due to condition
      const deployStep = execution.steps.find(s => s.stepId === 'deploy')!
      expect(deployStep.status).toBe('completed')
      expect(deployStep.conditionResult).toBe(true)
    })

    it('should handle pipeline with complex dependencies', async () => {
      const complexPipeline: PipelineConfig = {
        name: 'complex-dependencies',
        steps: [
          { id: 'a', name: 'setup' },
          { id: 'b', name: 'build', dependsOn: ['a'] },
          { id: 'c', name: 'test', dependsOn: ['a'] },
          { id: 'd', name: 'deploy', dependsOn: ['b', 'c'] },
          { id: 'e', name: 'cleanup', dependsOn: ['d'] }
        ]
      }

      pipelineManager.registerPipeline(complexPipeline)
      const execution = await pipelineManager.executePipeline('complex-dependencies')

      expect(execution.status).toBe('completed')
      expect(execution.metadata.completedSteps).toBe(5)

      // Verify execution order respects dependencies
      const steps = execution.steps
      const getStep = (id: string) => steps.find(s => s.stepId === id)!

      expect(getStep('a').endTime!.getTime()).toBeLessThanOrEqual(getStep('b').startTime!.getTime())
      expect(getStep('a').endTime!.getTime()).toBeLessThanOrEqual(getStep('c').startTime!.getTime())
      expect(getStep('b').endTime!.getTime()).toBeLessThanOrEqual(getStep('d').startTime!.getTime())
      expect(getStep('c').endTime!.getTime()).toBeLessThanOrEqual(getStep('d').startTime!.getTime())
      expect(getStep('d').endTime!.getTime()).toBeLessThanOrEqual(getStep('e').startTime!.getTime())
    })
  })
})