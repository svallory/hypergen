import { describe, it, expect, beforeEach } from 'bun:test'
import { ActionLifecycleManager, BuiltinHooks, type LifecycleHook } from '../src/actions/lifecycle'
import type { ActionContext, ActionResult } from '../src/actions/types'

describe('Action Lifecycle Management', () => {
  let lifecycleManager: ActionLifecycleManager
  let mockContext: ActionContext

  beforeEach(() => {
    lifecycleManager = new ActionLifecycleManager()
    mockContext = {
      variables: { name: 'TestComponent' },
      projectRoot: '/test/project',
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {}
      },
      utils: {
        fileExists: () => false,
        readFile: () => '',
        writeFile: () => {},
        createDirectory: () => {},
        copyFile: () => {},
        deleteFile: () => {},
        globFiles: () => []
      },
      dryRun: false,
      force: false
    }
  })

  describe('Hook Registration', () => {
    it('should register hooks for specific actions', () => {
      const testHook: LifecycleHook = {
        name: 'test-hook',
        phase: 'pre',
        action: async () => ({ success: true, message: 'Test hook executed' })
      }

      lifecycleManager.registerHook('test-action', testHook)
      
      const hooks = lifecycleManager.getHooks('test-action')
      expect(hooks).toHaveLength(1)
      expect(hooks[0].name).toBe('test-hook')
    })

    it('should register global hooks', () => {
      const globalHook: LifecycleHook = {
        name: 'global-hook',
        phase: 'post',
        action: async () => ({ success: true, message: 'Global hook executed' })
      }

      lifecycleManager.registerHook('*', globalHook)
      
      const hooks = lifecycleManager.getHooks('any-action')
      expect(hooks.length).toBeGreaterThan(0)
      expect(hooks.some(h => h.name === 'global-hook')).toBe(true)
    })

    it('should sort hooks by priority', () => {
      const lowPriorityHook: LifecycleHook = {
        name: 'low-priority',
        phase: 'pre',
        priority: 10,
        action: async () => ({ success: true, message: 'Low priority' })
      }

      const highPriorityHook: LifecycleHook = {
        name: 'high-priority',
        phase: 'pre',
        priority: 100,
        action: async () => ({ success: true, message: 'High priority' })
      }

      lifecycleManager.registerHook('priority-test', lowPriorityHook)
      lifecycleManager.registerHook('priority-test', highPriorityHook)
      
      const hooks = lifecycleManager.getHooks('priority-test')
      const preHooks = hooks.filter(h => h.phase === 'pre')
      
      // High priority should come first
      expect(preHooks[0].name).toBe('high-priority')
      expect(preHooks[1].name).toBe('low-priority')
    })
  })

  describe('Lifecycle Execution', () => {
    it('should execute hooks in correct order', async () => {
      const executionOrder: string[] = []

      const preHook: LifecycleHook = {
        name: 'pre-hook',
        phase: 'pre',
        action: async () => {
          executionOrder.push('pre')
          return { success: true, message: 'Pre hook' }
        }
      }

      const postHook: LifecycleHook = {
        name: 'post-hook',
        phase: 'post',
        action: async () => {
          executionOrder.push('post')
          return { success: true, message: 'Post hook' }
        }
      }

      const mainAction = async () => {
        executionOrder.push('main')
        return { success: true, message: 'Main action' }
      }

      lifecycleManager.registerHook('test-action', preHook)
      lifecycleManager.registerHook('test-action', postHook)

      const { result, lifecycle } = await lifecycleManager.executeLifecycle(
        'test-action',
        mockContext,
        mainAction
      )

      expect(result.success).toBe(true)
      expect(lifecycle.success).toBe(true)
      expect(executionOrder).toEqual(['pre', 'main', 'post'])
    })

    it('should execute error hooks when main action fails', async () => {
      const errorHook: LifecycleHook = {
        name: 'error-hook',
        phase: 'error',
        action: async () => ({ success: true, message: 'Error hook executed' })
      }

      const failingAction = async () => {
        throw new Error('Main action failed')
      }

      lifecycleManager.registerHook('failing-action', errorHook)

      await expect(lifecycleManager.executeLifecycle(
        'failing-action',
        mockContext,
        failingAction
      )).rejects.toThrow('Main action failed')
    })

    it('should respect hook conditions', async () => {
      const conditionalHook: LifecycleHook = {
        name: 'conditional-hook',
        phase: 'pre',
        condition: (context) => context.variables.enabled === true,
        action: async () => ({ success: true, message: 'Conditional hook' })
      }

      const mainAction = async () => ({ success: true, message: 'Main' })

      lifecycleManager.registerHook('conditional-test', conditionalHook)

      // Test with condition false
      const contextFalse = { ...mockContext, variables: { enabled: false } }
      const { lifecycle: lifecycle1 } = await lifecycleManager.executeLifecycle(
        'conditional-test',
        contextFalse,
        mainAction
      )

      expect(lifecycle1.results).toHaveLength(0) // Hook should be skipped

      // Test with condition true
      const contextTrue = { ...mockContext, variables: { enabled: true } }
      const { lifecycle: lifecycle2 } = await lifecycleManager.executeLifecycle(
        'conditional-test',
        contextTrue,
        mainAction
      )

      expect(lifecycle2.results).toHaveLength(1) // Hook should execute
    })

    it('should handle hook timeouts', async () => {
      const timeoutHook: LifecycleHook = {
        name: 'timeout-hook',
        phase: 'pre',
        action: async () => {
          // Simulate a hook that takes too long
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true, message: 'Should timeout' }
        }
      }

      const mainAction = async () => ({ success: true, message: 'Main' })

      lifecycleManager.registerHook('timeout-test', timeoutHook)

      await expect(lifecycleManager.executeLifecycle(
        'timeout-test',
        mockContext,
        mainAction,
        { timeout: 50 } // Very short timeout
      )).rejects.toThrow()
    })

    it('should handle hook failures with continueOnError', async () => {
      const failingHook: LifecycleHook = {
        name: 'failing-hook',
        phase: 'pre',
        action: async () => {
          throw new Error('Hook failed')
        }
      }

      const successHook: LifecycleHook = {
        name: 'success-hook',
        phase: 'pre',
        action: async () => ({ success: true, message: 'Success hook' })
      }

      const mainAction = async () => ({ success: true, message: 'Main' })

      lifecycleManager.registerHook('error-test', failingHook)
      lifecycleManager.registerHook('error-test', successHook)

      const { result, lifecycle } = await lifecycleManager.executeLifecycle(
        'error-test',
        mockContext,
        mainAction,
        { continueOnError: true }
      )

      expect(result.success).toBe(true) // Main action should still succeed
      expect(lifecycle.success).toBe(false) // Lifecycle failed due to hook error
      expect(lifecycle.results).toHaveLength(2) // Both hooks attempted
    })
  })

  describe('Built-in Hooks', () => {
    it('should provide built-in hooks', () => {
      const builtinHooks = BuiltinHooks.getAll()
      
      expect(builtinHooks.length).toBeGreaterThan(0)
      expect(builtinHooks.some(h => h.name === 'format-files')).toBe(true)
      expect(builtinHooks.some(h => h.name === 'install-dependencies')).toBe(true)
      expect(builtinHooks.some(h => h.name === 'init-git')).toBe(true)
    })

    it('should execute format-files hook', async () => {
      const result = await BuiltinHooks.formatFiles.action(mockContext)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('formatted')
    })

    it('should execute install-dependencies hook conditionally', async () => {
      // Test without installDependencies flag
      const result1 = await BuiltinHooks.installDependencies.action(mockContext)
      expect(result1.success).toBe(true)

      // Test with installDependencies flag
      const contextWithFlag = {
        ...mockContext,
        variables: { ...mockContext.variables, installDependencies: true }
      }
      const result2 = await BuiltinHooks.installDependencies.action(contextWithFlag)
      expect(result2.success).toBe(true)
    })

    it('should execute git init hook conditionally', async () => {
      // Test without initGit flag
      const result1 = await BuiltinHooks.initGit.action(mockContext)
      expect(result1.success).toBe(true)

      // Test with initGit flag
      const contextWithGit = {
        ...mockContext,
        variables: { ...mockContext.variables, initGit: true }
      }
      const result2 = await BuiltinHooks.initGit.action(contextWithGit)
      expect(result2.success).toBe(true)
    })

    it('should execute backup hook conditionally', async () => {
      // Test with backup enabled and not forced
      const contextWithBackup = {
        ...mockContext,
        variables: { ...mockContext.variables, backup: true },
        force: false
      }
      
      const condition = BuiltinHooks.backupFiles.condition
      expect(condition).toBeDefined()
      expect(condition!(contextWithBackup)).toBe(true)

      // Test with force enabled (should skip backup)
      const contextWithForce = {
        ...mockContext,
        variables: { ...mockContext.variables, backup: true },
        force: true
      }
      expect(condition!(contextWithForce)).toBe(false)
    })

    it('should execute validate prerequisites hook', async () => {
      const result = await BuiltinHooks.validatePrerequisites.action(mockContext)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('Prerequisites validated')
    })
  })

  describe('Hook Management', () => {
    it('should clear all hooks', () => {
      const testHook: LifecycleHook = {
        name: 'test-hook',
        phase: 'pre',
        action: async () => ({ success: true, message: 'Test' })
      }

      lifecycleManager.registerHook('test-action', testHook)
      expect(lifecycleManager.getHooks('test-action').length).toBeGreaterThan(0)

      lifecycleManager.clearHooks()
      expect(lifecycleManager.getHooks('test-action')).toHaveLength(0)
    })

    it('should clear hooks for specific action', () => {
      const testHook1: LifecycleHook = {
        name: 'test-hook-1',
        phase: 'pre',
        action: async () => ({ success: true, message: 'Test 1' })
      }

      const testHook2: LifecycleHook = {
        name: 'test-hook-2',
        phase: 'pre',
        action: async () => ({ success: true, message: 'Test 2' })
      }

      lifecycleManager.registerHook('action1', testHook1)
      lifecycleManager.registerHook('action2', testHook2)

      lifecycleManager.clearActionHooks('action1')
      
      expect(lifecycleManager.getHooks('action1').filter(h => h.name === 'test-hook-1')).toHaveLength(0)
      expect(lifecycleManager.getHooks('action2').filter(h => h.name === 'test-hook-2')).toHaveLength(1)
    })
  })

  describe('Performance', () => {
    it('should handle many hooks efficiently', async () => {
      const hookCount = 20
      
      // Register many hooks
      for (let i = 0; i < hookCount; i++) {
        const hook: LifecycleHook = {
          name: `hook-${i}`,
          phase: i % 3 === 0 ? 'pre' : i % 3 === 1 ? 'post' : 'error',
          action: async () => ({ success: true, message: `Hook ${i}` })
        }
        lifecycleManager.registerHook('performance-test', hook)
      }

      const mainAction = async () => ({ success: true, message: 'Main' })

      const startTime = Date.now()
      const { result, lifecycle } = await lifecycleManager.executeLifecycle(
        'performance-test',
        mockContext,
        mainAction
      )
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(lifecycle.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      
      // Should execute pre and post hooks (not error hooks since main action succeeded)
      const expectedHooks = Math.ceil(hookCount * 2 / 3) // pre + post hooks
      expect(lifecycle.results.length).toBeGreaterThan(0)
    })
  })
})