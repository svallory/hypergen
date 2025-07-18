import { describe, it, expect, beforeEach } from 'bun:test'
import { TemplateCompositionEngine } from '../src/config/template-composition'
import type { TemplateConfig } from '../src/config/template-parser'

describe('Conditional Template Inclusion', () => {
  let compositionEngine: TemplateCompositionEngine

  beforeEach(() => {
    compositionEngine = new TemplateCompositionEngine()
  })

  describe('Simple Variable Conditions', () => {
    it('should evaluate simple boolean variable conditions', async () => {
      const template: TemplateConfig = {
        name: 'conditional-test',
        variables: {
          useTypeScript: {
            type: 'boolean',
            required: false,
            default: false
          }
        },
        includes: [
          {
            url: './typescript.yml',
            condition: 'useTypeScript',
            strategy: 'merge'
          },
          {
            url: './javascript.yml', 
            condition: 'useTypeScript === false',
            strategy: 'merge'
          }
        ]
      }

      // Test with TypeScript enabled
      const composedTS = await compositionEngine.compose(template, {
        variables: { useTypeScript: true }
      })

      expect(composedTS.resolvedIncludes).toHaveLength(2)
      expect(composedTS.resolvedIncludes[0].included).toBe(false) // File doesn't exist, but condition was true
      expect(composedTS.resolvedIncludes[0].reason).toContain('Error')
      expect(composedTS.resolvedIncludes[1].included).toBe(false) // Condition was false
      expect(composedTS.resolvedIncludes[1].reason).toContain('Condition not met')

      // Test with TypeScript disabled
      const composedJS = await compositionEngine.compose(template, {
        variables: { useTypeScript: false }
      })

      expect(composedJS.resolvedIncludes).toHaveLength(2)
      expect(composedJS.resolvedIncludes[0].included).toBe(false) // Condition was false
      expect(composedJS.resolvedIncludes[0].reason).toContain('Condition not met')
      expect(composedJS.resolvedIncludes[1].included).toBe(false) // File doesn't exist, but condition was true
      expect(composedJS.resolvedIncludes[1].reason).toContain('Error')
    })

    it('should evaluate string comparison conditions', async () => {
      const template: TemplateConfig = {
        name: 'string-condition-test',
        variables: {
          framework: {
            type: 'enum',
            values: ['react', 'vue', 'angular'],
            required: true
          }
        },
        includes: [
          {
            url: './react-config.yml',
            condition: 'framework === "react"',
            strategy: 'merge'
          },
          {
            url: './vue-config.yml',
            condition: "framework === 'vue'",
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: { framework: 'react' }
      })

      expect(composed.resolvedIncludes).toHaveLength(2)
      expect(composed.resolvedIncludes[0].included).toBe(false) // File doesn't exist, but condition was true
      expect(composed.resolvedIncludes[0].reason).toContain('Error')
      expect(composed.resolvedIncludes[1].included).toBe(false) // Condition was false
      expect(composed.resolvedIncludes[1].reason).toContain('Condition not met')
    })

    it('should evaluate number comparison conditions', async () => {
      const template: TemplateConfig = {
        name: 'number-condition-test',
        variables: {
          port: {
            type: 'number',
            required: false,
            default: 3000
          }
        },
        includes: [
          {
            url: './dev-config.yml',
            condition: 'port === 3000',
            strategy: 'merge'
          },
          {
            url: './prod-config.yml',
            condition: 'port !== 3000',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: { port: 8080 }
      })

      expect(composed.resolvedIncludes).toHaveLength(2)
      expect(composed.resolvedIncludes[0].included).toBe(false) // Condition was false
      expect(composed.resolvedIncludes[0].reason).toContain('Condition not met')
      expect(composed.resolvedIncludes[1].included).toBe(false) // File doesn't exist, but condition was true
      expect(composed.resolvedIncludes[1].reason).toContain('Error')
    })
  })

  describe('Complex Conditions', () => {
    it('should evaluate logical AND conditions', async () => {
      const template: TemplateConfig = {
        name: 'and-condition-test',
        variables: {
          useTypeScript: {
            type: 'boolean',
            default: false
          },
          useReact: {
            type: 'boolean', 
            default: false
          }
        },
        includes: [
          {
            url: './react-ts-config.yml',
            condition: 'useTypeScript && useReact',
            strategy: 'merge'
          }
        ]
      }

      // Test with both true
      const composedBoth = await compositionEngine.compose(template, {
        variables: { useTypeScript: true, useReact: true }
      })

      expect(composedBoth.resolvedIncludes[0].included).toBe(false) // File doesn't exist, but condition was true
      expect(composedBoth.resolvedIncludes[0].reason).toContain('Error')

      // Test with one false
      const composedPartial = await compositionEngine.compose(template, {
        variables: { useTypeScript: true, useReact: false }
      })

      expect(composedPartial.resolvedIncludes[0].included).toBe(false) // Condition was false
      expect(composedPartial.resolvedIncludes[0].reason).toContain('Condition not met')
    })

    it('should evaluate logical OR conditions', async () => {
      const template: TemplateConfig = {
        name: 'or-condition-test',
        variables: {
          useTesting: {
            type: 'boolean',
            default: false
          },
          useStorybook: {
            type: 'boolean',
            default: false
          }
        },
        includes: [
          {
            url: './dev-tools.yml',
            condition: 'useTesting || useStorybook',
            strategy: 'merge'
          }
        ]
      }

      // Test with one true
      const composedOne = await compositionEngine.compose(template, {
        variables: { useTesting: true, useStorybook: false }
      })

      expect(composedOne.resolvedIncludes[0].included).toBe(false) // File doesn't exist, but condition was true
      expect(composedOne.resolvedIncludes[0].reason).toContain('Error')

      // Test with both false
      const composedNone = await compositionEngine.compose(template, {
        variables: { useTesting: false, useStorybook: false }
      })

      expect(composedNone.resolvedIncludes[0].included).toBe(false) // Condition was false
      expect(composedNone.resolvedIncludes[0].reason).toContain('Condition not met')
    })
  })

  describe('Security and Safety', () => {
    it('should reject dangerous expressions', async () => {
      const template: TemplateConfig = {
        name: 'security-test',
        variables: {
          safe: {
            type: 'boolean',
            default: true
          }
        },
        includes: [
          {
            url: './malicious.yml',
            condition: 'require("fs").readFileSync("/etc/passwd")',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: { safe: true }
      })

      expect(composed.resolvedIncludes[0].included).toBe(false)
      expect(composed.resolvedIncludes[0].reason).toContain('Condition not met')
    })

    it('should handle malformed expressions gracefully', async () => {
      const template: TemplateConfig = {
        name: 'malformed-test',
        variables: {
          test: {
            type: 'boolean',
            default: true
          }
        },
        includes: [
          {
            url: './test.yml',
            condition: 'test === true && (',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: { test: true }
      })

      expect(composed.resolvedIncludes[0].included).toBe(false)
      expect(composed.resolvedIncludes[0].reason).toContain('Condition not met')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined variables in conditions', async () => {
      const template: TemplateConfig = {
        name: 'undefined-test',
        variables: {},
        includes: [
          {
            url: './optional.yml',
            condition: 'undefinedVar',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: {} // Explicitly empty variables
      })

      expect(composed.resolvedIncludes[0].included).toBe(false)
      expect(composed.resolvedIncludes[0].reason).toContain('Condition not met')
    })

    it('should handle empty conditions', async () => {
      const template: TemplateConfig = {
        name: 'empty-condition-test',
        variables: {},
        includes: [
          {
            url: './always.yml',
            condition: '',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template)

      expect(composed.resolvedIncludes[0].included).toBe(false)
      // Empty condition should evaluate to false, skipping the include
      expect(composed.resolvedIncludes[0].reason).toContain('Condition not met')
    })

    it('should handle whitespace in conditions', async () => {
      const template: TemplateConfig = {
        name: 'whitespace-test',
        variables: {
          enabled: {
            type: 'boolean',
            default: true
          }
        },
        includes: [
          {
            url: './test.yml',
            condition: '  enabled === true  ',
            strategy: 'merge'
          }
        ]
      }

      const composed = await compositionEngine.compose(template, {
        variables: { enabled: true }
      })

      expect(composed.resolvedIncludes[0].included).toBe(false) // File doesn't exist, but condition was true
      expect(composed.resolvedIncludes[0].reason).toContain('Error')
    })
  })

  describe('Performance', () => {
    it('should handle many conditional includes efficiently', async () => {
      const includes = []
      for (let i = 0; i < 50; i++) {
        includes.push({
          url: `./include-${i}.yml`,
          condition: `var${i} === true`,
          strategy: 'merge' as const
        })
      }

      // Define template variables
      const templateVariables: Record<string, any> = {}
      for (let i = 0; i < 50; i++) {
        templateVariables[`var${i}`] = {
          type: 'boolean',
          default: false
        }
      }

      // Define actual variable values for composition
      const actualValues: Record<string, any> = {}
      for (let i = 0; i < 50; i++) {
        actualValues[`var${i}`] = i % 2 === 0 // Every other one is true
      }

      const template: TemplateConfig = {
        name: 'performance-test',
        variables: templateVariables,
        includes
      }

      const startTime = Date.now()
      const composed = await compositionEngine.compose(template, {
        variables: actualValues
      })
      const duration = Date.now() - startTime

      expect(composed.resolvedIncludes).toHaveLength(50)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second

      // Check that conditions were evaluated correctly
      let trueCounts = 0
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          // Should try to include (but fail because file doesn't exist)
          expect(composed.resolvedIncludes[i].reason).toContain('Error')
          trueCounts++
        } else {
          // Should not include due to condition
          expect(composed.resolvedIncludes[i].reason).toContain('Condition not met')
        }
      }
      expect(trueCounts).toBe(25)
    })
  })
})