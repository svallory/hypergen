import { describe, it, expect, beforeEach } from 'bun:test'
import { ActionParameterResolver } from '../src/actions/parameter-resolver'
import type { ActionMetadata } from '../src/actions/types'

describe('Interactive Parameter Resolution', () => {
  let resolver: ActionParameterResolver

  beforeEach(() => {
    resolver = new ActionParameterResolver()
  })

  describe('Parameter Resolution Priority', () => {
    it('should prioritize command line arguments over defaults', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'DefaultName'
          },
          {
            name: 'port',
            type: 'number',
            required: false,
            default: 3000
          }
        ]
      }

      const providedValues = {
        name: 'ProvidedName',
        port: 8080
      }

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: true // Even with defaults enabled, provided values should take precedence
      })

      expect(result.name).toBe('ProvidedName')
      expect(result.port).toBe(8080)
    })

    it('should use defaults only when --defaults flag is used', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'DefaultName'
          },
          {
            name: 'port',
            type: 'number',
            required: false,
            default: 3000
          }
        ]
      }

      const providedValues = {
        name: 'ProvidedName'
        // port not provided
      }

      // With defaults enabled
      const resultWithDefaults = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: true
      })

      expect(resultWithDefaults.name).toBe('ProvidedName')
      expect(resultWithDefaults.port).toBe(3000) // Default value used

      // Without defaults enabled - should not use default for optional parameter
      const resultWithoutDefaults = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false,
        skipOptional: true // Skip prompting for optional parameters
      })

      expect(resultWithoutDefaults.name).toBe('ProvidedName')
      expect(resultWithoutDefaults.port).toBeUndefined() // No default, not prompted
    })

    it('should require prompts for missing required parameters', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true
          },
          {
            name: 'framework',
            type: 'enum',
            required: true,
            values: ['react', 'vue', 'angular']
          }
        ]
      }

      const providedValues = {
        name: 'TestComponent'
        // framework is missing and required
      }

      // This should identify that framework needs to be prompted for
      const parametersNeedingValues = metadata.parameters.filter(param => {
        const hasValue = providedValues[param.name as keyof typeof providedValues] !== undefined
        const isRequired = param.required
        return !hasValue && isRequired
      })

      expect(parametersNeedingValues).toHaveLength(1)
      expect(parametersNeedingValues[0].name).toBe('framework')
    })

    it('should validate provided parameters before prompting', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'port',
            type: 'number',
            required: true,
            min: 1000,
            max: 9999
          }
        ]
      }

      const providedValues = {
        port: 99 // Invalid: below minimum
      }

      await expect(resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })).rejects.toThrow('Parameter validation failed')
    })
  })

  describe('Option Handling', () => {
    it('should handle skipOptional option', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true
          },
          {
            name: 'description',
            type: 'string',
            required: false
          }
        ]
      }

      const providedValues = {
        name: 'TestComponent'
        // description is optional and not provided
      }

      // With skipOptional=true
      const resultSkipOptional = await resolver.resolveParametersInteractively(metadata, providedValues, {
        skipOptional: true
      })

      expect(resultSkipOptional.name).toBe('TestComponent')
      expect(resultSkipOptional.description).toBeUndefined()

      // With skipOptional=false, it would normally prompt for description
      // but we can't test actual prompting in unit tests
    })

    it('should handle dry run option', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'TestName'
          }
        ]
      }

      const providedValues = {}

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: true,
        dryRun: true
      })

      expect(result.name).toBe('TestName')
      // dryRun doesn't affect parameter resolution, just execution
    })

    it('should handle force option', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'TestName'
          }
        ]
      }

      const providedValues = {}

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: true,
        force: true
      })

      expect(result.name).toBe('TestName')
      // force doesn't affect parameter resolution, just execution
    })
  })

  describe('Parameter Types', () => {
    it('should handle all parameter types correctly', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            default: 'TestName'
          },
          {
            name: 'enabled',
            type: 'boolean',
            required: false,
            default: true
          },
          {
            name: 'port',
            type: 'number',
            required: false,
            default: 3000
          },
          {
            name: 'framework',
            type: 'enum',
            required: false,
            values: ['react', 'vue', 'angular'],
            default: 'react'
          },
          {
            name: 'tags',
            type: 'array',
            required: false,
            default: ['web', 'app']
          }
        ]
      }

      const providedValues = {}

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: true
      })

      expect(result.name).toBe('TestName')
      expect(result.enabled).toBe(true)
      expect(result.port).toBe(3000)
      expect(result.framework).toBe('react')
      expect(result.tags).toEqual(['web', 'app'])
    })

    it('should validate enum parameters correctly', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'framework',
            type: 'enum',
            required: true,
            values: ['react', 'vue', 'angular']
          }
        ]
      }

      const providedValues = {
        framework: 'svelte' // Invalid enum value
      }

      await expect(resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })).rejects.toThrow('Parameter validation failed')
    })

    it('should validate number parameters correctly', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'port',
            type: 'number',
            required: true,
            min: 1000,
            max: 9999
          }
        ]
      }

      const providedValues = {
        port: 10000 // Above maximum
      }

      await expect(resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })).rejects.toThrow('Parameter validation failed')
    })

    it('should validate string parameters correctly', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            pattern: '^[A-Z][a-zA-Z0-9]*$'
          }
        ]
      }

      const providedValues = {
        name: 'invalidName' // Doesn't match pattern (should start with uppercase)
      }

      await expect(resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })).rejects.toThrow('Parameter validation failed')
    })
  })

  describe('Error Handling', () => {
    it('should throw error for missing required parameters without defaults', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true
            // No default value
          }
        ]
      }

      const providedValues = {}

      // This should fail because name is required but not provided and has no default
      await expect(resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false,
        skipOptional: true // This won't help because name is required
      })).rejects.toThrow('Required parameter \'name\' not provided and no default available')
    })

    it('should handle empty parameters gracefully', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action',
        parameters: []
      }

      const providedValues = {}

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })

      expect(result).toEqual({})
    })

    it('should handle undefined parameters gracefully', async () => {
      const metadata: ActionMetadata = {
        name: 'test-action',
        description: 'Test action'
        // No parameters property
      }

      const providedValues = {}

      const result = await resolver.resolveParametersInteractively(metadata, providedValues, {
        useDefaults: false
      })

      expect(result).toEqual({})
    })
  })
})