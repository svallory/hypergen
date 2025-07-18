/**
 * Generator Auto-Discovery
 * 
 * Automatically discovers and registers generators from various sources
 */

import fs from 'fs-extra'
import path from 'path'
import { glob } from 'glob'
import createDebug from 'debug'
import { ActionRegistry } from '../actions/registry.js'
import { isActionFunction } from '../actions/decorator.js'

const debug = createDebug('hypergen:discovery')

export interface GeneratorDiscoveryOptions {
  directories?: string[]
  patterns?: string[]
  excludePatterns?: string[]
  enabledSources?: DiscoverySource[]
}

export type DiscoverySource = 'local' | 'npm' | 'git' | 'workspace'

export interface DiscoveredGenerator {
  name: string
  source: DiscoverySource
  path: string
  actions: string[]
  metadata?: {
    description?: string
    version?: string
    author?: string
    tags?: string[]
  }
}

export class GeneratorDiscovery {
  private discoveredGenerators: Map<string, DiscoveredGenerator> = new Map()
  
  constructor(private options: GeneratorDiscoveryOptions = {}) {
    this.options = {
      directories: ['_templates', 'generators', '.hypergen/generators'],
      patterns: ['**/*.{js,ts,mjs}', '**/template.yml', '**/generator.{js,ts,mjs}'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      enabledSources: ['local', 'workspace'],
      ...this.options
    }
  }

  /**
   * Discover all generators from enabled sources
   */
  async discoverAll(): Promise<DiscoveredGenerator[]> {
    debug('Starting generator discovery with sources: %o', this.options.enabledSources)
    
    const discoveries: DiscoveredGenerator[] = []
    
    if (this.options.enabledSources?.includes('local')) {
      const localGenerators = await this.discoverLocal()
      discoveries.push(...localGenerators)
    }
    
    if (this.options.enabledSources?.includes('workspace')) {
      const workspaceGenerators = await this.discoverWorkspace()
      discoveries.push(...workspaceGenerators)
    }
    
    if (this.options.enabledSources?.includes('npm')) {
      const npmGenerators = await this.discoverNpm()
      discoveries.push(...npmGenerators)
    }
    
    if (this.options.enabledSources?.includes('git')) {
      const gitGenerators = await this.discoverGit()
      discoveries.push(...gitGenerators)
    }
    
    // Store discovered generators
    for (const generator of discoveries) {
      this.discoveredGenerators.set(generator.name, generator)
    }
    
    debug('Discovery complete: found %d generators', discoveries.length)
    return discoveries
  }

  /**
   * Discover local generators in template directories
   */
  async discoverLocal(): Promise<DiscoveredGenerator[]> {
    debug('Discovering local generators in directories: %o', this.options.directories)
    
    const generators: DiscoveredGenerator[] = []
    const cwd = process.cwd()
    
    for (const dir of this.options.directories || []) {
      const fullPath = path.resolve(cwd, dir)
      
      if (!(await fs.pathExists(fullPath))) {
        continue
      }
      
      debug('Scanning directory: %s', fullPath)
      
      // Look for action files
      const actionFiles = await this.findActionFiles(fullPath)
      
      // Look for template.yml files
      const templateFiles = await this.findTemplateFiles(fullPath)
      
      // Group by generator name (typically directory name)
      const generatorGroups = this.groupFilesByGenerator(actionFiles, templateFiles, fullPath)
      
      for (const [generatorName, files] of generatorGroups) {
        const actions = await this.extractActionsFromFiles(files.actions)
        
        generators.push({
          name: generatorName,
          source: 'local',
          path: path.join(fullPath, generatorName),
          actions,
          metadata: await this.extractGeneratorMetadata(files.templates[0])
        })
      }
    }
    
    debug('Found %d local generators', generators.length)
    return generators
  }

  /**
   * Discover workspace generators (monorepo packages)
   */
  async discoverWorkspace(): Promise<DiscoveredGenerator[]> {
    debug('Discovering workspace generators')
    
    const generators: DiscoveredGenerator[] = []
    const cwd = process.cwd()
    
    // Look for workspace packages that might contain generators
    const workspacePatterns = [
      'packages/*/generators/**',
      'apps/*/generators/**', 
      'tools/generators/**'
    ]
    
    for (const pattern of workspacePatterns) {
      const matches = await glob(pattern, { 
        cwd
      })
      
      for (const match of matches) {
        const fullPath = path.resolve(cwd, match)
        const packageName = this.extractPackageNameFromPath(match)
        
        const actionFiles = await this.findActionFiles(fullPath)
        const actions = await this.extractActionsFromFiles(actionFiles)
        
        if (actions.length > 0) {
          generators.push({
            name: packageName,
            source: 'workspace',
            path: fullPath,
            actions,
            metadata: {
              description: `Workspace generator from ${match}`
            }
          })
        }
      }
    }
    
    debug('Found %d workspace generators', generators.length)
    return generators
  }

  /**
   * Discover npm-installed generators
   */
  async discoverNpm(): Promise<DiscoveredGenerator[]> {
    debug('Discovering npm generators')
    
    const generators: DiscoveredGenerator[] = []
    const nodeModulesPath = path.resolve(process.cwd(), 'node_modules')
    
    if (!(await fs.pathExists(nodeModulesPath))) {
      return generators
    }
    
    // Look for packages that follow hypergen generator conventions
    const packageDirs = await fs.readdir(nodeModulesPath)
    
    for (const packageDir of packageDirs) {
      if (packageDir.startsWith('.')) continue
      
      const packagePath = path.join(nodeModulesPath, packageDir)
      const packageJsonPath = path.join(packagePath, 'package.json')
      
      if (!(await fs.pathExists(packageJsonPath))) continue
      
      try {
        const packageJson = await fs.readJson(packageJsonPath)
        
        // Check if package is a hypergen generator
        if (this.isHypergenPackage(packageJson)) {
          const generatorPath = path.join(packagePath, 'generators')
          
          if (await fs.pathExists(generatorPath)) {
            const actionFiles = await this.findActionFiles(generatorPath)
            const actions = await this.extractActionsFromFiles(actionFiles)
            
            generators.push({
              name: packageJson.name,
              source: 'npm',
              path: generatorPath,
              actions,
              metadata: {
                description: packageJson.description,
                version: packageJson.version,
                author: packageJson.author
              }
            })
          }
        }
      } catch (error) {
        debug('Failed to read package.json for %s: %s', packageDir, error)
      }
    }
    
    debug('Found %d npm generators', generators.length)
    return generators
  }

  /**
   * Discover git-based generators (placeholder for future implementation)
   */
  async discoverGit(): Promise<DiscoveredGenerator[]> {
    debug('Git discovery not yet implemented')
    return []
  }

  /**
   * Get a discovered generator by name
   */
  getGenerator(name: string): DiscoveredGenerator | undefined {
    return this.discoveredGenerators.get(name)
  }

  /**
   * Get all discovered generators
   */
  getGenerators(): DiscoveredGenerator[] {
    return Array.from(this.discoveredGenerators.values())
  }

  /**
   * Get generators by source
   */
  getGeneratorsBySource(source: DiscoverySource): DiscoveredGenerator[] {
    return this.getGenerators().filter(g => g.source === source)
  }

  /**
   * Find action files in a directory
   */
  private async findActionFiles(directory: string): Promise<string[]> {
    const patterns = this.options.patterns?.filter(p => 
      p.includes('.js') || p.includes('.ts') || p.includes('.mjs')
    ) || ['**/*.{js,ts,mjs}']
    
    const files: string[] = []
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: directory,
        ignore: this.options.excludePatterns
      })
      
      files.push(...matches.map(f => path.resolve(directory, f)))
    }
    
    return files
  }

  /**
   * Find template.yml files in a directory
   */
  private async findTemplateFiles(directory: string): Promise<string[]> {
    const matches = await glob('**/template.yml', {
      cwd: directory,
      ignore: this.options.excludePatterns
    })
    
    return matches.map(f => path.resolve(directory, f))
  }

  /**
   * Group files by generator name
   */
  private groupFilesByGenerator(
    actionFiles: string[], 
    templateFiles: string[], 
    baseDir: string
  ): Map<string, { actions: string[]; templates: string[] }> {
    const groups = new Map<string, { actions: string[]; templates: string[] }>()
    
    // Group action files
    for (const file of actionFiles) {
      const relativePath = path.relative(baseDir, file)
      const generatorName = relativePath.split(path.sep)[0]
      
      if (!groups.has(generatorName)) {
        groups.set(generatorName, { actions: [], templates: [] })
      }
      
      groups.get(generatorName)!.actions.push(file)
    }
    
    // Group template files
    for (const file of templateFiles) {
      const relativePath = path.relative(baseDir, file)
      const generatorName = relativePath.split(path.sep)[0]
      
      if (!groups.has(generatorName)) {
        groups.set(generatorName, { actions: [], templates: [] })
      }
      
      groups.get(generatorName)!.templates.push(file)
    }
    
    return groups
  }

  /**
   * Extract action names from files by loading and checking for @action decorators
   */
  private async extractActionsFromFiles(files: string[]): Promise<string[]> {
    const actions: string[] = []
    
    for (const file of files) {
      try {
        // Import the module and check for decorated actions
        const module = await import(file)
        
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (typeof exportValue === 'function' && isActionFunction(exportValue)) {
            actions.push(exportName)
          }
        }
      } catch (error) {
        debug('Failed to load module %s: %s', file, error)
      }
    }
    
    return actions
  }

  /**
   * Extract generator metadata from template.yml
   */
  private async extractGeneratorMetadata(templateFile?: string): Promise<any> {
    if (!templateFile || !(await fs.pathExists(templateFile))) {
      return undefined
    }
    
    try {
      // This would integrate with the template.yml parser from Phase 1
      // For now, return basic metadata
      return {
        description: 'Local generator'
      }
    } catch (error) {
      debug('Failed to parse template metadata from %s: %s', templateFile, error)
      return undefined
    }
  }

  /**
   * Extract package name from workspace path
   */
  private extractPackageNameFromPath(workspacePath: string): string {
    const parts = workspacePath.split(path.sep)
    return parts.slice(0, 2).join('-') // e.g., "packages-ui" or "apps-web"
  }

  /**
   * Check if package.json indicates a hypergen generator package
   */
  private isHypergenPackage(packageJson: any): boolean {
    return (
      packageJson.keywords?.includes('hypergen') ||
      packageJson.keywords?.includes('generator') ||
      packageJson.name?.includes('hypergen-') ||
      packageJson.hypergen !== undefined
    )
  }
}