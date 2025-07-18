/**
 * V8 Actions System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  action,
  getActionMetadata,
  isActionFunction,
  ActionRegistry,
  ActionParameterResolver,
  ActionExecutor,
  DefaultActionUtils,
  ConsoleActionLogger,
  SilentActionLogger
} from '../src/actions/index.js'
import type { ActionContext, ActionResult, ActionMetadata } from '../src/actions/index.js'

// Helper function to create test actions
function createTestAction(metadata: any, implementation?: (context: ActionContext) => Promise<ActionResult>) {
  const impl = implementation || (async (context: ActionContext): Promise<ActionResult> => {
    return { success: true }
  })
  
  return action(metadata)(impl)
}

describe('Action Decorator', () => {
  beforeEach(() => {
    // Clear registry before each test
    ActionRegistry.getInstance().clear()
  })

  it('should decorate functions with action metadata', () => {
    const testAction = createTestAction({
      name: 'test-action',
      description: 'A test action',
      category: 'testing'
    })

    const metadata = getActionMetadata(testAction)
    expect(metadata).toBeDefined()
    expect(metadata!.name).toBe('test-action')
    expect(metadata!.description).toBe('A test action')
    expect(metadata!.category).toBe('testing')
  })

  it('should register actions with the registry', () => {
    const registryTest = createTestAction({
      name: 'registry-test',
      description: 'Test registry registration'
    })

    const registry = ActionRegistry.getInstance()
    const registered = registry.get('registry-test')
    
    expect(registered).toBeDefined()
    expect(registered!.metadata.name).toBe('registry-test')
    expect(registered!.fn).toBe(registryTest)
  })

  it('should validate action metadata', () => {
    expect(() => {
      createTestAction({
        name: '', // Invalid empty name
        description: 'Invalid action'
      })
    }).toThrow('Action name is required')

    expect(() => {
      createTestAction({
        name: 'invalid-123!', // Invalid characters
        description: 'Invalid action'
      })
    }).toThrow('Action name must be alphanumeric')
  })

  it('should validate parameter definitions', () => {
    expect(() => {
      createTestAction({
        name: 'param-test',
        parameters: [
          {
            name: 'param1',
            type: 'invalid-type' as any
          }
        ]
      })
    }).toThrow('Invalid parameter type')

    expect(() => {
      createTestAction({
        name: 'enum-test',
        parameters: [
          {
            name: 'option',
            type: 'enum'
            // Missing values array
          }
        ]
      })
    }).toThrow('Enum parameter option must have a non-empty values array')
  })

  it('should detect decorated functions', () => {
    const decoratedFunction = createTestAction({
      name: 'detection-test',
      description: 'Test function detection'
    })

    function regularFunction() {
      return 'not an action'
    }

    expect(isActionFunction(decoratedFunction)).toBe(true)
    expect(isActionFunction(regularFunction)).toBe(false)
  })
})

describe('ActionRegistry', () => {
  let registry: ActionRegistry

  beforeEach(() => {
    registry = ActionRegistry.getInstance()
    registry.clear()
  })

  it('should register and retrieve actions', () => {
    const testAction = createTestAction({
      name: 'test-action',
      description: 'Test action',
      category: 'test',
      tags: ['unit', 'test']
    })

    const retrieved = registry.get('test-action')
    expect(retrieved).toBeDefined()
    expect(retrieved!.metadata.name).toBe('test-action')
    expect(retrieved!.metadata.category).toBe('test')
    expect(retrieved!.metadata.tags).toEqual(['unit', 'test'])
  })

  it('should get actions by category', () => {
    createTestAction({
      name: 'db-action',
      category: 'database'
    })

    createTestAction({
      name: 'file-action',
      category: 'file'
    })

    createTestAction({
      name: 'another-db-action',
      category: 'database'
    })

    const dbActions = registry.getByCategory('database')
    expect(dbActions).toHaveLength(2)
    expect(dbActions.map(a => a.metadata.name)).toContain('db-action')
    expect(dbActions.map(a => a.metadata.name)).toContain('another-db-action')

    const fileActions = registry.getByCategory('file')
    expect(fileActions).toHaveLength(1)
    expect(fileActions[0].metadata.name).toBe('file-action')
  })

  it('should get actions by tags', () => {
    createTestAction({
      name: 'action1',
      tags: ['setup', 'database']
    })

    createTestAction({
      name: 'action2',
      tags: ['cleanup', 'file']
    })

    createTestAction({
      name: 'action3',
      tags: ['setup', 'file']
    })

    const setupActions = registry.getByTags(['setup'])
    expect(setupActions).toHaveLength(2)
    expect(setupActions.map(a => a.metadata.name)).toContain('action1')
    expect(setupActions.map(a => a.metadata.name)).toContain('action3')

    const fileActions = registry.getByTags(['file'])
    expect(fileActions).toHaveLength(2)
    expect(fileActions.map(a => a.metadata.name)).toContain('action2')
    expect(fileActions.map(a => a.metadata.name)).toContain('action3')
  })

  it('should query actions with filters', () => {
    createTestAction({
      name: 'create-component',
      description: 'Create a React component',
      category: 'component',
      tags: ['react', 'create']
    })

    createTestAction({
      name: 'delete-component',
      description: 'Delete a React component',
      category: 'component',
      tags: ['react', 'delete']
    })

    createTestAction({
      name: 'setup-database',
      description: 'Setup database connection',
      category: 'database',
      tags: ['setup', 'db']
    })

    // Query by category
    const componentActions = registry.query({ category: 'component' })
    expect(componentActions).toHaveLength(2)

    // Query by tags
    const reactActions = registry.query({ tags: ['react'] })
    expect(reactActions).toHaveLength(2)

    // Query by search term
    const createActions = registry.query({ search: 'create' })
    expect(createActions).toHaveLength(1)
    expect(createActions[0].metadata.name).toBe('create-component')
  })

  it('should provide registry statistics', () => {
    createTestAction({ name: 'action1', category: 'cat1', tags: ['tag1', 'tag2'] })
    createTestAction({ name: 'action2', category: 'cat1', tags: ['tag2', 'tag3'] })
    createTestAction({ name: 'action3', category: 'cat2', tags: ['tag1'] })

    const stats = registry.getStats()
    expect(stats.totalActions).toBe(3)
    expect(stats.categories).toEqual({ cat1: 2, cat2: 1 })
    expect(stats.tags).toEqual({ tag1: 2, tag2: 2, tag3: 1 })
  })
})

describe('ActionParameterResolver', () => {
  let resolver: ActionParameterResolver

  beforeEach(() => {
    resolver = new ActionParameterResolver()
  })

  it('should resolve parameters with defaults', async () => {
    const metadata: ActionMetadata = {
      name: 'test-action',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true
        },
        {
          name: 'enabled',
          type: 'boolean',
          default: true
        },
        {
          name: 'count',
          type: 'number',
          default: 5
        }
      ]
    }

    const resolved = await resolver.resolveParameters(metadata, { name: 'TestName' })
    
    expect(resolved.name).toBe('TestName')
    expect(resolved.enabled).toBe(true)
    expect(resolved.count).toBe(5)
  })

  it('should validate parameter types', async () => {
    const metadata: ActionMetadata = {
      name: 'validation-test',
      parameters: [
        {
          name: 'count',
          type: 'number',
          min: 1,
          max: 10
        },
        {
          name: 'option',
          type: 'enum',
          values: ['option1', 'option2', 'option3']
        }
      ]
    }

    // Valid parameters
    const valid = await resolver.resolveParameters(metadata, {
      count: 5,
      option: 'option1'
    })
    expect(valid.count).toBe(5)
    expect(valid.option).toBe('option1')

    // Invalid number range
    await expect(
      resolver.resolveParameters(metadata, { count: 15, option: 'option1' })
    ).rejects.toThrow('above maximum')

    // Invalid enum value
    await expect(
      resolver.resolveParameters(metadata, { count: 5, option: 'invalid' })
    ).rejects.toThrow('not in allowed values')
  })

  it('should handle required parameters', async () => {
    const metadata: ActionMetadata = {
      name: 'required-test',
      parameters: [
        {
          name: 'required',
          type: 'string',
          required: true
        },
        {
          name: 'optional',
          type: 'string'
        }
      ]
    }

    // With required parameter
    const valid = await resolver.resolveParameters(metadata, { required: 'value' })
    expect(valid.required).toBe('value')

    // Missing required parameter
    await expect(
      resolver.resolveParameters(metadata, { optional: 'value' })
    ).rejects.toThrow("Required parameter 'required' not provided")
  })

  it('should validate all parameter types', async () => {
    const metadata: ActionMetadata = {
      name: 'type-test',
      parameters: [
        { name: 'str', type: 'string', pattern: '^[A-Z]' },
        { name: 'bool', type: 'boolean' },
        { name: 'num', type: 'number' },
        { name: 'arr', type: 'array' },
        { name: 'obj', type: 'object' },
        { name: 'file', type: 'file' },
        { name: 'dir', type: 'directory' }
      ]
    }

    const validParams = {
      str: 'ValidString',
      bool: true,
      num: 42,
      arr: [1, 2, 3],
      obj: { key: 'value' },
      file: '/path/to/file.txt',
      dir: '/path/to/directory'
    }

    const resolved = await resolver.resolveParameters(metadata, validParams)
    expect(resolved).toEqual(validParams)

    // Test invalid types
    await expect(
      resolver.resolveParameters(metadata, { str: 'invalid', bool: true })
    ).rejects.toThrow('does not match pattern')

    await expect(
      resolver.resolveParameters(metadata, { str: 'Valid', bool: 'not-boolean' })
    ).rejects.toThrow('Expected boolean')
  })
})

describe('ActionExecutor', () => {
  let executor: ActionExecutor

  beforeEach(() => {
    executor = new ActionExecutor()
    ActionRegistry.getInstance().clear()
  })

  it('should execute actions successfully', async () => {
    const testExecution = createTestAction({
      name: 'test-execution',
      description: 'Test action execution'
    }, async (context: ActionContext): Promise<ActionResult> => {
      context.logger.success('Action executed')
      return {
        success: true,
        message: 'Test execution completed',
        filesCreated: ['test.txt']
      }
    })

    const result = await executor.execute('test-execution', {}, {
      logger: new SilentActionLogger()
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Test execution completed')
    expect(result.filesCreated).toEqual(['test.txt'])
  })

  it('should handle action parameters', async () => {
    const paramTest = createTestAction({
      name: 'param-test',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true
        },
        {
          name: 'count',
          type: 'number',
          default: 1
        }
      ]
    }, async (context: ActionContext): Promise<ActionResult> => {
      const { name, count } = context.variables
      return {
        success: true,
        message: `Processed ${name} ${count} times`
      }
    })

    const result = await executor.execute('param-test', 
      { name: 'TestItem', count: 3 },
      { logger: new SilentActionLogger() }
    )

    expect(result.success).toBe(true)
    expect(result.message).toBe('Processed TestItem 3 times')
  })

  it('should handle missing actions', async () => {
    await expect(
      executor.execute('nonexistent-action')
    ).rejects.toThrow('Action \'nonexistent-action\' not found')
  })

  it('should validate parameters before execution', async () => {
    const validationTest = createTestAction({
      name: 'validation-test',
      parameters: [
        {
          name: 'required',
          type: 'string',
          required: true
        }
      ]
    })

    const validation = await executor.validateParameters('validation-test', {})
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain("Required parameter 'required' not provided")

    const validValidation = await executor.validateParameters('validation-test', { required: 'value' })
    expect(validValidation.valid).toBe(true)
    expect(validValidation.errors).toHaveLength(0)
  })

  it('should execute action sequences', async () => {
    const executionOrder: string[] = []

    createTestAction({ name: 'first' }, async () => {
      executionOrder.push('first')
      return { success: true }
    })

    createTestAction({ name: 'second' }, async () => {
      executionOrder.push('second')
      return { success: true }
    })

    createTestAction({ name: 'third' }, async () => {
      executionOrder.push('third')
      return { success: true }
    })

    const results = await executor.executeSequence([
      { name: 'first' },
      { name: 'second' },
      { name: 'third' }
    ], { logger: new SilentActionLogger() })

    expect(results).toHaveLength(3)
    expect(results.every(r => r.success)).toBe(true)
    expect(executionOrder).toEqual(['first', 'second', 'third'])
  })

  it('should stop sequence on failure', async () => {
    const executionOrder: string[] = []

    createTestAction({ name: 'success1' }, async () => {
      executionOrder.push('success1')
      return { success: true }
    })

    createTestAction({ name: 'failure' }, async () => {
      executionOrder.push('failure')
      return { success: false, message: 'Failed' }
    })

    createTestAction({ name: 'success2' }, async () => {
      executionOrder.push('success2')
      return { success: true }
    })

    const results = await executor.executeSequence([
      { name: 'success1' },
      { name: 'failure' },
      { name: 'success2' }
    ], { logger: new SilentActionLogger() })

    expect(results).toHaveLength(2) // Should stop after failure
    expect(executionOrder).toEqual(['success1', 'failure'])
  })

  it('should provide action information', () => {
    createTestAction({
      name: 'info-test',
      description: 'Test action info',
      parameters: [
        { name: 'required', type: 'string', required: true },
        { name: 'optional', type: 'string' }
      ]
    })

    const info = executor.getActionInfo('info-test')
    expect(info.exists).toBe(true)
    expect(info.parameterCount).toBe(2)
    expect(info.requiredParameters).toEqual(['required'])

    const missingInfo = executor.getActionInfo('missing')
    expect(missingInfo.exists).toBe(false)
  })
})

describe('ActionUtils', () => {
  let utils: DefaultActionUtils

  beforeEach(() => {
    utils = new DefaultActionUtils()
  })

  it('should check path existence', async () => {
    // Test with a path that should exist
    const exists = await utils.pathExists('.')
    expect(exists).toBe(true)

    // Test with a path that shouldn't exist
    const notExists = await utils.pathExists('./nonexistent-path-12345')
    expect(notExists).toBe(false)
  })

  it('should handle glob patterns', async () => {
    // Test basic glob - should find test files
    const files = await utils.glob('*.spec.ts', { cwd: './tests' })
    expect(files.length).toBeGreaterThan(0)
    expect(files.every(f => f.endsWith('.spec.ts'))).toBe(true)
  })

  // Note: File operations would require temp directory setup for proper testing
  // These would be integration tests rather than unit tests
})

describe('ActionLogger', () => {
  it('should provide console logger', () => {
    const logger = new ConsoleActionLogger()
    expect(() => {
      logger.success('test')
      logger.info('test')
      logger.warn('test')
      logger.error('test')
    }).not.toThrow()
  })

  it('should provide silent logger', () => {
    const logger = new SilentActionLogger()
    expect(() => {
      logger.success('test')
      logger.info('test')
      logger.warn('test')
      logger.error('test')
    }).not.toThrow()
  })
})