/**
 * Cross-Action Communication System
 * 
 * Enables actions to communicate with each other and share state
 * during execution workflows
 */

import createDebug from 'debug'
import { EventEmitter } from 'events'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'

const debug = createDebug('hypergen:v8:communication')

export interface ActionMessage {
  id: string
  source: string
  target?: string // undefined means broadcast
  type: string
  payload: any
  timestamp: Date
  correlationId?: string
}

export interface ActionState {
  id: string
  action: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  data: Record<string, any>
  metadata: {
    startTime: Date
    endTime?: Date
    duration?: number
    filesCreated?: string[]
    errors?: string[]
  }
}

export interface CommunicationChannel {
  id: string
  name: string
  type: 'broadcast' | 'direct' | 'topic'
  subscribers: string[]
  messageHistory: ActionMessage[]
  persistent: boolean
}

export interface StateStore {
  actionStates: Map<string, ActionState>
  sharedData: Map<string, any>
  channels: Map<string, CommunicationChannel>
  eventHistory: ActionMessage[]
}

export interface CommunicationConfig {
  maxMessageHistory: number
  maxStateHistory: number
  enablePersistence: boolean
  stateStorePath?: string
  channels: CommunicationChannelConfig[]
}

export interface CommunicationChannelConfig {
  name: string
  type: 'broadcast' | 'direct' | 'topic'
  persistent?: boolean
  subscribers?: string[]
}

export class ActionCommunicationManager extends EventEmitter {
  private store: StateStore
  private config: CommunicationConfig
  private messageCorrelations = new Map<string, string[]>()

  constructor(config: Partial<CommunicationConfig> = {}) {
    super()
    
    this.config = {
      maxMessageHistory: config.maxMessageHistory || 1000,
      maxStateHistory: config.maxStateHistory || 100,
      enablePersistence: config.enablePersistence || false,
      stateStorePath: config.stateStorePath,
      channels: config.channels || []
    }

    this.store = {
      actionStates: new Map(),
      sharedData: new Map(),
      channels: new Map(),
      eventHistory: []
    }

    this.initializeChannels()
    debug('Communication manager initialized with %d channels', this.store.channels.size)
  }

  /**
   * Register an action and create its initial state
   */
  registerAction(
    actionId: string,
    actionName: string,
    initialData: Record<string, any> = {}
  ): void {
    debug('Registering action: %s (%s)', actionId, actionName)

    const state: ActionState = {
      id: actionId,
      action: actionName,
      status: 'running',
      data: { ...initialData },
      metadata: {
        startTime: new Date(),
        filesCreated: [],
        errors: []
      }
    }

    this.store.actionStates.set(actionId, state)
    this.emit('action:registered', { actionId, actionName, state })

    // Broadcast action start event
    this.sendMessage({
      id: this.generateMessageId(),
      source: actionId,
      type: 'action:started',
      payload: { actionName, initialData },
      timestamp: new Date()
    })
  }

  /**
   * Update action state
   */
  updateActionState(
    actionId: string,
    updates: Partial<ActionState['data']>,
    status?: ActionState['status']
  ): void {
    const state = this.store.actionStates.get(actionId)
    if (!state) {
      throw ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        `Action state not found: ${actionId}`,
        { action: actionId }
      )
    }

    debug('Updating action state: %s', actionId)

    // Update data
    Object.assign(state.data, updates)

    // Update status if provided
    if (status) {
      state.status = status
      if (status === 'completed' || status === 'failed') {
        state.metadata.endTime = new Date()
        state.metadata.duration = state.metadata.endTime.getTime() - state.metadata.startTime.getTime()
      }
    }

    this.emit('action:state-updated', { actionId, updates, status, state })

    // Broadcast state change
    this.sendMessage({
      id: this.generateMessageId(),
      source: actionId,
      type: 'action:state-changed',
      payload: { updates, status },
      timestamp: new Date()
    })
  }

  /**
   * Complete an action
   */
  completeAction(
    actionId: string,
    result: { filesCreated?: string[]; message?: string }
  ): void {
    debug('Completing action: %s', actionId)

    const state = this.store.actionStates.get(actionId)
    if (!state) {
      throw ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        `Action state not found: ${actionId}`,
        { action: actionId }
      )
    }

    state.status = 'completed'
    state.metadata.endTime = new Date()
    state.metadata.duration = state.metadata.endTime.getTime() - state.metadata.startTime.getTime()
    
    if (result.filesCreated) {
      state.metadata.filesCreated = result.filesCreated
    }

    this.emit('action:completed', { actionId, result, state })

    // Broadcast completion
    this.sendMessage({
      id: this.generateMessageId(),
      source: actionId,
      type: 'action:completed',
      payload: result,
      timestamp: new Date()
    })
  }

  /**
   * Fail an action
   */
  failAction(actionId: string, error: string | Error): void {
    debug('Failing action: %s', actionId)

    const state = this.store.actionStates.get(actionId)
    if (!state) {
      throw ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        `Action state not found: ${actionId}`,
        { action: actionId }
      )
    }

    const errorMessage = error instanceof Error ? error.message : error
    state.status = 'failed'
    state.metadata.endTime = new Date()
    state.metadata.duration = state.metadata.endTime.getTime() - state.metadata.startTime.getTime()
    state.metadata.errors = state.metadata.errors || []
    state.metadata.errors.push(errorMessage)

    this.emit('action:failed', { actionId, error: errorMessage, state })

    // Broadcast failure
    this.sendMessage({
      id: this.generateMessageId(),
      source: actionId,
      type: 'action:failed',
      payload: { error: errorMessage },
      timestamp: new Date()
    })
  }

  /**
   * Send a message between actions
   */
  sendMessage(message: Omit<ActionMessage, 'id'> & { id?: string }): void {
    const fullMessage: ActionMessage = {
      id: message.id || this.generateMessageId(),
      source: message.source,
      target: message.target,
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp || new Date(),
      correlationId: message.correlationId
    }

    debug('Sending message: %s -> %s [%s]', fullMessage.source, fullMessage.target || 'broadcast', fullMessage.type)

    // Add to history
    this.store.eventHistory.push(fullMessage)
    this.trimEventHistory()

    // Route message to appropriate channels
    this.routeMessage(fullMessage)

    // Emit to listeners
    this.emit('message', fullMessage)
    this.emit(`message:${fullMessage.type}`, fullMessage)

    // Handle correlation tracking
    if (fullMessage.correlationId) {
      this.trackCorrelation(fullMessage)
    }
  }

  /**
   * Subscribe to messages for a specific action
   */
  subscribeToMessages(
    actionId: string,
    messageType: string,
    handler: (message: ActionMessage) => void
  ): () => void {
    debug('Action %s subscribing to messages: %s', actionId, messageType)

    const eventName = `message:${messageType}`
    const wrappedHandler = (message: ActionMessage) => {
      // Only deliver to target or broadcast messages
      if (!message.target || message.target === actionId) {
        handler(message)
      }
    }

    this.on(eventName, wrappedHandler)

    // Return unsubscribe function
    return () => {
      this.off(eventName, wrappedHandler)
      debug('Action %s unsubscribed from messages: %s', actionId, messageType)
    }
  }

  /**
   * Set shared data that can be accessed by other actions
   */
  setSharedData(key: string, value: any, source?: string): void {
    debug('Setting shared data: %s', key)
    
    this.store.sharedData.set(key, value)
    this.emit('shared-data:set', { key, value, source })

    // Broadcast shared data change
    this.sendMessage({
      id: this.generateMessageId(),
      source: source || 'system',
      type: 'shared-data:changed',
      payload: { key, value },
      timestamp: new Date()
    })
  }

  /**
   * Get shared data
   */
  getSharedData(key: string): any {
    return this.store.sharedData.get(key)
  }

  /**
   * Get all shared data
   */
  getAllSharedData(): Record<string, any> {
    return Object.fromEntries(this.store.sharedData)
  }

  /**
   * Delete shared data
   */
  deleteSharedData(key: string, source?: string): boolean {
    debug('Deleting shared data: %s', key)
    
    const deleted = this.store.sharedData.delete(key)
    if (deleted) {
      this.emit('shared-data:deleted', { key, source })

      // Broadcast shared data deletion
      this.sendMessage({
        id: this.generateMessageId(),
        source: source || 'system',
        type: 'shared-data:deleted',
        payload: { key },
        timestamp: new Date()
      })
    }
    return deleted
  }

  /**
   * Get action state
   */
  getActionState(actionId: string): ActionState | undefined {
    return this.store.actionStates.get(actionId)
  }

  /**
   * Get all action states
   */
  getAllActionStates(): ActionState[] {
    return Array.from(this.store.actionStates.values())
  }

  /**
   * Get actions by status
   */
  getActionsByStatus(status: ActionState['status']): ActionState[] {
    return Array.from(this.store.actionStates.values()).filter(state => state.status === status)
  }

  /**
   * Wait for an action to complete
   */
  waitForAction(actionId: string, timeout?: number): Promise<ActionState> {
    return new Promise((resolve, reject) => {
      const state = this.store.actionStates.get(actionId)
      if (!state) {
        reject(new Error(`Action not found: ${actionId}`))
        return
      }

      // If already completed, resolve immediately
      if (state.status === 'completed' || state.status === 'failed') {
        resolve(state)
        return
      }

      let timeoutId: NodeJS.Timeout | undefined

      const handleStateUpdate = (event: { actionId: string; state: ActionState }) => {
        if (event.actionId === actionId && (event.state.status === 'completed' || event.state.status === 'failed')) {
          if (timeoutId) clearTimeout(timeoutId)
          this.off('action:state-updated', handleStateUpdate)
          this.off('action:completed', handleCompleted)
          this.off('action:failed', handleFailed)
          resolve(event.state)
        }
      }

      const handleCompleted = (event: { actionId: string; state: ActionState }) => {
        if (event.actionId === actionId) {
          if (timeoutId) clearTimeout(timeoutId)
          this.off('action:state-updated', handleStateUpdate)
          this.off('action:completed', handleCompleted)
          this.off('action:failed', handleFailed)
          resolve(event.state)
        }
      }

      const handleFailed = (event: { actionId: string; state: ActionState }) => {
        if (event.actionId === actionId) {
          if (timeoutId) clearTimeout(timeoutId)
          this.off('action:state-updated', handleStateUpdate)
          this.off('action:completed', handleCompleted)
          this.off('action:failed', handleFailed)
          resolve(event.state) // Resolve with failed state
        }
      }

      this.on('action:state-updated', handleStateUpdate)
      this.on('action:completed', handleCompleted)
      this.on('action:failed', handleFailed)

      // Set timeout if provided
      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off('action:state-updated', handleStateUpdate)
          this.off('action:completed', handleCompleted)
          this.off('action:failed', handleFailed)
          reject(new Error(`Timeout waiting for action: ${actionId}`))
        }, timeout)
      }
    })
  }

  /**
   * Create a communication channel
   */
  createChannel(config: CommunicationChannelConfig): void {
    debug('Creating channel: %s (%s)', config.name, config.type)

    const channel: CommunicationChannel = {
      id: this.generateChannelId(),
      name: config.name,
      type: config.type,
      subscribers: config.subscribers || [],
      messageHistory: [],
      persistent: config.persistent || false
    }

    this.store.channels.set(config.name, channel)
    this.emit('channel:created', { channel })
  }

  /**
   * Subscribe to a channel
   */
  subscribeToChannel(channelName: string, actionId: string): void {
    debug('Action %s subscribing to channel: %s', actionId, channelName)

    const channel = this.store.channels.get(channelName)
    if (!channel) {
      throw ErrorHandler.createError(
        ErrorCode.VALIDATION_ERROR,
        `Channel not found: ${channelName}`,
        { channel: channelName }
      )
    }

    if (!channel.subscribers.includes(actionId)) {
      channel.subscribers.push(actionId)
      this.emit('channel:subscription', { channelName, actionId, type: 'subscribe' })
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName: string, actionId: string): void {
    debug('Action %s unsubscribing from channel: %s', actionId, channelName)

    const channel = this.store.channels.get(channelName)
    if (!channel) return

    const index = channel.subscribers.indexOf(actionId)
    if (index > -1) {
      channel.subscribers.splice(index, 1)
      this.emit('channel:subscription', { channelName, actionId, type: 'unsubscribe' })
    }
  }

  /**
   * Get message history
   */
  getMessageHistory(filter?: {
    type?: string
    source?: string
    target?: string
    correlationId?: string
    since?: Date
  }): ActionMessage[] {
    let messages = this.store.eventHistory

    if (filter) {
      messages = messages.filter(msg => {
        if (filter.type && msg.type !== filter.type) return false
        if (filter.source && msg.source !== filter.source) return false
        if (filter.target && msg.target !== filter.target) return false
        if (filter.correlationId && msg.correlationId !== filter.correlationId) return false
        if (filter.since && msg.timestamp < filter.since) return false
        return true
      })
    }

    return messages
  }

  /**
   * Clear communication state
   */
  clear(): void {
    debug('Clearing communication state')
    
    this.store.actionStates.clear()
    this.store.sharedData.clear()
    this.store.eventHistory = []
    this.messageCorrelations.clear()
    
    // Recreate default channels
    this.initializeChannels()
    
    this.emit('state:cleared')
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    activeActions: number
    completedActions: number
    failedActions: number
    totalMessages: number
    sharedDataEntries: number
    channels: number
  } {
    const states = Array.from(this.store.actionStates.values())
    
    return {
      activeActions: states.filter(s => s.status === 'running' || s.status === 'paused').length,
      completedActions: states.filter(s => s.status === 'completed').length,
      failedActions: states.filter(s => s.status === 'failed').length,
      totalMessages: this.store.eventHistory.length,
      sharedDataEntries: this.store.sharedData.size,
      channels: this.store.channels.size
    }
  }

  /**
   * Initialize default channels
   */
  private initializeChannels(): void {
    // Create default system channels
    const defaultChannels: CommunicationChannelConfig[] = [
      { name: 'system', type: 'broadcast', persistent: true },
      { name: 'errors', type: 'broadcast', persistent: true },
      { name: 'lifecycle', type: 'broadcast', persistent: false },
      ...this.config.channels
    ]

    for (const channelConfig of defaultChannels) {
      this.createChannel(channelConfig)
    }
  }

  /**
   * Route message to appropriate channels and subscribers
   */
  private routeMessage(message: ActionMessage): void {
    // If target is specified, route directly
    if (message.target) {
      // Direct message - no additional routing needed
      return
    }

    // Broadcast to all relevant channels
    for (const channel of this.store.channels.values()) {
      if (channel.type === 'broadcast') {
        // Add to channel history if persistent
        if (channel.persistent) {
          channel.messageHistory.push(message)
          this.trimChannelHistory(channel)
        }
      }
    }
  }

  /**
   * Track correlation between messages
   */
  private trackCorrelation(message: ActionMessage): void {
    if (!message.correlationId) return

    if (!this.messageCorrelations.has(message.correlationId)) {
      this.messageCorrelations.set(message.correlationId, [])
    }

    this.messageCorrelations.get(message.correlationId)!.push(message.id)
  }

  /**
   * Trim event history to stay within limits
   */
  private trimEventHistory(): void {
    if (this.store.eventHistory.length > this.config.maxMessageHistory) {
      this.store.eventHistory = this.store.eventHistory.slice(-this.config.maxMessageHistory)
    }
  }

  /**
   * Trim channel message history
   */
  private trimChannelHistory(channel: CommunicationChannel): void {
    const maxHistory = 100 // Configurable per channel in the future
    if (channel.messageHistory.length > maxHistory) {
      channel.messageHistory = channel.messageHistory.slice(-maxHistory)
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique channel ID
   */
  private generateChannelId(): string {
    return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Global communication manager instance
let globalCommunicationManager: ActionCommunicationManager | undefined

/**
 * Get or create the global communication manager
 */
export function getCommunicationManager(config?: Partial<CommunicationConfig>): ActionCommunicationManager {
  if (!globalCommunicationManager) {
    globalCommunicationManager = new ActionCommunicationManager(config)
  }
  return globalCommunicationManager
}

/**
 * Set the global communication manager
 */
export function setCommunicationManager(manager: ActionCommunicationManager): void {
  globalCommunicationManager = manager
}

/**
 * Clear the global communication manager
 */
export function clearCommunicationManager(): void {
  if (globalCommunicationManager) {
    globalCommunicationManager.clear()
    globalCommunicationManager = undefined
  }
}