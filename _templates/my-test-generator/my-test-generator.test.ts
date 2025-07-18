import { myTestGenerator } from './my-test-generator'
import { ActionContext } from '../../src/actions/index.js'
import { beforeEach, describe, it, expect } from 'bun:test'

describe('my-test-generator generator', () => {
  let mockContext: ActionContext
  
  beforeEach(() => {
    mockContext = {
      variables: {
        name: 'test-my-test-generator'
      },
      utils: {
        ensureDir: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn(),
        fileExists: jest.fn()
      },
      logger: {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    }
  })

  it('should create my-test-generator successfully', async () => {
    const result = await myTestGenerator(mockContext)
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('test-my-test-generator')
    expect(result.filesCreated).toBeDefined()
  })

  it('should handle errors gracefully', async () => {
    mockContext.utils.writeFile = jest.fn().mockRejectedValue(new Error('Write failed'))
    
    const result = await myTestGenerator(mockContext)
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to create my-test-generator')
  })
})
