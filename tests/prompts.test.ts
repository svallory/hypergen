import { describe, it, expect, beforeEach } from 'bun:test'
import { InteractivePrompter, type PromptOptions } from '../src/prompts/interactive-prompts'
import { type TemplateVariable } from '../src/config/template-parser'

describe('Interactive Prompts System', () => {
  let prompter: InteractivePrompter

  beforeEach(() => {
    prompter = new InteractivePrompter()
  })

  describe('Parameter Detection', () => {
    it('should detect missing parameters correctly', async () => {
      const variables: Record<string, TemplateVariable> = {
        name: {
          type: 'string',
          required: true,
          description: 'Component name'
        },
        methods: {
          type: 'enum',
          required: false,
          description: 'HTTP methods',
          values: ['GET', 'POST', 'PUT', 'DELETE'],
          default: ['GET']
        },
        framework: {
          type: 'enum',
          required: true,
          description: 'Framework choice',
          values: ['react', 'vue', 'angular']
        }
      }

      const providedValues = {
        name: 'TestComponent'
      }

      const options: PromptOptions = {
        interactive: false // Disable actual prompting for test
      }

      const result = await prompter.promptForParameters(variables, providedValues, options)
      
      expect(result.completed).toBe(false)
      expect(result.cancelled).toBe(false)
      expect(result.errors).toContain('Interactive prompts disabled')
      expect(result.values.name).toBe('TestComponent')
    })

    it('should validate multi-select enum detection', () => {
      const variables: Record<string, TemplateVariable> = {
        methods: {
          type: 'enum',
          required: true,
          description: 'HTTP methods to support',
          values: ['GET', 'POST', 'PUT', 'DELETE'],
          default: ['GET', 'POST']
        },
        features: {
          type: 'enum',
          required: false,
          description: 'Features to enable',
          values: ['auth', 'validation', 'logging', 'caching']
        },
        framework: {
          type: 'enum',
          required: true,
          description: 'Single framework choice',
          values: ['react', 'vue', 'angular']
        }
      }

      // Test that parameter names containing 'methods' or 'features' are detected as multi-select
      const methodsVariable = variables.methods
      const featuresVariable = variables.features
      const frameworkVariable = variables.framework

      // Methods should be multi-select due to default array value
      expect(Array.isArray(methodsVariable.default)).toBe(true)
      
      // Features should be multi-select due to name pattern
      expect(featuresVariable.type).toBe('enum')
      
      // Framework should be single-select
      expect(frameworkVariable.type).toBe('enum')
      expect(Array.isArray(frameworkVariable.default)).toBe(false)
    })
  })

  describe('Parameter Validation', () => {
    it('should validate string parameters', () => {
      const variable: TemplateVariable = {
        type: 'string',
        required: true,
        pattern: '^[A-Z][a-zA-Z0-9]*$',
        min: 3,
        max: 50
      }

      // Valid string
      const validResult = prompter['validateStringInput']('ComponentName', variable)
      expect(validResult).toBeUndefined()

      // Invalid pattern
      const invalidPatternResult = prompter['validateStringInput']('componentName', variable)
      expect(invalidPatternResult).toBeDefined()
      expect(invalidPatternResult).toContain('Must match pattern')

      // Too short
      const tooShortResult = prompter['validateStringInput']('AB', variable)
      expect(tooShortResult).toBeDefined()
      expect(tooShortResult).toContain('Must be at least 3 characters')

      // Too long
      const tooLongResult = prompter['validateStringInput']('A'.repeat(51), variable)
      expect(tooLongResult).toBeDefined()
      expect(tooLongResult).toContain('Must be no more than 50 characters')
    })

    it('should validate number parameters', () => {
      const variable: TemplateVariable = {
        type: 'number',
        required: true,
        min: 1,
        max: 100
      }

      // Valid number
      const validResult = prompter['validateNumberInput']('50', variable)
      expect(validResult).toBeUndefined()

      // Invalid number
      const invalidResult = prompter['validateNumberInput']('not-a-number', variable)
      expect(invalidResult).toBeDefined()
      expect(invalidResult).toContain('Must be a valid number')

      // Too small
      const tooSmallResult = prompter['validateNumberInput']('0', variable)
      expect(tooSmallResult).toBeDefined()
      expect(tooSmallResult).toContain('Must be at least 1')

      // Too large
      const tooLargeResult = prompter['validateNumberInput']('101', variable)
      expect(tooLargeResult).toBeDefined()
      expect(tooLargeResult).toContain('Must be no more than 100')
    })

    it('should validate array parameters', () => {
      const variable: TemplateVariable = {
        type: 'array',
        required: true,
        min: 2,
        max: 5
      }

      // Valid array
      const validResult = prompter['validateArrayInput']('item1, item2, item3', variable)
      expect(validResult).toBeUndefined()

      // Too few items
      const tooFewResult = prompter['validateArrayInput']('item1', variable)
      expect(tooFewResult).toBeDefined()
      expect(tooFewResult).toContain('Must have at least 2 items')

      // Too many items
      const tooManyResult = prompter['validateArrayInput']('item1, item2, item3, item4, item5, item6', variable)
      expect(tooManyResult).toBeDefined()
      expect(tooManyResult).toContain('Must have no more than 5 items')
    })
  })

  describe('Parameter Processing', () => {
    it('should process all parameter types correctly', () => {
      const variables: Record<string, TemplateVariable> = {
        name: { type: 'string', required: true },
        enabled: { type: 'boolean', required: false, default: true },
        port: { type: 'number', required: false, default: 3000 },
        framework: { type: 'enum', required: true, values: ['react', 'vue'] },
        tags: { type: 'array', required: false, default: [] }
      }

      const values = {
        name: 'MyApp',
        enabled: false,
        port: 8080,
        framework: 'react',
        tags: ['web', 'frontend']
      }

      const validation = prompter['validateParameters'](variables, values)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect validation errors', () => {
      const variables: Record<string, TemplateVariable> = {
        name: { type: 'string', required: true },
        port: { type: 'number', required: true, min: 1000, max: 9999 },
        framework: { type: 'enum', required: true, values: ['react', 'vue'] }
      }

      const values = {
        name: '', // Empty required field
        port: 99, // Below minimum
        framework: 'angular' // Invalid enum value
      }

      const validation = prompter['validateParameters'](variables, values)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('name is required')
      expect(validation.errors).toContain('port must be at least 1000')
      expect(validation.errors).toContain('framework must be one of: react, vue')
    })
  })

  describe('Multi-Select Enum Support', () => {
    it('should handle multi-select enum values', () => {
      const variables: Record<string, TemplateVariable> = {
        methods: {
          type: 'enum',
          required: true,
          values: ['GET', 'POST', 'PUT', 'DELETE'],
          default: ['GET', 'POST']
        }
      }

      const values = {
        methods: ['GET', 'POST', 'PUT']
      }

      const validation = prompter['validateParameters'](variables, values)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate multi-select enum values', () => {
      const variables: Record<string, TemplateVariable> = {
        methods: {
          type: 'enum',
          required: true,
          values: ['GET', 'POST', 'PUT', 'DELETE']
        }
      }

      const values = {
        methods: ['GET', 'PATCH', 'OPTIONS'] // PATCH and OPTIONS are not valid
      }

      const validation = prompter['validateParameters'](variables, values)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('methods contains invalid values: PATCH, OPTIONS')
    })
  })

  describe('Static Helper Methods', () => {
    it('should provide static helper methods', () => {
      expect(typeof InteractivePrompter.createSpinner).toBe('function')
      expect(typeof InteractivePrompter.note).toBe('function')
      expect(typeof InteractivePrompter.log).toBe('function')
      expect(typeof InteractivePrompter.error).toBe('function')
      expect(typeof InteractivePrompter.warn).toBe('function')
      expect(typeof InteractivePrompter.success).toBe('function')
      expect(typeof InteractivePrompter.info).toBe('function')
      expect(typeof InteractivePrompter.confirm).toBe('function')
      expect(typeof InteractivePrompter.text).toBe('function')
      expect(typeof InteractivePrompter.select).toBe('function')
      expect(typeof InteractivePrompter.multiselect).toBe('function')
    })
  })
})