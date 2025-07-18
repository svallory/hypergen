/**
 * V8 Configuration System
 * 
 * Export point for the new template.yml configuration system
 */

export * from './types.js'
export { TemplateConfigParser } from './parser.js'

// Re-export for convenience
export type {
  TemplateConfig,
  ParsedTemplateConfig,
  ResolvedVariables,
  VariableDefinition,
  TemplateInclude,
  ParserOptions
} from './types.js'