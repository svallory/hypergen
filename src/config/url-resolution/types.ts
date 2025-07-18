/**
 * URL Resolution Types
 * 
 * Type definitions for template URL resolution and caching
 */

// URL resolver interface
export interface TemplateURLResolver {
  resolve(url: string, basePath?: string): Promise<ResolvedTemplate>
  supports(url: string): boolean
}

// Resolved template information
export interface ResolvedTemplate {
  content: string // template.yml content
  basePath: string // local path where template is cached
  metadata: TemplateMetadata
}

export interface TemplateMetadata {
  url: string
  type: URLType
  version?: string
  lastFetched: Date
  etag?: string
  checksum: string
}

export type URLType = 'github' | 'gist' | 'npm' | 'http' | 'local'

// Cache configuration
export interface URLCacheConfig {
  cacheDir: string
  ttl: number // time to live in milliseconds
  maxSize: number // max cache size in bytes
  integrityCheck: boolean
}

export interface URLManagerConfig {
  cache: URLCacheConfig
  resolvers?: Partial<Record<URLType, TemplateURLResolver>>
  security: SecurityConfig
  timeout: number
}

export interface SecurityConfig {
  allowedDomains?: string[]
  blockedDomains?: string[]
  allowPrivateRepos?: boolean
  requireHttps?: boolean
  maxFileSize?: number
}

// URL parsing results
export interface URLInfo {
  type: URLType
  url: string
  version?: string
}

export interface GitHubURLInfo extends URLInfo {
  type: 'github'
  owner: string
  repo: string
  path?: string
  ref: string // branch, tag, or commit
}

export interface GistURLInfo extends URLInfo {
  type: 'gist'
  username: string
  gistId: string
  filename?: string
}

export interface NpmURLInfo extends URLInfo {
  type: 'npm'
  packageName: string
  path?: string
}

// Cache information
export interface CacheInfo {
  totalSize: number
  entryCount: number
  oldestEntry: Date
  newestEntry: Date
  hitRate: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Error types
export class URLResolutionError extends Error {
  constructor(
    message: string,
    public url: string,
    public type: URLType,
    public cause?: Error
  ) {
    super(message)
    this.name = 'URLResolutionError'
  }
}