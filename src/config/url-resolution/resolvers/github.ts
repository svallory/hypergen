/**
 * GitHub Repository Resolver
 * 
 * Resolves templates from GitHub repositories and caches them locally
 */

import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import https from 'https'
import { URL } from 'url'
import createDebug from 'debug'
import type {
  TemplateURLResolver,
  ResolvedTemplate,
  GitHubURLInfo,
  SecurityConfig
} from '../types.js'
import { URLResolutionError } from '../types.js'

const debug = createDebug('hypergen:v8:resolver:github')

export class GitHubResolver implements TemplateURLResolver {
  private security: SecurityConfig
  private timeout: number

  constructor(security: SecurityConfig = {}, timeout = 30000) {
    this.security = {
      requireHttps: true,
      maxFileSize: 1024 * 1024, // 1MB default
      ...security
    }
    this.timeout = timeout
  }

  supports(url: string): boolean {
    return url.startsWith('github:') || 
           url.includes('github.com') || 
           url.includes('raw.githubusercontent.com')
  }

  async resolve(url: string, basePath?: string): Promise<ResolvedTemplate> {
    debug('Resolving GitHub template: %s', url)
    
    try {
      const parsed = this.parseGitHubURL(url)
      
      // Security check
      this.validateSecurity(parsed)
      
      // Fetch template content
      const content = await this.fetchTemplateContent(parsed)
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(content).digest('hex')
      
      // Create temporary local path for the template
      const tempDir = await this.createTempDirectory(parsed)
      
      debug('Resolved GitHub template: %s@%s', parsed.repo, parsed.ref)
      
      return {
        content,
        basePath: tempDir,
        metadata: {
          url,
          type: 'github',
          version: parsed.version,
          lastFetched: new Date(),
          checksum
        }
      }
    } catch (error) {
      if (error instanceof URLResolutionError) {
        throw error
      }
      
      throw new URLResolutionError(
        `Failed to resolve GitHub template: ${error.message}`,
        url,
        'github',
        error
      )
    }
  }

  private parseGitHubURL(url: string): GitHubURLInfo {
    // Handle different GitHub URL formats:
    // github:owner/repo@version
    // github:owner/repo@version/path/to/template
    // https://github.com/owner/repo/tree/branch/path
    // https://raw.githubusercontent.com/owner/repo/branch/path/template.yml
    
    if (url.startsWith('github:')) {
      return this.parseGitHubShorthand(url)
    } else {
      return this.parseGitHubFullURL(url)
    }
  }

  private parseGitHubShorthand(url: string): GitHubURLInfo {
    // Format: github:owner/repo@version/path/to/template
    const parts = url.replace('github:', '').split('/')
    
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL format. Expected: github:owner/repo@version')
    }
    
    const [ownerRepo, ...pathParts] = parts
    const [owner, repoWithVersion] = ownerRepo.split('/')
    
    if (!repoWithVersion) {
      throw new Error('Invalid GitHub URL format. Missing repository name')
    }
    
    let repo: string
    let ref = 'main' // default branch
    let version: string | undefined
    
    if (repoWithVersion.includes('@')) {
      [repo, ref] = repoWithVersion.split('@')
      version = ref
    } else {
      repo = repoWithVersion
    }
    
    const templatePath = pathParts.length > 0 ? pathParts.join('/') : undefined
    
    return {
      type: 'github',
      url,
      owner,
      repo,
      ref,
      version,
      path: templatePath
    }
  }

  private parseGitHubFullURL(url: string): GitHubURLInfo {
    const urlObj = new URL(url)
    
    if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'raw.githubusercontent.com') {
      throw new Error('Unsupported GitHub domain')
    }
    
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL format')
    }
    
    const [owner, repo] = pathParts
    let ref = 'main'
    let templatePath: string | undefined
    
    if (urlObj.hostname === 'raw.githubusercontent.com') {
      // Format: https://raw.githubusercontent.com/owner/repo/branch/path/file.yml
      if (pathParts.length >= 3) {
        ref = pathParts[2]
        templatePath = pathParts.slice(3).join('/')
      }
    } else {
      // Format: https://github.com/owner/repo/tree/branch/path
      if (pathParts.includes('tree') && pathParts.length > 4) {
        const treeIndex = pathParts.indexOf('tree')
        ref = pathParts[treeIndex + 1]
        templatePath = pathParts.slice(treeIndex + 2).join('/')
      }
    }
    
    return {
      type: 'github',
      url,
      owner,
      repo,
      ref,
      path: templatePath
    }
  }

  private validateSecurity(parsed: GitHubURLInfo): void {
    // Check allowed/blocked domains
    if (this.security.allowedDomains && !this.security.allowedDomains.includes('github.com')) {
      throw new Error('GitHub domain not in allowed domains list')
    }
    
    if (this.security.blockedDomains?.includes('github.com')) {
      throw new Error('GitHub domain is blocked')
    }
    
    // Additional security checks can be added here
  }

  private async fetchTemplateContent(parsed: GitHubURLInfo): Promise<string> {
    // Build GitHub raw content URL
    const templatePath = parsed.path ? `${parsed.path}/template.yml` : 'template.yml'
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.ref}/${templatePath}`
    
    debug('Fetching from: %s', rawUrl)
    
    return new Promise((resolve, reject) => {
      const request = https.get(rawUrl, { timeout: this.timeout }, (response) => {
        // Check response status
        if (response.statusCode === 404) {
          reject(new Error(`Template not found: ${templatePath}`))
          return
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
          return
        }
        
        // Check content length
        const contentLength = parseInt(response.headers['content-length'] || '0')
        if (this.security.maxFileSize && contentLength > this.security.maxFileSize) {
          reject(new Error(`Template file too large: ${contentLength} bytes`))
          return
        }
        
        let data = ''
        let receivedBytes = 0
        
        response.on('data', (chunk) => {
          receivedBytes += chunk.length
          
          // Check size limit during download
          if (this.security.maxFileSize && receivedBytes > this.security.maxFileSize) {
            request.destroy()
            reject(new Error(`Template file too large: ${receivedBytes} bytes`))
            return
          }
          
          data += chunk
        })
        
        response.on('end', () => {
          debug('Fetched %d bytes from GitHub', receivedBytes)
          resolve(data)
        })
        
        response.on('error', reject)
      })
      
      request.on('timeout', () => {
        request.destroy()
        reject(new Error(`Request timeout after ${this.timeout}ms`))
      })
      
      request.on('error', reject)
    })
  }

  private async createTempDirectory(parsed: GitHubURLInfo): Promise<string> {
    const tempName = `github-${parsed.owner}-${parsed.repo}-${parsed.ref}`
    const tempDir = path.join('/tmp', 'hypergen-templates', tempName)
    
    await fs.ensureDir(tempDir)
    
    return tempDir
  }
}