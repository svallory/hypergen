/**
 * Template Composition Engine
 * 
 * Handles template inheritance, composition, and conflict resolution
 */

import createDebug from 'debug'
import { TemplateURLManager } from './url-resolution/index.js'
import { TemplateParser, type TemplateConfig, type TemplateInclude, type TemplateVariable } from './template-parser.js'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'

const debug = createDebug('hypergen:v8:composition')

export interface CompositionContext {
  baseTemplate: TemplateConfig
  variables: Record<string, any>
  projectRoot: string
  resolvedTemplates: Map<string, TemplateConfig>
}

export interface ComposedTemplate {
  config: TemplateConfig
  variables: Record<string, TemplateVariable>
  resolvedIncludes: Array<{
    url: string
    config: TemplateConfig
    included: boolean
    reason?: string
  }>
  conflicts: Array<{
    type: 'variable' | 'dependency' | 'output'
    name: string
    sources: string[]
    resolution: 'merge' | 'replace' | 'extend' | 'error'
  }>
}

export class TemplateCompositionEngine {
  private urlManager = new TemplateURLManager()

  /**
   * Compose a template with its inheritance chain and includes
   */
  async compose(
    baseTemplate: TemplateConfig,
    context: Partial<CompositionContext> = {}
  ): Promise<ComposedTemplate> {
    debug('Composing template: %s', baseTemplate.name)

    const compositionContext: CompositionContext = {
      baseTemplate,
      variables: context.variables || {},
      projectRoot: context.projectRoot || process.cwd(),
      resolvedTemplates: context.resolvedTemplates || new Map()
    }

    const result: ComposedTemplate = {
      config: { ...baseTemplate },
      variables: { ...baseTemplate.variables },
      resolvedIncludes: [],
      conflicts: []
    }

    // Step 1: Resolve inheritance chain
    if (baseTemplate.extends) {
      await this.resolveInheritance(result, compositionContext)
    }

    // Step 2: Resolve includes
    if (baseTemplate.includes) {
      await this.resolveIncludes(result, compositionContext)
    }

    // Step 3: Resolve conflicts
    await this.resolveConflicts(result, compositionContext)

    debug('Template composition complete: %s', baseTemplate.name)
    return result
  }

  /**
   * Resolve template inheritance chain
   */
  private async resolveInheritance(
    result: ComposedTemplate,
    context: CompositionContext
  ): Promise<void> {
    if (!context.baseTemplate.extends) return

    debug('Resolving inheritance: %s', context.baseTemplate.extends)

    try {
      // Resolve parent template
      const parentTemplate = await this.resolveTemplate(context.baseTemplate.extends, context)
      
      // Apply inheritance - parent variables come first, child overrides
      const inheritedVariables = { ...parentTemplate.variables }
      
      // Merge variables with child taking precedence
      for (const [name, variable] of Object.entries(context.baseTemplate.variables)) {
        if (inheritedVariables[name]) {
          // Handle variable conflict
          const conflict = {
            type: 'variable' as const,
            name,
            sources: [context.baseTemplate.extends, context.baseTemplate.name],
            resolution: this.getConflictResolution(name, context.baseTemplate.conflicts)
          }
          result.conflicts.push(conflict)

          switch (conflict.resolution) {
            case 'replace':
              inheritedVariables[name] = variable
              break
            case 'merge':
              inheritedVariables[name] = this.mergeVariables(inheritedVariables[name], variable)
              break
            case 'extend':
              inheritedVariables[name] = this.extendVariable(inheritedVariables[name], variable)
              break
            case 'error':
              throw ErrorHandler.createError(
                ErrorCode.TEMPLATE_COMPOSITION_ERROR,
                `Variable conflict: '${name}' exists in both parent and child templates`,
                { variable: name, extends: context.baseTemplate.extends, template: context.baseTemplate.name }
              )
          }
        } else {
          inheritedVariables[name] = variable
        }
      }

      result.variables = inheritedVariables
      
      // Merge other properties
      if (parentTemplate.dependencies || result.config.dependencies) {
        const parentDeps = parentTemplate.dependencies || []
        const childDeps = result.config.dependencies || []
        result.config.dependencies = [...parentDeps, ...childDeps] as any
      }
      
      result.config.outputs = [
        ...(parentTemplate.outputs || []),
        ...(result.config.outputs || [])
      ]

      // Merge tags
      result.config.tags = [
        ...(parentTemplate.tags || []),
        ...(result.config.tags || [])
      ]

      debug('Inheritance resolved: %s -> %s', context.baseTemplate.extends, context.baseTemplate.name)
    } catch (error: any) {
      throw ErrorHandler.createError(
        ErrorCode.TEMPLATE_COMPOSITION_ERROR,
        `Failed to resolve inheritance: ${error.message}`,
        { extends: context.baseTemplate.extends, template: context.baseTemplate.name }
      )
    }
  }

  /**
   * Resolve template includes
   */
  private async resolveIncludes(
    result: ComposedTemplate,
    context: CompositionContext
  ): Promise<void> {
    if (!context.baseTemplate.includes) return

    debug('Resolving includes: %d templates', context.baseTemplate.includes.length)

    for (const include of context.baseTemplate.includes) {
      try {
        // Check condition - if condition exists but evaluates to false, skip include
        if (include.condition !== undefined) {
          const conditionResult = this.evaluateCondition(include.condition, context.variables)
          if (!conditionResult) {
            result.resolvedIncludes.push({
              url: include.url,
              config: {} as TemplateConfig,
              included: false,
              reason: `Condition not met: ${include.condition}`
            })
            continue
          }
        }

        // Resolve included template
        const includedTemplate = await this.resolveTemplate(include.url, context, include.version)
        
        // Apply variable overrides
        const templateWithOverrides = this.applyVariableOverrides(includedTemplate, include.variables)
        
        result.resolvedIncludes.push({
          url: include.url,
          config: templateWithOverrides,
          included: true
        })

        // Merge included template variables
        await this.mergeIncludedTemplate(result, templateWithOverrides, include, context)

        debug('Include resolved: %s', include.url)
      } catch (error: any) {
        result.resolvedIncludes.push({
          url: include.url,
          config: {} as TemplateConfig,
          included: false,
          reason: `Error: ${error.message}`
        })
        
        debug('Include failed: %s - %s', include.url, error.message)
      }
    }
  }

  /**
   * Merge an included template into the result
   */
  private async mergeIncludedTemplate(
    result: ComposedTemplate,
    includedTemplate: TemplateConfig,
    include: TemplateInclude,
    context: CompositionContext
  ): Promise<void> {
    const strategy = include.strategy || 'merge'

    // Merge variables
    for (const [name, variable] of Object.entries(includedTemplate.variables)) {
      if (result.variables[name]) {
        // Handle variable conflict
        const conflict = {
          type: 'variable' as const,
          name,
          sources: [context.baseTemplate.name, include.url],
          resolution: this.getConflictResolution(name, context.baseTemplate.conflicts, strategy)
        }
        result.conflicts.push(conflict)

        switch (conflict.resolution) {
          case 'replace':
            result.variables[name] = variable
            break
          case 'merge':
            result.variables[name] = this.mergeVariables(result.variables[name], variable)
            break
          case 'extend':
            result.variables[name] = this.extendVariable(result.variables[name], variable)
            break
          case 'error':
            throw ErrorHandler.createError(
              ErrorCode.TEMPLATE_COMPOSITION_ERROR,
              `Variable conflict: '${name}' exists in both base and included templates`,
              { variable: name, base: context.baseTemplate.name, include: include.url }
            )
        }
      } else {
        result.variables[name] = variable
      }
    }

    // Merge dependencies
    if (includedTemplate.dependencies) {
      const existingDeps = result.config.dependencies || []
      result.config.dependencies = [...existingDeps, ...includedTemplate.dependencies] as any
    }

    // Merge outputs
    if (includedTemplate.outputs) {
      result.config.outputs = [
        ...(result.config.outputs || []),
        ...includedTemplate.outputs
      ]
    }
  }

  /**
   * Resolve conflicts using configured strategies
   */
  private async resolveConflicts(
    result: ComposedTemplate,
    context: CompositionContext
  ): Promise<void> {
    // Remove duplicate dependencies
    if (result.config.dependencies) {
      // Handle both string[] and TemplateDependency[] types
      if (Array.isArray(result.config.dependencies) && result.config.dependencies.length > 0) {
        if (typeof result.config.dependencies[0] === 'string') {
          result.config.dependencies = [...new Set(result.config.dependencies as string[])]
        } else {
          // For object dependencies, deduplicate by name
          const deps = result.config.dependencies as any[]
          const seen = new Set()
          result.config.dependencies = deps.filter(dep => {
            const key = typeof dep === 'string' ? dep : dep.name
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        }
      }
    }

    // Remove duplicate outputs
    if (result.config.outputs) {
      result.config.outputs = [...new Set(result.config.outputs)]
    }

    // Remove duplicate tags
    if (result.config.tags) {
      result.config.tags = [...new Set(result.config.tags)]
    }

    debug('Conflicts resolved: %d conflicts', result.conflicts.length)
  }

  /**
   * Resolve a template by URL
   */
  private async resolveTemplate(
    url: string,
    context: CompositionContext,
    version?: string
  ): Promise<TemplateConfig> {
    // Check cache first
    const cacheKey = version ? `${url}@${version}` : url
    if (context.resolvedTemplates.has(cacheKey)) {
      return context.resolvedTemplates.get(cacheKey)!
    }

    try {
      // Use URL manager to resolve template
      const resolved = await this.urlManager.resolveURL(url, context.projectRoot)
      const templatePath = resolved.basePath

      // Parse template
      const parsed = await TemplateParser.parseTemplateFile(templatePath)
      if (!parsed.isValid) {
        throw new Error(`Invalid template: ${parsed.errors.join(', ')}`)
      }

      // Cache result
      context.resolvedTemplates.set(cacheKey, parsed.config)
      return parsed.config
    } catch (error: any) {
      throw ErrorHandler.createError(
        ErrorCode.TEMPLATE_RESOLUTION_ERROR,
        `Failed to resolve template: ${error.message}`,
        { url, version }
      )
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      debug('Evaluating condition: %s with variables: %o', condition, variables)
      
      // Enhanced expression evaluation with safety checks
      let expression = condition.trim()
      
      // Handle empty condition
      if (!expression) {
        debug('Empty condition evaluates to false')
        return false
      }
      
      // Handle common patterns
      if (this.isSimpleVariableCheck(expression)) {
        return this.evaluateSimpleVariableCheck(expression, variables)
      }
      
      // Replace variable references with values (more robust)
      expression = this.replaceVariableReferences(expression, variables)
      
      // Validate expression safety before evaluation
      if (!this.isSafeExpression(expression)) {
        debug('Unsafe expression detected: %s', expression)
        return false
      }

      // Evaluate the expression (using Function constructor with restricted context)
      const result = this.safeEvaluate(expression)
      const boolResult = Boolean(result)
      
      debug('Condition evaluation result: %s -> %s', condition, boolResult)
      return boolResult
    } catch (error) {
      debug('Condition evaluation failed: %s - %s', condition, error.message)
      return false
    }
  }

  /**
   * Check if expression is a simple variable check (e.g., "varName", "varName === true")
   */
  private isSimpleVariableCheck(expression: string): boolean {
    // Match patterns like: varName, varName === true, varName !== false, etc.
    return /^[a-zA-Z_][a-zA-Z0-9_]*(\s*[!=]==?\s*(true|false|null|undefined|'[^']*'|"[^"]*"|\d+))?$/.test(expression)
  }

  /**
   * Evaluate simple variable checks without using eval
   */
  private evaluateSimpleVariableCheck(expression: string, variables: Record<string, any>): boolean {
    const trimmed = expression.trim()
    
    // Just variable name
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const value = variables[trimmed]
      return value !== undefined && value !== null && value !== false && value !== ''
    }
    
    // Variable comparison
    const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*([!=]==?)\s*(.+)$/)
    if (match) {
      const [, varName, operator, expectedValue] = match
      const actualValue = variables[varName]
      const parsedExpected = this.parseValue(expectedValue)
      
      switch (operator) {
        case '===': return actualValue === parsedExpected
        case '!==': return actualValue !== parsedExpected
        case '==': return actualValue == parsedExpected  // eslint-disable-line eqeqeq
        case '!=': return actualValue != parsedExpected  // eslint-disable-line eqeqeq
        default: return false
      }
    }
    
    return false
  }

  /**
   * Parse a value from string representation
   */
  private parseValue(valueStr: string): any {
    const trimmed = valueStr.trim()
    
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null
    if (trimmed === 'undefined') return undefined
    
    // String literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1)
    }
    
    // Numbers
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10)
    }
    if (/^\d*\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed)
    }
    
    return trimmed
  }

  /**
   * Replace variable references in expression with their values
   */
  private replaceVariableReferences(expression: string, variables: Record<string, any>): string {
    let result = expression
    
    // Sort variables by name length (descending) to handle cases like "var" and "varName"
    const sortedVars = Object.entries(variables).sort(([a], [b]) => b.length - a.length)
    
    for (const [name, value] of sortedVars) {
      // Use word boundary to ensure we only replace complete variable names
      const regex = new RegExp(`\\b${name}\\b`, 'g')
      result = result.replace(regex, JSON.stringify(value))
    }
    
    return result
  }

  /**
   * Check if expression is safe to evaluate
   */
  private isSafeExpression(expression: string): boolean {
    // Disallow dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,          // require() calls
      /import\s*\(/,           // import() calls
      /eval\s*\(/,             // eval() calls
      /Function\s*\(/,         // Function() constructor
      /process\./,             // process object access
      /global\./,              // global object access
      /window\./,              // window object access
      /document\./,            // document object access
      /__proto__/,             // prototype pollution
      /constructor/,           // constructor access
      /\[\s*['"`]/,            // bracket notation with strings
      /\.\s*constructor/,      // constructor property access
    ]
    
    return !dangerousPatterns.some(pattern => pattern.test(expression))
  }

  /**
   * Safely evaluate an expression
   */
  private safeEvaluate(expression: string): any {
    // Create a restricted context for evaluation
    const allowedOperators = ['===', '!==', '==', '!=', '&&', '||', '!', '+', '-', '*', '/', '%', '<', '>', '<=', '>=']
    const allowedValues = ['true', 'false', 'null', 'undefined']
    
    // Very basic validation - in production, use a proper expression parser
    const tokens = expression.match(/[a-zA-Z0-9_.]+|[<>=!&|+\-*/%()]/g) || []
    
    try {
      // Use Function constructor with no access to external scope
      return new Function('return ' + expression)()
    } catch (error) {
      debug('Expression evaluation error: %s', error.message)
      return false
    }
  }

  /**
   * Apply variable overrides to a template
   */
  private applyVariableOverrides(
    template: TemplateConfig,
    overrides?: Record<string, any>
  ): TemplateConfig {
    if (!overrides) return template

    const result = { ...template }
    result.variables = { ...template.variables }

    for (const [name, value] of Object.entries(overrides)) {
      if (result.variables[name]) {
        result.variables[name] = {
          ...result.variables[name],
          default: value
        }
      }
    }

    return result
  }

  /**
   * Get conflict resolution strategy
   */
  private getConflictResolution(
    name: string,
    conflicts?: TemplateConfig['conflicts'],
    defaultStrategy: 'merge' | 'replace' | 'extend' | 'error' = 'merge'
  ): 'merge' | 'replace' | 'extend' | 'error' {
    if (!conflicts) return defaultStrategy

    // Check for specific rule
    if (conflicts.rules && conflicts.rules[name]) {
      return conflicts.rules[name]
    }

    // Use global strategy
    return conflicts.strategy || defaultStrategy
  }

  /**
   * Merge two variables
   */
  private mergeVariables(base: TemplateVariable, override: TemplateVariable): TemplateVariable {
    const merged: TemplateVariable = { ...base }

    // Override takes precedence for most fields
    if (override.type !== undefined) merged.type = override.type
    if (override.required !== undefined) merged.required = override.required
    if (override.default !== undefined) merged.default = override.default
    if (override.description !== undefined) merged.description = override.description
    if (override.pattern !== undefined) merged.pattern = override.pattern
    if (override.min !== undefined) merged.min = override.min
    if (override.max !== undefined) merged.max = override.max

    // Merge arrays
    if (override.values) {
      merged.values = [...(base.values || []), ...override.values]
      merged.values = [...new Set(merged.values)] // Remove duplicates
    }

    return merged
  }

  /**
   * Extend a variable (additive merge)
   */
  private extendVariable(base: TemplateVariable, extension: TemplateVariable): TemplateVariable {
    const extended: TemplateVariable = { ...base }

    // Extend arrays
    if (extension.values) {
      extended.values = [...(base.values || []), ...extension.values]
      extended.values = [...new Set(extended.values)] // Remove duplicates
    }

    // Extend min/max ranges
    if (extension.min !== undefined) {
      extended.min = Math.min(base.min || extension.min, extension.min)
    }
    if (extension.max !== undefined) {
      extended.max = Math.max(base.max || extension.max, extension.max)
    }

    // Concatenate descriptions
    if (extension.description && base.description) {
      extended.description = `${base.description} ${extension.description}`
    } else if (extension.description) {
      extended.description = extension.description
    }

    return extended
  }
}