/**
 * Template Dependency Manager
 * 
 * Handles template dependency resolution, installation, and management
 */

import createDebug from 'debug'
import fs from 'fs'
import path from 'path'
import { TemplateURLManager } from './url-resolution/index.js'
import { TemplateParser, type TemplateDependency, type TemplateConfig } from './template-parser.js'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'

const debug = createDebug('hypergen:v8:dependency-manager')

export interface DependencyResolutionOptions {
  projectRoot?: string
  cacheDir?: string
  allowOptional?: boolean
  skipDev?: boolean
  timeout?: number
}

export interface ResolvedDependency {
  name: string
  version?: string
  type: 'npm' | 'github' | 'local' | 'http'
  localPath?: string
  url?: string
  optional: boolean
  dev: boolean
  resolved: boolean
  error?: string
}

export interface DependencyGraph {
  dependencies: ResolvedDependency[]
  conflicts: Array<{
    name: string
    versions: string[]
    sources: string[]
  }>
  missing: Array<{
    name: string
    requiredBy: string
    optional: boolean
  }>
}

export class TemplateDependencyManager {
  private urlManager = new TemplateURLManager()
  private resolvedCache = new Map<string, ResolvedDependency>()

  /**
   * Resolve all dependencies for a template
   */
  async resolveDependencies(
    template: TemplateConfig,
    options: DependencyResolutionOptions = {}
  ): Promise<DependencyGraph> {
    debug('Resolving dependencies for template: %s', template.name)

    const {
      projectRoot = process.cwd(),
      allowOptional = true,
      skipDev = false,
      timeout = 30000
    } = options

    const result: DependencyGraph = {
      dependencies: [],
      conflicts: [],
      missing: []
    }

    if (!template.dependencies || template.dependencies.length === 0) {
      debug('No dependencies found for template: %s', template.name)
      return result
    }

    // Normalize dependencies to TemplateDependency objects
    const normalizedDeps = this.normalizeDependencies(template.dependencies)

    // Filter dependencies based on options
    const filteredDeps = normalizedDeps.filter(dep => {
      if (dep.dev && skipDev) return false
      if (dep.optional && !allowOptional) return false
      return true
    })

    debug('Processing %d dependencies', filteredDeps.length)

    // Resolve each dependency
    for (const dep of filteredDeps) {
      try {
        const resolved = await this.resolveSingleDependency(dep, {
          projectRoot,
          timeout
        })
        result.dependencies.push(resolved)
      } catch (error: any) {
        debug('Failed to resolve dependency %s: %s', dep.name, error.message)
        
        if (!dep.optional) {
          result.missing.push({
            name: dep.name,
            requiredBy: template.name,
            optional: false
          })
        }

        result.dependencies.push({
          name: dep.name,
          version: dep.version,
          type: dep.type || 'npm',
          url: dep.url,
          optional: dep.optional || false,
          dev: dep.dev || false,
          resolved: false,
          error: error.message
        })
      }
    }

    // Detect conflicts
    result.conflicts = this.detectConflicts(result.dependencies)

    debug('Dependency resolution complete: %d resolved, %d conflicts, %d missing', 
      result.dependencies.filter(d => d.resolved).length,
      result.conflicts.length,
      result.missing.length)

    return result
  }

  /**
   * Resolve a single dependency
   */
  private async resolveSingleDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<ResolvedDependency> {
    const cacheKey = `${dependency.name}@${dependency.version || 'latest'}`
    
    // Check cache first
    if (this.resolvedCache.has(cacheKey)) {
      return this.resolvedCache.get(cacheKey)!
    }

    debug('Resolving dependency: %s', dependency.name)

    let localPath: string | undefined
    let resolved = false

    try {
      switch (dependency.type) {
        case 'npm':
          localPath = await this.resolveNpmDependency(dependency, options)
          resolved = true
          break
        
        case 'github':
          localPath = await this.resolveGitHubDependency(dependency, options)
          resolved = true
          break
        
        case 'local':
          localPath = await this.resolveLocalDependency(dependency, options)
          resolved = true
          break
        
        case 'http':
          localPath = await this.resolveHttpDependency(dependency, options)
          resolved = true
          break
        
        default:
          // Try to auto-detect type based on dependency name/url
          localPath = await this.resolveAutoDependency(dependency, options)
          resolved = true
          break
      }
    } catch (error: any) {
      if (!dependency.optional) {
        throw error
      }
      debug('Optional dependency %s failed to resolve: %s', dependency.name, error.message)
    }

    const result: ResolvedDependency = {
      name: dependency.name,
      version: dependency.version,
      type: dependency.type || 'npm',
      localPath,
      url: dependency.url,
      optional: dependency.optional || false,
      dev: dependency.dev || false,
      resolved
    }

    // Cache the result
    this.resolvedCache.set(cacheKey, result)
    return result
  }

  /**
   * Resolve NPM dependency
   */
  private async resolveNpmDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<string> {
    debug('Resolving NPM dependency: %s', dependency.name)

    // For now, just check if it exists in node_modules
    const nodeModulesPath = path.join(options.projectRoot, 'node_modules', dependency.name)
    
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath
    }

    // In a real implementation, this would:
    // 1. Check npm registry for the package
    // 2. Download and install if needed
    // 3. Return the local path
    throw ErrorHandler.createError(
      ErrorCode.DEPENDENCY_RESOLUTION_ERROR,
      `NPM dependency not found: ${dependency.name}`,
      { dependency: dependency.name, type: 'npm' }
    )
  }

  /**
   * Resolve GitHub dependency
   */
  private async resolveGitHubDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<string> {
    debug('Resolving GitHub dependency: %s', dependency.name)

    const url = dependency.url || `github:${dependency.name}`
    
    try {
      const resolved = await this.urlManager.resolveURL(url, options.projectRoot)
      return resolved.basePath
    } catch (error: any) {
      throw ErrorHandler.createError(
        ErrorCode.DEPENDENCY_RESOLUTION_ERROR,
        `GitHub dependency resolution failed: ${error.message}`,
        { dependency: dependency.name, type: 'github', url }
      )
    }
  }

  /**
   * Resolve local dependency
   */
  private async resolveLocalDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<string> {
    debug('Resolving local dependency: %s', dependency.name)

    const localPath = dependency.url || dependency.name
    const resolvedPath = path.isAbsolute(localPath) 
      ? localPath 
      : path.resolve(options.projectRoot, localPath)

    if (!fs.existsSync(resolvedPath)) {
      throw ErrorHandler.createError(
        ErrorCode.DEPENDENCY_RESOLUTION_ERROR,
        `Local dependency not found: ${resolvedPath}`,
        { dependency: dependency.name, type: 'local', path: resolvedPath }
      )
    }

    return resolvedPath
  }

  /**
   * Resolve HTTP dependency
   */
  private async resolveHttpDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<string> {
    debug('Resolving HTTP dependency: %s', dependency.name)

    const url = dependency.url || dependency.name
    
    try {
      const resolved = await this.urlManager.resolveURL(url, options.projectRoot)
      return resolved.basePath
    } catch (error: any) {
      throw ErrorHandler.createError(
        ErrorCode.DEPENDENCY_RESOLUTION_ERROR,
        `HTTP dependency resolution failed: ${error.message}`,
        { dependency: dependency.name, type: 'http', url }
      )
    }
  }

  /**
   * Auto-detect and resolve dependency
   */
  private async resolveAutoDependency(
    dependency: TemplateDependency,
    options: { projectRoot: string; timeout: number }
  ): Promise<string> {
    debug('Auto-resolving dependency: %s', dependency.name)

    // Try different resolution strategies
    const strategies = [
      () => this.resolveLocalDependency({ ...dependency, type: 'local' }, options),
      () => this.resolveNpmDependency({ ...dependency, type: 'npm' }, options),
      () => this.resolveGitHubDependency({ ...dependency, type: 'github' }, options)
    ]

    for (const strategy of strategies) {
      try {
        return await strategy()
      } catch (error) {
        // Continue to next strategy
        continue
      }
    }

    throw ErrorHandler.createError(
      ErrorCode.DEPENDENCY_RESOLUTION_ERROR,
      `Could not resolve dependency using any strategy: ${dependency.name}`,
      { dependency: dependency.name }
    )
  }

  /**
   * Normalize dependencies to TemplateDependency objects
   */
  private normalizeDependencies(dependencies: string[] | TemplateDependency[]): TemplateDependency[] {
    return dependencies.map(dep => {
      if (typeof dep === 'string') {
        return {
          name: dep,
          type: 'npm' as const,
          optional: false,
          dev: false
        }
      }
      return {
        ...dep,
        optional: dep.optional || false,
        dev: dep.dev || false,
        type: dep.type || 'npm'
      }
    })
  }

  /**
   * Detect version conflicts between dependencies
   */
  private detectConflicts(dependencies: ResolvedDependency[]): Array<{
    name: string
    versions: string[]
    sources: string[]
  }> {
    const dependencyMap = new Map<string, ResolvedDependency[]>()

    // Group dependencies by name
    for (const dep of dependencies) {
      if (!dependencyMap.has(dep.name)) {
        dependencyMap.set(dep.name, [])
      }
      dependencyMap.get(dep.name)!.push(dep)
    }

    const conflicts = []

    // Find conflicts (same name, different versions)
    for (const [name, deps] of dependencyMap) {
      if (deps.length > 1) {
        const versions = [...new Set(deps.map(d => d.version).filter(Boolean))]
        if (versions.length > 1) {
          conflicts.push({
            name,
            versions,
            sources: deps.map(d => d.url || d.name)
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Clear dependency cache
   */
  clearCache(): void {
    this.resolvedCache.clear()
    debug('Dependency cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.resolvedCache.size,
      entries: Array.from(this.resolvedCache.keys())
    }
  }
}