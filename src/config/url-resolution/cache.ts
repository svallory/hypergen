/**
 * URL Resolution Cache
 * 
 * Implements caching for resolved templates with TTL and integrity checking
 */

import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import createDebug from 'debug'
import type {
  ResolvedTemplate,
  URLCacheConfig,
  CacheInfo,
  ValidationResult
} from './types.js'

const debug = createDebug('hypergen:v8:cache')

export class URLCache {
  private cacheDir: string
  private config: URLCacheConfig
  private hitCount = 0
  private missCount = 0

  constructor(config: URLCacheConfig) {
    this.config = config
    this.cacheDir = path.resolve(config.cacheDir)
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.cacheDir)
    debug('Cache initialized at %s', this.cacheDir)
  }

  async get(url: string): Promise<ResolvedTemplate | null> {
    const cacheKey = this.getCacheKey(url)
    const cachePath = path.join(this.cacheDir, cacheKey)
    
    try {
      if (await fs.pathExists(cachePath)) {
        const metadataPath = path.join(cachePath, 'metadata.json')
        const contentPath = path.join(cachePath, 'template.yml')
        
        if (await fs.pathExists(metadataPath) && await fs.pathExists(contentPath)) {
          const metadata = await fs.readJSON(metadataPath)
          const content = await fs.readFile(contentPath, 'utf-8')
          
          // Check if cache entry is expired
          if (this.isExpired(metadata)) {
            debug('Cache entry expired for %s', url)
            await this.delete(url)
            this.missCount++
            return null
          }
          
          // Verify integrity if enabled
          if (this.config.integrityCheck) {
            const expectedChecksum = metadata.metadata.checksum
            const actualChecksum = this.calculateChecksum(content)
            
            if (expectedChecksum !== actualChecksum) {
              debug('Cache integrity check failed for %s', url)
              await this.delete(url)
              this.missCount++
              return null
            }
          }
          
          this.hitCount++
          debug('Cache hit for %s', url)
          
          return {
            content,
            basePath: cachePath,
            metadata: metadata.metadata
          }
        }
      }
    } catch (error) {
      debug('Cache read error for %s: %s', url, error.message)
    }
    
    this.missCount++
    debug('Cache miss for %s', url)
    return null
  }

  async set(url: string, resolved: ResolvedTemplate): Promise<void> {
    const cacheKey = this.getCacheKey(url)
    const cachePath = path.join(this.cacheDir, cacheKey)
    
    try {
      await fs.ensureDir(cachePath)
      
      // Write content
      await fs.writeFile(path.join(cachePath, 'template.yml'), resolved.content)
      
      // Write metadata
      const metadata = {
        metadata: resolved.metadata,
        cachedAt: new Date(),
        size: Buffer.byteLength(resolved.content, 'utf-8')
      }
      
      await fs.writeJSON(path.join(cachePath, 'metadata.json'), metadata, { spaces: 2 })
      
      debug('Cached template for %s at %s', url, cachePath)
      
      // Check cache size and cleanup if needed
      await this.cleanupIfNeeded()
    } catch (error) {
      debug('Cache write error for %s: %s', url, error.message)
      throw error
    }
  }

  async delete(url: string): Promise<void> {
    const cacheKey = this.getCacheKey(url)
    const cachePath = path.join(this.cacheDir, cacheKey)
    
    try {
      if (await fs.pathExists(cachePath)) {
        await fs.remove(cachePath)
        debug('Deleted cache entry for %s', url)
      }
    } catch (error) {
      debug('Cache delete error for %s: %s', url, error.message)
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.emptyDir(this.cacheDir)
      this.hitCount = 0
      this.missCount = 0
      debug('Cache cleared')
    } catch (error) {
      debug('Cache clear error: %s', error.message)
      throw error
    }
  }

  async getInfo(): Promise<CacheInfo> {
    const entries = await this.getAllEntries()
    
    let totalSize = 0
    let oldestEntry = new Date()
    let newestEntry = new Date(0)
    
    for (const entry of entries) {
      totalSize += entry.size
      
      if (entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt
      }
      
      if (entry.cachedAt > newestEntry) {
        newestEntry = entry.cachedAt
      }
    }
    
    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0
    
    return {
      totalSize,
      entryCount: entries.length,
      oldestEntry: entries.length > 0 ? oldestEntry : new Date(),
      newestEntry: entries.length > 0 ? newestEntry : new Date(),
      hitRate
    }
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      const entries = await this.getAllEntries()
      
      for (const entry of entries) {
        const cachePath = path.join(this.cacheDir, entry.cacheKey)
        const contentPath = path.join(cachePath, 'template.yml')
        
        // Check if content file exists
        if (!await fs.pathExists(contentPath)) {
          errors.push(`Missing content file for ${entry.url}`)
          continue
        }
        
        // Verify integrity if enabled
        if (this.config.integrityCheck && entry.metadata.checksum) {
          const content = await fs.readFile(contentPath, 'utf-8')
          const actualChecksum = this.calculateChecksum(content)
          
          if (entry.metadata.checksum !== actualChecksum) {
            errors.push(`Integrity check failed for ${entry.url}`)
          }
        }
        
        // Check if entry is expired
        if (this.isExpired(entry)) {
          warnings.push(`Expired entry: ${entry.url}`)
        }
      }
    } catch (error) {
      errors.push(`Cache validation error: ${error.message}`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex')
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private isExpired(entry: any): boolean {
    const age = Date.now() - new Date(entry.cachedAt).getTime()
    return age > this.config.ttl
  }

  private async getAllEntries(): Promise<Array<{
    cacheKey: string
    url: string
    metadata: any
    cachedAt: Date
    size: number
  }>> {
    const entries: any[] = []
    
    try {
      const cacheKeys = await fs.readdir(this.cacheDir)
      
      for (const cacheKey of cacheKeys) {
        const metadataPath = path.join(this.cacheDir, cacheKey, 'metadata.json')
        
        if (await fs.pathExists(metadataPath)) {
          try {
            const metadata = await fs.readJSON(metadataPath)
            entries.push({
              cacheKey,
              url: metadata.metadata.url,
              metadata: metadata.metadata,
              cachedAt: new Date(metadata.cachedAt),
              size: metadata.size || 0
            })
          } catch (error) {
            debug('Error reading metadata for %s: %s', cacheKey, error.message)
          }
        }
      }
    } catch (error) {
      debug('Error listing cache entries: %s', error.message)
    }
    
    return entries
  }

  private async cleanupIfNeeded(): Promise<void> {
    const info = await this.getInfo()
    
    if (info.totalSize > this.config.maxSize) {
      debug('Cache size (%d) exceeds limit (%d), cleaning up', info.totalSize, this.config.maxSize)
      
      // Get all entries sorted by last accessed time (LRU)
      const entries = await this.getAllEntries()
      entries.sort((a, b) => a.cachedAt.getTime() - b.cachedAt.getTime())
      
      // Remove oldest entries until we're under the size limit
      let currentSize = info.totalSize
      for (const entry of entries) {
        if (currentSize <= this.config.maxSize * 0.8) { // Remove extra 20% for buffer
          break
        }
        
        await this.delete(entry.url)
        currentSize -= entry.size
        debug('Removed cache entry for %s (size: %d)', entry.url, entry.size)
      }
    }
  }
}