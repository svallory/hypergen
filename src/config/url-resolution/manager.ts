/**
 * Template URL Manager
 * 
 * Main orchestrator for template URL resolution and caching
 */

import path from 'path'
import os from 'os'
import createDebug from 'debug'
import { URLCache } from './cache.js'
import { LocalResolver } from './resolvers/local.js'
import { GitHubResolver } from './resolvers/github.js'
import type {
  TemplateURLResolver,
  ResolvedTemplate,
  URLManagerConfig,
  URLType,
  URLInfo,
  CacheInfo,
  ValidationResult,
  SecurityConfig,
  URLCacheConfig
} from './types.js'
import { URLResolutionError } from './types.js'

const debug = createDebug('hypergen:v8:url-manager')

export class TemplateURLManager {
  private resolvers: Map<URLType, TemplateURLResolver>
  private cache: URLCache
  private config: URLManagerConfig

  constructor(config?: Partial<URLManagerConfig>) {
    // Default configuration
    this.config = {
      cache: {
        cacheDir: path.join(os.homedir(), '.hypergen', 'cache'),
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        maxSize: 100 * 1024 * 1024, // 100MB
        integrityCheck: true,
        ...config?.cache
      },
      security: {
        allowedDomains: ['github.com', 'gist.github.com', 'raw.githubusercontent.com'],
        requireHttps: true,
        maxFileSize: 1024 * 1024, // 1MB
        ...config?.security
      },
      timeout: config?.timeout || 30000,
      resolvers: config?.resolvers || {}
    }

    // Initialize cache
    this.cache = new URLCache(this.config.cache)

    // Initialize resolvers
    this.resolvers = new Map()
    this.setupDefaultResolvers()
    
    // Add any custom resolvers
    if (this.config.resolvers) {
      for (const [type, resolver] of Object.entries(this.config.resolvers)) {
        this.resolvers.set(type as URLType, resolver)
      }
    }

    debug('URL Manager initialized with %d resolvers', this.resolvers.size)
  }

  async initialize(): Promise<void> {
    await this.cache.initialize()
    debug('URL Manager ready')
  }

  async resolveURL(url: string, basePath?: string): Promise<ResolvedTemplate> {
    debug('Resolving URL: %s from %s', url, basePath)
    
    try {
      // Check cache first
      const cached = await this.cache.get(url)
      if (cached) {
        debug('Using cached template for %s', url)
        return cached
      }
      
      // Parse URL to determine type
      const urlInfo = this.parseURL(url)
      
      // Find appropriate resolver
      const resolver = this.findResolver(url, urlInfo.type)
      if (!resolver) {
        throw new URLResolutionError(
          `No resolver found for URL type: ${urlInfo.type}`,
          url,
          urlInfo.type
        )
      }
      
      // Resolve the template
      const resolved = await resolver.resolve(url, basePath)
      
      // Cache the result
      await this.cache.set(url, resolved)
      
      debug('Successfully resolved and cached %s', url)
      return resolved
    } catch (error) {
      debug('Failed to resolve %s: %s', url, error.message)
      throw error
    }
  }

  async resolveMultiple(urls: string[], basePath?: string): Promise<ResolvedTemplate[]> {
    debug('Resolving %d URLs in parallel', urls.length)
    
    const promises = urls.map(url => this.resolveURL(url, basePath))
    return Promise.all(promises)
  }

  async clearCache(): Promise<void> {
    await this.cache.clear()
    debug('Cache cleared')
  }

  async getCacheInfo(): Promise<CacheInfo> {
    return await this.cache.getInfo()
  }

  async validateCache(): Promise<ValidationResult> {
    return await this.cache.validate()
  }

  addResolver(type: URLType, resolver: TemplateURLResolver): void {
    this.resolvers.set(type, resolver)
    debug('Added resolver for type: %s', type)
  }

  setConfig(config: Partial<URLManagerConfig>): void {
    this.config = { ...this.config, ...config }
    debug('Configuration updated')
  }

  private setupDefaultResolvers(): void {
    // Local file resolver
    this.resolvers.set('local', new LocalResolver())
    
    // GitHub resolver
    this.resolvers.set('github', new GitHubResolver(this.config.security, this.config.timeout))
    
    // TODO: Add more resolvers
    // this.resolvers.set('gist', new GistResolver(this.config.security, this.config.timeout))
    // this.resolvers.set('npm', new NpmResolver(this.config.security, this.config.timeout))
    // this.resolvers.set('http', new HttpResolver(this.config.security, this.config.timeout))
  }

  private parseURL(url: string): URLInfo {
    if (url.startsWith('github:') || url.includes('github.com')) {
      return { type: 'github', url }
    } else if (url.startsWith('gist:') || url.includes('gist.github.com')) {
      return { type: 'gist', url }
    } else if (url.startsWith('npm:')) {
      return { type: 'npm', url }
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return { type: 'http', url }
    } else {
      return { type: 'local', url }
    }
  }

  private findResolver(url: string, type: URLType): TemplateURLResolver | undefined {
    // First try to find resolver by type
    const resolver = this.resolvers.get(type)
    if (resolver && resolver.supports(url)) {
      return resolver
    }
    
    // Fallback: iterate through all resolvers to find one that supports the URL
    for (const resolver of this.resolvers.values()) {
      if (resolver.supports(url)) {
        return resolver
      }
    }
    
    return undefined
  }
}