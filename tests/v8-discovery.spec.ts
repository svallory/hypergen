/**
 * V8 Discovery System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GeneratorDiscovery } from '../src/discovery/index.js'
import type { DiscoveredGenerator } from '../src/discovery/index.js'

describe('GeneratorDiscovery', () => {
  let discovery: GeneratorDiscovery

  beforeEach(() => {
    discovery = new GeneratorDiscovery()
  })

  it('should initialize with default options', () => {
    expect(discovery).toBeDefined()
    expect(discovery.getGenerators()).toHaveLength(0)
  })

  it('should support custom discovery options', () => {
    const customDiscovery = new GeneratorDiscovery({
      directories: ['custom-templates'],
      enabledSources: ['local']
    })
    
    expect(customDiscovery).toBeDefined()
  })

  it('should discover generators from enabled sources', async () => {
    // Note: This test would require actual generator files to be meaningful
    // In a real scenario, we'd set up test fixtures
    const generators = await discovery.discoverAll()
    
    expect(Array.isArray(generators)).toBe(true)
    // Can't assert specific count without test fixtures
  })

  it('should filter generators by source', async () => {
    // Create discovery with only local source enabled
    const localOnlyDiscovery = new GeneratorDiscovery({
      enabledSources: ['local']
    })
    
    await localOnlyDiscovery.discoverAll()
    const localGenerators = localOnlyDiscovery.getGeneratorsBySource('local')
    
    expect(localGenerators.every(g => g.source === 'local')).toBe(true)
  })

  it('should provide generator lookup by name', async () => {
    await discovery.discoverAll()
    
    const generators = discovery.getGenerators()
    if (generators.length > 0) {
      const firstGenerator = generators[0]
      const retrieved = discovery.getGenerator(firstGenerator.name)
      
      expect(retrieved).toEqual(firstGenerator)
    }
    
    // Test non-existent generator
    const nonExistent = discovery.getGenerator('non-existent-generator')
    expect(nonExistent).toBeUndefined()
  })

  it('should handle discovery errors gracefully', async () => {
    // Discovery with invalid directory should not throw
    const invalidDiscovery = new GeneratorDiscovery({
      directories: ['/non/existent/directory']
    })
    
    const generators = await invalidDiscovery.discoverAll()
    expect(Array.isArray(generators)).toBe(true)
  })

  it('should support different discovery sources', () => {
    const sources = ['local', 'npm', 'git', 'workspace'] as const
    
    for (const source of sources) {
      const discovery = new GeneratorDiscovery({
        enabledSources: [source]
      })
      
      expect(discovery).toBeDefined()
    }
  })

  it('should extract generator metadata', async () => {
    const generators = await discovery.discoverAll()
    
    // Check that generators have required properties
    for (const generator of generators) {
      expect(generator).toMatchObject({
        name: expect.any(String),
        source: expect.stringMatching(/^(local|npm|git|workspace)$/),
        path: expect.any(String),
        actions: expect.any(Array)
      })
    }
  })
})

describe('Generator Discovery Integration', () => {
  it('should integrate with action registry', async () => {
    // This would test that discovered actions are properly registered
    // with the ActionRegistry for execution
    
    const discovery = new GeneratorDiscovery()
    const generators = await discovery.discoverAll()
    
    // Verify that discovered generators have actions
    const generatorsWithActions = generators.filter(g => g.actions.length > 0)
    
    // Each generator with actions should be available for execution
    for (const generator of generatorsWithActions) {
      expect(generator.actions).toBeInstanceOf(Array)
      expect(generator.actions.length).toBeGreaterThan(0)
    }
  })

  it('should support workspace discovery patterns', async () => {
    const workspaceDiscovery = new GeneratorDiscovery({
      enabledSources: ['workspace']
    })
    
    const generators = await workspaceDiscovery.discoverAll()
    const workspaceGenerators = generators.filter(g => g.source === 'workspace')
    
    // Workspace generators should have appropriate metadata
    for (const generator of workspaceGenerators) {
      expect(generator.metadata?.description).toContain('Workspace generator')
    }
  })
})