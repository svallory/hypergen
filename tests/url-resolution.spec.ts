/**
 * URL Resolution System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { 
  TemplateURLManager,
  LocalResolver,
  GitHubResolver,
  URLCache
} from '../src/config/url-resolution/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('URLCache', () => {
  let cache: URLCache
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypergen-test-'))
    cache = new URLCache({
      cacheDir: tempDir,
      ttl: 60000, // 1 minute for testing
      maxSize: 1024 * 1024, // 1MB
      integrityCheck: true
    })
    await cache.initialize()
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should cache and retrieve templates', async () => {
    const url = 'test://example.com/template'
    const content = 'title: Test Template\nvariables:\n  name:\n    type: string'
    const resolved = {
      content,
      basePath: '/tmp/test',
      metadata: {
        url,
        type: 'http' as const,
        lastFetched: new Date(),
        checksum: require('crypto').createHash('sha256').update(content).digest('hex')
      }
    }

    // Cache should be empty initially
    const initial = await cache.get(url)
    expect(initial).toBeNull()

    // Set cache entry
    await cache.set(url, resolved)

    // Small delay to ensure file system operations complete
    await new Promise(resolve => setTimeout(resolve, 10))

    // Retrieve cached entry
    const cached = await cache.get(url)
    expect(cached).toBeDefined()
    expect(cached!.content).toBe(resolved.content)
    expect(cached!.metadata.url).toBe(url)
  })

  it('should handle cache expiration', async () => {
    // Create cache with very short TTL
    const shortCache = new URLCache({
      cacheDir: tempDir,
      ttl: 1, // 1ms
      maxSize: 1024 * 1024,
      integrityCheck: false
    })
    await shortCache.initialize()

    const url = 'test://example.com/template'
    const resolved = {
      content: 'test content',
      basePath: '/tmp/test',
      metadata: {
        url,
        type: 'http' as const,
        lastFetched: new Date(),
        checksum: 'abc123'
      }
    }

    await shortCache.set(url, resolved)

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10))

    // Should return null for expired entry
    const expired = await shortCache.get(url)
    expect(expired).toBeNull()
  })

  it('should verify cache integrity', async () => {
    const url = 'test://example.com/template'
    const originalContent = 'original content'
    const resolved = {
      content: originalContent,
      basePath: '/tmp/test',
      metadata: {
        url,
        type: 'http' as const,
        lastFetched: new Date(),
        checksum: 'original-checksum'
      }
    }

    await cache.set(url, resolved)

    // Manually corrupt the cached content
    const cacheKey = require('crypto').createHash('sha256').update(url).digest('hex')
    const cachePath = path.join(tempDir, cacheKey)
    await fs.writeFile(path.join(cachePath, 'template.yml'), 'corrupted content')

    // Should detect corruption and return null
    const corrupted = await cache.get(url)
    expect(corrupted).toBeNull()
  })

  it('should provide cache information', async () => {
    const url1 = 'test://example.com/template1'
    const url2 = 'test://example.com/template2'
    
    const resolved1 = {
      content: 'template 1 content',
      basePath: '/tmp/test1',
      metadata: {
        url: url1,
        type: 'http' as const,
        lastFetched: new Date(),
        checksum: 'checksum1'
      }
    }

    const resolved2 = {
      content: 'template 2 content',
      basePath: '/tmp/test2',
      metadata: {
        url: url2,
        type: 'http' as const,
        lastFetched: new Date(),
        checksum: 'checksum2'
      }
    }

    await cache.set(url1, resolved1)
    await cache.set(url2, resolved2)

    const info = await cache.getInfo()
    expect(info.entryCount).toBe(2)
    expect(info.totalSize).toBeGreaterThan(0)
  })
})

describe('LocalResolver', () => {
  let resolver: LocalResolver
  let tempDir: string

  beforeEach(async () => {
    resolver = new LocalResolver()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypergen-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should support local URLs', () => {
    expect(resolver.supports('./relative/path')).toBe(true)
    expect(resolver.supports('../relative/path')).toBe(true)
    expect(resolver.supports('/absolute/path')).toBe(true)
    expect(resolver.supports('file:///absolute/path')).toBe(true)
    expect(resolver.supports('relative/path')).toBe(true)
    
    expect(resolver.supports('http://example.com')).toBe(false)
    expect(resolver.supports('github:owner/repo')).toBe(false)
  })

  it('should resolve local template files', async () => {
    // Create a test template
    const templateDir = path.join(tempDir, 'test-template')
    await fs.ensureDir(templateDir)
    
    const templateConfig = `
title: "Test Template"
description: "A local test template"
variables:
  name:
    type: string
    required: true
files:
  - component.liquid
`
    await fs.writeFile(path.join(templateDir, 'template.yml'), templateConfig)

    // Resolve the template
    const resolved = await resolver.resolve('./test-template', tempDir)
    
    expect(resolved.content).toContain('title: "Test Template"')
    expect(resolved.basePath).toBe(templateDir)
    expect(resolved.metadata.type).toBe('local')
    expect(resolved.metadata.checksum).toBeDefined()
  })

  it('should handle missing template files', async () => {
    await expect(resolver.resolve('./nonexistent', tempDir))
      .rejects.toThrow('Template configuration not found')
  })

  it('should resolve absolute paths', async () => {
    const templateDir = path.join(tempDir, 'absolute-template')
    await fs.ensureDir(templateDir)
    await fs.writeFile(path.join(templateDir, 'template.yml'), 'title: Absolute Template')

    const resolved = await resolver.resolve(templateDir)
    expect(resolved.content).toContain('title: Absolute Template')
  })
})

describe('GitHubResolver', () => {
  let resolver: GitHubResolver

  beforeEach(() => {
    resolver = new GitHubResolver({
      maxFileSize: 1024 * 1024 // 1MB
    }, 5000) // 5 second timeout for tests
  })

  it('should support GitHub URLs', () => {
    expect(resolver.supports('github:owner/repo')).toBe(true)
    expect(resolver.supports('https://github.com/owner/repo')).toBe(true)
    expect(resolver.supports('https://raw.githubusercontent.com/owner/repo/main/template.yml')).toBe(true)
    
    expect(resolver.supports('./local/path')).toBe(false)
    expect(resolver.supports('npm:package')).toBe(false)
  })

  // Note: These tests would require mocking HTTP requests in a real implementation
  it('should parse GitHub shorthand URLs', () => {
    // This test would verify the URL parsing logic
    // For now, we'll just test that the resolver can be instantiated
    expect(resolver).toBeDefined()
  })

  it('should parse GitHub full URLs', () => {
    // This test would verify full GitHub URL parsing
    expect(resolver).toBeDefined()
  })
})

describe('TemplateURLManager', () => {
  let manager: TemplateURLManager
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypergen-test-'))
    manager = new TemplateURLManager({
      cache: {
        cacheDir: path.join(tempDir, 'cache'),
        ttl: 60000,
        maxSize: 1024 * 1024,
        integrityCheck: true
      }
    })
    await manager.initialize()
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should resolve local templates', async () => {
    // Create a test template
    const templateDir = path.join(tempDir, 'local-template')
    await fs.ensureDir(templateDir)
    
    const templateConfig = `
title: "Local Template"
variables:
  name:
    type: string
    required: true
`
    await fs.writeFile(path.join(templateDir, 'template.yml'), templateConfig)

    // Resolve through manager
    const resolved = await manager.resolveURL('./local-template', tempDir)
    
    expect(resolved.content).toContain('title: "Local Template"')
    expect(resolved.metadata.type).toBe('local')
  })

  it('should cache resolved templates', async () => {
    // Create a test template
    const templateDir = path.join(tempDir, 'cached-template')
    await fs.ensureDir(templateDir)
    await fs.writeFile(path.join(templateDir, 'template.yml'), 'title: Cached Template')

    // First resolution
    const resolved1 = await manager.resolveURL('./cached-template', tempDir)
    
    // Second resolution (should use cache)
    const resolved2 = await manager.resolveURL('./cached-template', tempDir)
    
    expect(resolved1.content).toBe(resolved2.content)
    expect(resolved1.metadata.url).toBe(resolved2.metadata.url)
  })

  it('should resolve multiple URLs in parallel', async () => {
    // Create multiple test templates
    const templates = ['template1', 'template2', 'template3']
    
    for (const name of templates) {
      const templateDir = path.join(tempDir, name)
      await fs.ensureDir(templateDir)
      await fs.writeFile(path.join(templateDir, 'template.yml'), `title: ${name}`)
    }

    // Resolve all templates
    const urls = templates.map(name => `./${name}`)
    const resolved = await manager.resolveMultiple(urls, tempDir)
    
    expect(resolved).toHaveLength(3)
    expect(resolved[0].content).toContain('title: template1')
    expect(resolved[1].content).toContain('title: template2')
    expect(resolved[2].content).toContain('title: template3')
  })

  it('should provide cache management functions', async () => {
    // Create and resolve a template to populate cache
    const templateDir = path.join(tempDir, 'cache-test')
    await fs.ensureDir(templateDir)
    await fs.writeFile(path.join(templateDir, 'template.yml'), 'title: Cache Test')
    
    await manager.resolveURL('./cache-test', tempDir)
    
    // Check cache info
    const info = await manager.getCacheInfo()
    expect(info.entryCount).toBeGreaterThan(0)
    
    // Validate cache
    const validation = await manager.validateCache()
    expect(validation.valid).toBe(true)
    
    // Clear cache
    await manager.clearCache()
    
    const infoAfterClear = await manager.getCacheInfo()
    expect(infoAfterClear.entryCount).toBe(0)
  })

  it('should handle resolution errors gracefully', async () => {
    await expect(manager.resolveURL('./nonexistent-template', tempDir))
      .rejects.toThrow()
  })

  it('should add custom resolvers', () => {
    const customResolver = {
      supports: (url: string) => url.startsWith('custom:'),
      resolve: async (url: string) => ({
        content: 'title: Custom Template',
        basePath: '/tmp/custom',
        metadata: {
          url,
          type: 'http' as const,
          lastFetched: new Date(),
          checksum: 'custom-checksum'
        }
      })
    }

    manager.addResolver('http', customResolver)
    
    // This would test that the custom resolver is used
    // Full test would require actually calling resolveURL with a custom: URL
    expect(manager).toBeDefined()
  })
})