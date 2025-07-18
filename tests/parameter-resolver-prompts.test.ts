import { describe, it, expect, beforeEach } from 'bun:test'
import { ActionParameterResolver } from '../src/actions/parameter-resolver'
import type { ActionMetadata, ActionParameter } from '../src/actions/types'

describe('Parameter Resolver with Prompts', () => {
  let resolver: ActionParameterResolver

  beforeEach(() => {
    resolver = new ActionParameterResolver()
  })

  describe('Parameter Conversion', () => {
    it('should convert ActionParameter to TemplateVariable format', () => {
      const actionParam: ActionParameter = {
        name: 'componentName',
        type: 'string',
        description: 'Name of the component',
        required: true,
        pattern: '^[A-Z][a-zA-Z0-9]*$',
        min: 3,
        max: 50,
        validation: {
          message: 'Must be a valid component name'
        }
      }

      const converted = resolver['convertParameterToVariable'](actionParam)
      
      expect(converted.type).toBe('string')
      expect(converted.description).toBe('Name of the component')
      expect(converted.required).toBe(true)
      expect(converted.pattern).toBe('^[A-Z][a-zA-Z0-9]*$')
      expect(converted.min).toBe(3)
      expect(converted.max).toBe(50)
      expect(converted.validation?.message).toBe('Must be a valid component name')
    })

    it('should handle enum parameters with multi-select detection', () => {
      const actionParam: ActionParameter = {
        name: 'methods',
        type: 'enum',
        description: 'HTTP methods to support',
        required: true,
        values: ['GET', 'POST', 'PUT', 'DELETE'],
        default: ['GET', 'POST']
      }

      const converted = resolver['convertParameterToVariable'](actionParam)
      
      expect(converted.type).toBe('enum')
      expect(converted.values).toEqual(['GET', 'POST', 'PUT', 'DELETE'])
      expect(converted.default).toEqual(['GET', 'POST'])
    })
  })

  describe('Parameter Resolution with Prompts', () => {
    it('should resolve parameters without prompts when all are provided', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          },
          {
            name: 'framework',
            type: 'enum',
            description: 'Framework choice',
            required: true,
            values: ['react', 'vue', 'angular']
          }
        ]
      }

      const providedValues = {
        name: 'TestComponent',
        framework: 'react'
      }

      const result = await resolver.resolveParametersWithPrompts(metadata, providedValues, {
        interactive: false // No prompts needed
      })

      expect(result.name).toBe('TestComponent')
      expect(result.framework).toBe('react')
    })

    it('should apply default values correctly', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          },
          {
            name: 'enabled',
            type: 'boolean',
            description: 'Enable feature',
            required: false,
            default: true
          },
          {
            name: 'port',
            type: 'number',
            description: 'Port number',
            required: false,
            default: 3000
          }
        ]
      }

      const providedValues = {
        name: 'TestComponent'
      }

      const result = await resolver.resolveParametersWithPrompts(metadata, providedValues, {
        interactive: false
      })

      expect(result.name).toBe('TestComponent')
      expect(result.enabled).toBe(true)
      expect(result.port).toBe(3000)
    })

    it('should throw error for missing required parameters when interactive is disabled', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          },
          {
            name: 'framework',
            type: 'enum',
            description: 'Framework choice',
            required: true,
            values: ['react', 'vue', 'angular']
          }
        ]
      }

      const providedValues = {
        name: 'TestComponent'
        // Missing required 'framework' parameter
      }

      // This should throw an error since interactive mode is disabled
      // and a required parameter is missing
      await expect(resolver.resolveParametersWithPrompts(metadata, providedValues, {
        interactive: false
      })).rejects.toThrow('Required parameter \'framework\' not provided')
    })
  })

  describe('Parameter Validation', () => {
    it('should validate provided parameters', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'port',
            type: 'number',
            description: 'Port number',
            required: true,
            min: 1000,
            max: 9999
          }
        ]
      }

      const providedValues = {
        port: 99 // Invalid: below minimum
      }

      await expect(resolver.resolveParametersWithPrompts(metadata, providedValues, {
        interactive: false
      })).rejects.toThrow('Parameter validation failed')
    })

    it('should validate enum parameters', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'framework',
            type: 'enum',
            description: 'Framework choice',
            required: true,
            values: ['react', 'vue', 'angular']
          }
        ]
      }

      const providedValues = {
        framework: 'svelte' // Invalid enum value
      }

      await expect(resolver.resolveParametersWithPrompts(metadata, providedValues, {
        interactive: false
      })).rejects.toThrow('Parameter validation failed')
    })
  })

  describe('Backwards Compatibility', () => {
    it('should maintain existing resolveParameters method', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: false,
            default: 'DefaultName'
          }
        ]
      }

      const result = await resolver.resolveParameters(metadata, {})
      
      expect(result.name).toBe('DefaultName')
    })

    it('should throw error for missing required parameters in non-interactive mode', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          }
        ]
      }

      await expect(resolver.resolveParameters(metadata, {})).rejects.toThrow('Required parameter \'name\' not provided')
    })
  })
})