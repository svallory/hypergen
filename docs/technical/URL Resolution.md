# URL Resolution Implementation

## Overview

The URL Resolution system enables template composition by fetching templates from various sources including GitHub repositories, GitHub Gists, npm packages, and HTTP URLs. This is a core feature of V8's composability architecture.

## Architecture Integration

URL Resolution fits into V8 architecture as:
- **Templates**: Can include other templates via URL references
- **Composition**: `includes` array in template.yml specifies remote templates
- **Caching**: Downloaded templates are cached for performance and offline usage

## Implementation Details

### Data Structures

```typescript
// URL resolver interface
interface TemplateURLResolver {
  resolve(url: string, basePath?: string): Promise<ResolvedTemplate>
  supports(url: string): boolean
}

// Resolved template information
interface ResolvedTemplate {
  content: string // template.yml content
  basePath: string // local path where template is cached
  metadata: TemplateMetadata
}

interface TemplateMetadata {
  url: string
  type: URLType
  version?: string
  lastFetched: Date
  etag?: string
  checksum: string
}

type URLType = 'github' | 'gist' | 'npm' | 'http' | 'local'

// Cache configuration
interface URLCacheConfig {
  cacheDir: string
  ttl: number // time to live in milliseconds
  maxSize: number // max cache size in bytes
  integrityCheck: boolean
}
```

### Core Algorithms

#### 1. URL Resolution Strategy
```typescript
class TemplateURLManager {
  private resolvers: Map<URLType, TemplateURLResolver>
  private cache: URLCache

  async resolveURL(url: string, basePath?: string): Promise<ResolvedTemplate> {
    // 1. Parse URL and determine type
    const urlInfo = this.parseURL(url)
    
    // 2. Check cache first
    const cached = await this.cache.get(url)
    if (cached && !this.cache.isExpired(cached)) {
      return cached
    }
    
    // 3. Find appropriate resolver
    const resolver = this.resolvers.get(urlInfo.type)
    if (!resolver) {
      throw new Error(`No resolver for URL type: ${urlInfo.type}`)
    }
    
    // 4. Resolve and cache
    const resolved = await resolver.resolve(url, basePath)
    await this.cache.set(url, resolved)
    
    return resolved
  }

  parseURL(url: string): URLInfo {
    if (url.startsWith('github:')) {
      return this.parseGitHubURL(url)
    } else if (url.startsWith('gist:')) {
      return this.parseGistURL(url)
    } else if (url.startsWith('npm:')) {
      return this.parseNpmURL(url)
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return { type: 'http', url, version: undefined }
    } else {
      return { type: 'local', url, version: undefined }
    }
  }
}
```

#### 2. GitHub Repository Resolver
```typescript
class GitHubResolver implements TemplateURLResolver {
  supports(url: string): boolean {
    return url.startsWith('github:')
  }

  async resolve(url: string): Promise<ResolvedTemplate> {
    // Parse: github:owner/repo@version/path/to/template
    const parsed = this.parseGitHubURL(url)
    
    // Use GitHub API or git clone
    const content = await this.fetchFromGitHub(parsed)
    
    // Extract and validate template.yml
    const templateConfig = this.extractTemplateConfig(content)
    
    return {
      content: templateConfig,
      basePath: await this.createLocalCache(parsed),
      metadata: {
        url,
        type: 'github',
        version: parsed.version,
        lastFetched: new Date(),
        checksum: this.calculateChecksum(content)
      }
    }
  }

  private async fetchFromGitHub(parsed: GitHubURLInfo): Promise<TemplateBundle> {
    // Option 1: Use GitHub API for single files
    if (parsed.path) {
      return await this.fetchFileViaAPI(parsed)
    }
    
    // Option 2: Use degit for full repository/subdirectory
    return await this.fetchViaGit(parsed)
  }
}
```

#### 3. Caching System
```typescript
class URLCache {
  private cacheDir: string
  private config: URLCacheConfig

  async get(url: string): Promise<ResolvedTemplate | null> {
    const cacheKey = this.getCacheKey(url)
    const cachePath = path.join(this.cacheDir, cacheKey)
    
    if (await fs.pathExists(cachePath)) {
      const cached = await fs.readJSON(path.join(cachePath, 'metadata.json'))
      const content = await fs.readFile(path.join(cachePath, 'template.yml'), 'utf-8')
      
      return {
        content,
        basePath: cachePath,
        metadata: cached.metadata
      }
    }
    
    return null
  }

  async set(url: string, resolved: ResolvedTemplate): Promise<void> {
    const cacheKey = this.getCacheKey(url)
    const cachePath = path.join(this.cacheDir, cacheKey)
    
    await fs.ensureDir(cachePath)
    await fs.writeFile(path.join(cachePath, 'template.yml'), resolved.content)
    await fs.writeJSON(path.join(cachePath, 'metadata.json'), {
      metadata: resolved.metadata,
      cachedAt: new Date()
    })
  }

  isExpired(cached: ResolvedTemplate): boolean {
    const age = Date.now() - cached.metadata.lastFetched.getTime()
    return age > this.config.ttl
  }
}
```

### Error Handling

```typescript
class URLResolutionError extends Error {
  constructor(
    message: string,
    public url: string,
    public type: URLType,
    public cause?: Error
  ) {
    super(message)
  }
}

// Common error scenarios:
- Network failures
- Invalid URLs
- Authentication failures (private repos)
- Template not found
- Malformed template.yml
- Cache corruption
- Disk space issues
```

## API Design

### Public Interface
```typescript
export class TemplateURLManager {
  constructor(config?: URLManagerConfig)
  
  async resolveURL(url: string, basePath?: string): Promise<ResolvedTemplate>
  async resolveMultiple(urls: string[], basePath?: string): Promise<ResolvedTemplate[]>
  
  // Cache management
  async clearCache(): Promise<void>
  async getCacheInfo(): Promise<CacheInfo>
  async validateCache(): Promise<ValidationResult>
  
  // Configuration
  addResolver(type: URLType, resolver: TemplateURLResolver): void
  setConfig(config: Partial<URLManagerConfig>): void
}

export interface URLManagerConfig {
  cache: URLCacheConfig
  resolvers?: Record<URLType, TemplateURLResolver>
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
```

### Usage Examples
```typescript
// Basic usage
const urlManager = new TemplateURLManager()
const template = await urlManager.resolveURL('github:react-team/templates@v1.0.0')

// With configuration
const urlManager = new TemplateURLManager({
  cache: {
    cacheDir: '~/.hypergen/cache',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1024 * 1024 * 100, // 100MB
    integrityCheck: true
  },
  security: {
    allowedDomains: ['github.com', 'gist.github.com'],
    requireHttps: true,
    maxFileSize: 1024 * 1024 // 1MB
  },
  timeout: 30000 // 30 seconds
})

// Batch resolution
const templates = await urlManager.resolveMultiple([
  'github:react-team/base@v1.0.0',
  'gist:user/abc123',
  'npm:@company/templates@^2.0.0'
])
```

## Testing Strategy

### Unit Tests
- URL parsing for all supported formats
- Cache operations (get, set, expiration)
- Security validation
- Error handling for network failures
- Integrity checking

### Integration Tests
- End-to-end URL resolution
- GitHub API integration
- Cache performance
- Concurrent resolution handling

### Mock Testing
```typescript
// Mock GitHub API responses
class MockGitHubResolver implements TemplateURLResolver {
  private mockResponses = new Map<string, string>()
  
  setMockResponse(url: string, content: string): void {
    this.mockResponses.set(url, content)
  }
  
  async resolve(url: string): Promise<ResolvedTemplate> {
    const content = this.mockResponses.get(url)
    if (!content) throw new Error('Mock not found')
    return { content, basePath: '/tmp/mock', metadata: {...} }
  }
}
```

## Performance Considerations

### Optimization Strategies
- **Parallel Resolution**: Resolve multiple URLs concurrently
- **Smart Caching**: LRU cache with configurable TTL
- **Partial Downloads**: Only fetch template.yml when possible
- **Compression**: Compress cached content
- **CDN Support**: Use GitHub's CDN for raw content

### Memory Management
- Stream large files instead of loading into memory
- Cleanup temporary files after processing
- Bounded cache size with automatic eviction
- Background cache cleanup process

### Network Optimization
- Connection pooling for HTTP requests
- Request deduplication for concurrent identical requests
- Progressive timeout strategy
- Retry logic with exponential backoff

## Security Considerations

### URL Validation
- Domain whitelist/blacklist
- Path traversal prevention
- Maximum URL length limits
- Protocol restrictions (HTTPS only)

### Content Security
- File size limits
- Content type validation
- Virus scanning integration
- Integrity verification (checksums)

### Access Control
- GitHub token authentication for private repos
- Rate limiting to prevent abuse
- Audit logging for security monitoring
- Sandbox execution for untrusted content

### Cache Security
- Secure cache directory permissions
- Encrypted cache for sensitive templates
- Cache poisoning prevention
- Regular cache validation

## Migration Path

### From Current System
1. **Backward Compatibility**: Support existing local templates
2. **Gradual Migration**: Allow mixed local/remote includes
3. **Migration Tools**: Convert local templates to distributable format

### Breaking Changes
- New include syntax in template.yml
- Cache directory structure
- Configuration format changes

## Examples

### GitHub Repository Templates
```yaml
# Include entire template
includes:
  - url: "github:react-team/base-component@v1.0.0"
    variables:
      name: "{{ name }}"

# Include specific path within repo
includes:
  - url: "github:company/templates@main/react/component"
    variables:
      typescript: true
```

### GitHub Gist Templates
```yaml
includes:
  - url: "gist:username/abc123def456"
  - url: "https://gist.github.com/username/abc123def456"
```

### npm Package Templates
```yaml
includes:
  - url: "npm:@company/hypergen-templates@^2.0.0"
  - url: "npm:@storybook/templates@latest/react-component"
```

### HTTP URLs
```yaml
includes:
  - url: "https://raw.githubusercontent.com/user/repo/main/template.yml"
  - url: "https://cdn.company.com/templates/v1/react-component.yml"
```

### Local Templates (Relative Paths)
```yaml
includes:
  - url: "./shared/base-component"
  - url: "../common/styles"
  - url: "/absolute/path/to/template"
```

This URL resolution system enables true template composability while maintaining security, performance, and reliability.