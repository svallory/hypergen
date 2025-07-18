/**
 * URL Resolution System
 * 
 * Export point for template URL resolution functionality
 */

export * from './types.js'
export { TemplateURLManager } from './manager.js'
export { URLCache } from './cache.js'

// Resolvers
export { LocalResolver } from './resolvers/local.js'
export { GitHubResolver } from './resolvers/github.js'

// Re-export main types for convenience
export type {
  TemplateURLResolver,
  ResolvedTemplate,
  URLManagerConfig,
  SecurityConfig,
  URLCacheConfig
} from './types.js'