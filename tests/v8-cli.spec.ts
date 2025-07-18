/**
 * Hypergen CLI Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HypergenCLI } from '../src/cli/index.js'
import type { HypergenCliConfig } from '../src/cli/index.js'

describe('HypergenCLI', () => {
  let cli: HypergenCLI
  let config: HypergenCliConfig

  beforeEach(() => {
    config = {
      cwd: process.cwd(),
      debug: false
    }
    cli = new HypergenCLI(config)
  })

  it('should initialize with config', () => {
    expect(cli).toBeDefined()
  })

  it('should handle unknown commands', async () => {
    const result = await cli.execute(['unknown-command'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown command')
  })

  it('should handle action command without action name', async () => {
    const result = await cli.execute(['action'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('Action name required')
  })

  it('should handle list command', async () => {
    const result = await cli.execute(['list'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('actions')
  })

  it('should handle info command without action name', async () => {
    const result = await cli.execute(['info'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('Action name required')
  })

  it('should handle info command for non-existent action', async () => {
    const result = await cli.execute(['info', 'non-existent-action'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('not found')
  })

  it('should handle discover command', async () => {
    const result = await cli.execute(['discover'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('Discovery complete')
  })

  it('should handle system help command', async () => {
    const result = await cli.execute(['system', 'help'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('Hypergen Commands')
  })

  it('should handle system status command', async () => {
    const result = await cli.execute(['system', 'status'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('Hypergen Status')
  })

  it('should handle url resolve command without URL', async () => {
    const result = await cli.execute(['url', 'resolve'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('URL required')
  })

  it('should handle url cache commands', async () => {
    const clearResult = await cli.execute(['url', 'cache', 'clear'])
    expect(clearResult.success).toBe(true)
    expect(clearResult.message).toContain('Cache cleared')

    const infoResult = await cli.execute(['url', 'cache', 'info'])
    expect(infoResult.success).toBe(true)
    expect(infoResult.message).toContain('Cache info')
  })

  it('should parse parameters correctly', async () => {
    // Test that parameter parsing works (through action execution)
    const result = await cli.execute(['action', 'test-action', '--name=TestValue', '--count=5', '--enabled=true'])
    
    // Since test-action doesn't exist, it should fail with action not found
    expect(result.success).toBe(false)
    expect(result.message).toContain('not found')
  })

  it('should handle discovery with specific sources', async () => {
    const result = await cli.execute(['discover', 'local', 'npm'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('Discovery complete')
  })

  it('should handle list with category', async () => {
    const result = await cli.execute(['list', 'nonexistent-category'])
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('No actions found in category')
  })
})

describe('HypergenCLI Integration', () => {
  it('should integrate all components', async () => {
    const config: HypergenCliConfig = {
      cwd: process.cwd(),
      debug: false,
      discoveryOptions: {
        sources: ['local'],
        directories: ['_templates']
      }
    }
    
    const cli = new HypergenCLI(config)
    
    // Test discovery integration
    const discoverResult = await cli.execute(['discover'])
    expect(discoverResult.success).toBe(true)
    
    // Test list integration
    const listResult = await cli.execute(['list'])
    expect(listResult.success).toBe(true)
    
    // Test status integration
    const statusResult = await cli.execute(['system', 'status'])
    expect(statusResult.success).toBe(true)
  })

  it('should provide comprehensive help', async () => {
    const cli = new HypergenCLI({ cwd: process.cwd() })
    const result = await cli.execute(['system', 'help'])
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('Action Management')
    expect(result.message).toContain('Generator Discovery')
    expect(result.message).toContain('URL Templates')
    expect(result.message).toContain('Examples')
  })
})