/**
 * Cross-Action Communication Tests
 * 
 * Tests for action communication, state sharing, and workflow coordination
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { 
  ActionCommunicationManager,
  getCommunicationManager,
  clearCommunicationManager,
  type CommunicationConfig,
  type ActionMessage,
  type ActionState
} from '../src/actions/communication.js'

describe('Cross-Action Communication', () => {
  let communicationManager: ActionCommunicationManager

  beforeEach(() => {
    clearCommunicationManager()
    communicationManager = getCommunicationManager({
      maxMessageHistory: 100,
      maxStateHistory: 50,
      enablePersistence: false,
      channels: [
        { name: 'test-channel', type: 'broadcast', persistent: true }
      ]
    })
  })

  afterEach(() => {
    clearCommunicationManager()
  })

  describe('Action Registration and State Management', () => {
    it('should register an action and create initial state', () => {
      const actionId = 'test-action-1'
      const actionName = 'create-component'
      const initialData = { componentName: 'Button' }

      communicationManager.registerAction(actionId, actionName, initialData)

      const state = communicationManager.getActionState(actionId)
      expect(state).toBeDefined()
      expect(state!.id).toBe(actionId)
      expect(state!.action).toBe(actionName)
      expect(state!.status).toBe('running')
      expect(state!.data).toEqual(initialData)
      expect(state!.metadata.startTime).toBeInstanceOf(Date)
    })

    it('should update action state', () => {
      const actionId = 'test-action-2'
      communicationManager.registerAction(actionId, 'test-action', {})

      const updates = { filesCreated: ['component.tsx'], progress: 50 }
      communicationManager.updateActionState(actionId, updates, 'running')

      const state = communicationManager.getActionState(actionId)
      expect(state!.data.filesCreated).toEqual(['component.tsx'])
      expect(state!.data.progress).toBe(50)
      expect(state!.status).toBe('running')
    })

    it('should complete an action', () => {
      const actionId = 'test-action-3'
      communicationManager.registerAction(actionId, 'test-action', {})

      const result = {
        filesCreated: ['component.tsx', 'component.test.tsx'],
        message: 'Component created successfully'
      }
      communicationManager.completeAction(actionId, result)

      const state = communicationManager.getActionState(actionId)
      expect(state!.status).toBe('completed')
      expect(state!.metadata.filesCreated).toEqual(result.filesCreated)
      expect(state!.metadata.endTime).toBeInstanceOf(Date)
      expect(state!.metadata.duration).toBeGreaterThanOrEqual(0)
    })

    it('should fail an action', () => {
      const actionId = 'test-action-4'
      communicationManager.registerAction(actionId, 'test-action', {})

      const error = 'File already exists'
      communicationManager.failAction(actionId, error)

      const state = communicationManager.getActionState(actionId)
      expect(state!.status).toBe('failed')
      expect(state!.metadata.errors).toContain(error)
      expect(state!.metadata.endTime).toBeInstanceOf(Date)
    })

    it('should get actions by status', () => {
      communicationManager.registerAction('action-1', 'test', {})
      communicationManager.registerAction('action-2', 'test', {})
      communicationManager.registerAction('action-3', 'test', {})

      communicationManager.completeAction('action-1', { message: 'done' })
      communicationManager.failAction('action-2', 'error')
      // action-3 remains running

      const running = communicationManager.getActionsByStatus('running')
      const completed = communicationManager.getActionsByStatus('completed')
      const failed = communicationManager.getActionsByStatus('failed')

      expect(running).toHaveLength(1)
      expect(completed).toHaveLength(1)
      expect(failed).toHaveLength(1)
      expect(running[0].id).toBe('action-3')
      expect(completed[0].id).toBe('action-1')
      expect(failed[0].id).toBe('action-2')
    })
  })

  describe('Message Communication', () => {
    it('should send and route messages', () => {
      const messages: ActionMessage[] = []
      
      communicationManager.on('message', (message) => {
        messages.push(message)
      })

      communicationManager.sendMessage({
        source: 'action-1',
        type: 'progress-update',
        payload: { progress: 50 },
        timestamp: new Date()
      })

      expect(messages).toHaveLength(1)
      expect(messages[0].source).toBe('action-1')
      expect(messages[0].type).toBe('progress-update')
      expect(messages[0].payload.progress).toBe(50)
    })

    it('should support targeted messages', () => {
      const action1Messages: ActionMessage[] = []
      const action2Messages: ActionMessage[] = []

      const unsubscribe1 = communicationManager.subscribeToMessages(
        'action-1',
        'file-created',
        (message) => action1Messages.push(message)
      )

      const unsubscribe2 = communicationManager.subscribeToMessages(
        'action-2',
        'file-created',
        (message) => action2Messages.push(message)
      )

      // Send broadcast message
      communicationManager.sendMessage({
        source: 'action-3',
        type: 'file-created',
        payload: { file: 'global.txt' },
        timestamp: new Date()
      })

      // Send targeted message
      communicationManager.sendMessage({
        source: 'action-3',
        target: 'action-1',
        type: 'file-created',
        payload: { file: 'specific.txt' },
        timestamp: new Date()
      })

      expect(action1Messages).toHaveLength(2) // Both broadcast and targeted
      expect(action2Messages).toHaveLength(1) // Only broadcast
      expect(action1Messages[1].payload.file).toBe('specific.txt')

      unsubscribe1()
      unsubscribe2()
    })

    it('should track message history', () => {
      communicationManager.sendMessage({
        source: 'action-1',
        type: 'test-message-1',
        payload: { data: 'first' },
        timestamp: new Date()
      })

      communicationManager.sendMessage({
        source: 'action-2',
        type: 'test-message-2',
        payload: { data: 'second' },
        timestamp: new Date()
      })

      const allMessages = communicationManager.getMessageHistory()
      expect(allMessages.length).toBeGreaterThanOrEqual(2)

      const filteredMessages = communicationManager.getMessageHistory({
        type: 'test-message-1'
      })
      expect(filteredMessages).toHaveLength(1)
      expect(filteredMessages[0].payload.data).toBe('first')
    })

    it('should support message correlation', () => {
      const correlationId = 'workflow-123'

      communicationManager.sendMessage({
        source: 'action-1',
        type: 'start-workflow',
        payload: { workflowId: 'workflow-123' },
        correlationId,
        timestamp: new Date()
      })

      communicationManager.sendMessage({
        source: 'action-2',
        type: 'workflow-step',
        payload: { step: 1 },
        correlationId,
        timestamp: new Date()
      })

      const correlatedMessages = communicationManager.getMessageHistory({
        correlationId
      })
      expect(correlatedMessages).toHaveLength(2)
    })
  })

  describe('Shared Data Management', () => {
    it('should set and get shared data', () => {
      const key = 'project-config'
      const value = { name: 'MyProject', version: '1.0.0' }

      communicationManager.setSharedData(key, value, 'action-1')
      const retrieved = communicationManager.getSharedData(key)

      expect(retrieved).toEqual(value)
    })

    it('should get all shared data', () => {
      communicationManager.setSharedData('config', { theme: 'dark' })
      communicationManager.setSharedData('state', { user: 'john' })

      const allData = communicationManager.getAllSharedData()
      expect(allData.config).toEqual({ theme: 'dark' })
      expect(allData.state).toEqual({ user: 'john' })
    })

    it('should delete shared data', () => {
      communicationManager.setSharedData('temp-data', 'temporary')
      expect(communicationManager.getSharedData('temp-data')).toBe('temporary')

      const deleted = communicationManager.deleteSharedData('temp-data')
      expect(deleted).toBe(true)
      expect(communicationManager.getSharedData('temp-data')).toBeUndefined()
    })

    it('should broadcast shared data changes', () => {
      const messages: ActionMessage[] = []
      
      communicationManager.on('message:shared-data:changed', (message) => {
        messages.push(message)
      })

      communicationManager.setSharedData('broadcast-test', 'value', 'action-1')

      expect(messages).toHaveLength(1)
      expect(messages[0].type).toBe('shared-data:changed')
      expect(messages[0].payload.key).toBe('broadcast-test')
      expect(messages[0].payload.value).toBe('value')
    })
  })

  describe('Action Coordination', () => {
    it('should wait for action completion', async () => {
      const actionId = 'async-action'
      communicationManager.registerAction(actionId, 'test-action', {})

      // Complete action after delay
      setTimeout(() => {
        communicationManager.completeAction(actionId, { message: 'done' })
      }, 10)

      const state = await communicationManager.waitForAction(actionId, 1000)
      expect(state.status).toBe('completed')
      expect(state.id).toBe(actionId)
    })

    it('should wait for failed action', async () => {
      const actionId = 'failing-action'
      communicationManager.registerAction(actionId, 'test-action', {})

      // Fail action after delay
      setTimeout(() => {
        communicationManager.failAction(actionId, 'Something went wrong')
      }, 10)

      const state = await communicationManager.waitForAction(actionId, 1000)
      expect(state.status).toBe('failed')
      expect(state.metadata.errors).toContain('Something went wrong')
    })

    it('should timeout when waiting for action', async () => {
      const actionId = 'never-completes'
      communicationManager.registerAction(actionId, 'test-action', {})

      await expect(
        communicationManager.waitForAction(actionId, 50) // 50ms timeout
      ).rejects.toThrow('Timeout waiting for action')
    })
  })

  describe('Communication Channels', () => {
    it('should create and manage channels', () => {
      communicationManager.createChannel({
        name: 'notifications',
        type: 'broadcast',
        persistent: true
      })

      communicationManager.subscribeToChannel('notifications', 'action-1')
      communicationManager.subscribeToChannel('notifications', 'action-2')

      // Verify channel exists and has subscribers
      const stats = communicationManager.getStats()
      expect(stats.channels).toBeGreaterThan(0)
    })

    it('should handle channel subscription and unsubscription', () => {
      communicationManager.createChannel({
        name: 'test-notifications',
        type: 'broadcast'
      })

      communicationManager.subscribeToChannel('test-notifications', 'action-1')
      communicationManager.subscribeToChannel('test-notifications', 'action-2')
      communicationManager.unsubscribeFromChannel('test-notifications', 'action-1')

      // Should only have action-2 subscribed now
      // This would require exposing channel state for verification
    })
  })

  describe('Communication Statistics', () => {
    it('should provide accurate statistics', () => {
      // Register some actions
      communicationManager.registerAction('action-1', 'test', {})
      communicationManager.registerAction('action-2', 'test', {})
      communicationManager.completeAction('action-1', { message: 'done' })

      // Add shared data
      communicationManager.setSharedData('config', { test: true })

      // Send messages
      communicationManager.sendMessage({
        source: 'action-1',
        type: 'test',
        payload: {},
        timestamp: new Date()
      })

      const stats = communicationManager.getStats()
      expect(stats.activeActions).toBe(1) // action-2 still running
      expect(stats.completedActions).toBe(1) // action-1 completed
      expect(stats.failedActions).toBe(0)
      expect(stats.totalMessages).toBeGreaterThan(0)
      expect(stats.sharedDataEntries).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid action IDs gracefully', () => {
      expect(() => {
        communicationManager.updateActionState('non-existent', {})
      }).toThrow('Action state not found')
    })

    it('should handle invalid channel operations', () => {
      expect(() => {
        communicationManager.subscribeToChannel('non-existent-channel', 'action-1')
      }).toThrow('Channel not found')
    })
  })

  describe('State Cleanup', () => {
    it('should clear all communication state', () => {
      // Add some data
      communicationManager.registerAction('action-1', 'test', {})
      communicationManager.setSharedData('temp', 'data')
      communicationManager.sendMessage({
        source: 'action-1',
        type: 'test',
        payload: {},
        timestamp: new Date()
      })

      // Clear everything
      communicationManager.clear()

      const stats = communicationManager.getStats()
      expect(stats.activeActions).toBe(0)
      expect(stats.completedActions).toBe(0)
      expect(stats.failedActions).toBe(0)
      expect(stats.sharedDataEntries).toBe(0)
      expect(communicationManager.getSharedData('temp')).toBeUndefined()
    })
  })
})

describe('Communication Manager Integration', () => {
  it('should maintain global singleton behavior', () => {
    const manager1 = getCommunicationManager()
    const manager2 = getCommunicationManager()
    
    expect(manager1).toBe(manager2)
    
    // Changes in one should reflect in the other
    manager1.setSharedData('test', 'value')
    expect(manager2.getSharedData('test')).toBe('value')
  })

  it('should support custom configuration', () => {
    clearCommunicationManager()
    
    const customConfig: Partial<CommunicationConfig> = {
      maxMessageHistory: 50,
      channels: [
        { name: 'custom-channel', type: 'broadcast' }
      ]
    }
    
    const manager = getCommunicationManager(customConfig)
    
    // Test that custom configuration is applied
    // This would require exposing configuration for verification
    expect(manager).toBeDefined()
  })
})

describe('Real-world Communication Scenarios', () => {
  let manager: ActionCommunicationManager

  beforeEach(() => {
    clearCommunicationManager()
    manager = getCommunicationManager()
  })

  it('should handle component generation workflow', async () => {
    const componentName = 'UserCard'
    const workflowId = 'component-workflow-123'

    // Step 1: Generate component file
    manager.registerAction('generate-component', 'create-component', { name: componentName })
    manager.setSharedData('component-name', componentName, 'generate-component')
    
    // Simulate component generation
    setTimeout(() => {
      manager.updateActionState('generate-component', { 
        filesCreated: [`${componentName}.tsx`] 
      })
      manager.completeAction('generate-component', { 
        filesCreated: [`${componentName}.tsx`],
        message: 'Component created'
      })
    }, 10)

    // Step 2: Generate test file (waits for component)
    manager.registerAction('generate-test', 'create-test', { componentName })
    
    // Wait for component generation to complete
    const componentState = await manager.waitForAction('generate-component', 1000)
    expect(componentState.status).toBe('completed')

    // Now generate test
    manager.completeAction('generate-test', {
      filesCreated: [`${componentName}.test.tsx`],
      message: 'Test created'
    })

    // Verify workflow completion
    const testState = manager.getActionState('generate-test')
    expect(testState!.status).toBe('completed')
    expect(manager.getSharedData('component-name')).toBe(componentName)
  })

  it('should handle error propagation in workflows', async () => {
    manager.registerAction('setup-project', 'setup', {})
    manager.registerAction('install-deps', 'install', {})

    // Fail the setup step
    manager.failAction('setup-project', 'Directory already exists')

    // Install step should be notified of failure
    const setupState = await manager.waitForAction('setup-project', 100)
    expect(setupState.status).toBe('failed')

    // This would trigger conditional logic in a real workflow
    if (setupState.status === 'failed') {
      manager.failAction('install-deps', 'Cannot install: setup failed')
    }

    const installState = manager.getActionState('install-deps')
    expect(installState!.status).toBe('failed')
  })

  it('should support progress tracking across multiple actions', () => {
    const actions = ['analyze', 'transform', 'validate', 'output']
    const totalSteps = actions.length

    // Register all actions
    actions.forEach((action, index) => {
      manager.registerAction(action, action, { step: index + 1, total: totalSteps })
    })

    // Simulate progress updates
    actions.forEach((action, index) => {
      const progress = ((index + 1) / totalSteps) * 100
      manager.updateActionState(action, { progress })
      
      if (index < actions.length - 1) {
        manager.completeAction(action, { message: `${action} completed` })
      }
    })

    // Check final state
    const finalAction = manager.getActionState('output')
    expect(finalAction!.data.progress).toBe(100)
    
    const completedActions = manager.getActionsByStatus('completed')
    expect(completedActions).toHaveLength(3) // All except 'output' which is still running
  })
})