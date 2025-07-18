/**
 * Hypergen Integration Tests
 * 
 * End-to-end tests for Hypergen engine integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { runner } from '../src/index.js'
import type { RunnerConfig } from '../src/types.js'
import Logger from '../src/logger.js'

describe('Hypergen Engine Integration', () => {
  let config: RunnerConfig
  let logMessages: string[]

  beforeEach(() => {
    logMessages = []
    
    config = {
      cwd: process.cwd(),
      debug: false,
      logger: new Logger((msg: string) => {
        logMessages.push(msg)
      })
    }
  })

  it('should handle system help command', async () => {
    const result = await runner(['system', 'help'], config)
    
    expect(result.success).toBe(true)
    expect(logMessages.join(' ')).toContain('Hypergen Commands')
  })

  it('should handle system status command', async () => {
    const result = await runner(['system', 'status'], config)
    
    expect(result.success).toBe(true)
    expect(logMessages.join(' ')).toContain('Hypergen Status')
  })

  it('should handle discovery command', async () => {
    const result = await runner(['discover'], config)
    
    expect(result.success).toBe(true)
    expect(logMessages.join(' ')).toContain('Discovery complete')
  })

  it('should handle list command', async () => {
    const result = await runner(['list'], config)
    
    expect(result.success).toBe(true)
    expect(logMessages.join(' ')).toContain('actions')
  })

  it('should handle URL cache commands', async () => {
    const result = await runner(['url', 'cache', 'info'], config)
    
    expect(result.success).toBe(true)
    expect(logMessages.join(' ')).toContain('Cache info')
  })

  it('should handle non-existent action gracefully', async () => {
    const result = await runner(['action', 'non-existent'], config)
    
    expect(result.success).toBe(false)
    expect(logMessages.join(' ')).toContain('not found')
  })

  it('should handle invalid commands', async () => {
    const result = await runner(['invalid-command'], config)
    
    expect(result.success).toBe(false)
    expect(logMessages.join(' ')).toContain('Unknown command')
  })

  it('should handle help flag', async () => {
    const result = await runner(['--help'], config)
    
    expect(result.success).toBe(true) // Help is now handled gracefully
    expect(logMessages.join(' ')).toContain('Hypergen - The Modern Code Generator')
  })
})

describe('Command Routing', () => {
  let config: RunnerConfig
  let logMessages: string[]

  beforeEach(() => {
    logMessages = []
    
    config = {
      cwd: process.cwd(),
      debug: false,
      logger: new Logger((msg: string) => {
        logMessages.push(msg)
      })
    }
  })

  const commands = ['action', 'discover', 'list', 'info', 'url', 'system']

  commands.forEach(command => {
    it(`should handle '${command}' command`, async () => {
      const result = await runner([command], config)
      
      // Each command should be handled (successfully or with appropriate error)
      expect(typeof result.success).toBe('boolean')
    })
  })
})