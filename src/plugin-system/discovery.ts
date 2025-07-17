import path from 'node:path'
import fs from 'fs-extra'
import { glob } from 'glob'
import createDebug from 'debug'
import type { PluginInfo, PluginModule, PluginDiscoveryOptions, PluginManager } from './types.js'

const debug = createDebug('hypergen:plugin-discovery')

export class DefaultPluginManager implements PluginManager {
  private pluginCache = new Map<string, PluginModule>()
  private infoCache = new Map<string, PluginInfo>()

  async discover(options: PluginDiscoveryOptions = {}): Promise<PluginInfo[]> {
    const {
      baseDir = process.cwd(),
      pattern = 'hypergen-plugin-*',
      includeNodeModules = true,
      includeLocal = true,
      types = ['template-engine']
    } = options

    const plugins: PluginInfo[] = []

    // Search in node_modules
    if (includeNodeModules) {
      const nodeModulesPlugins = await this.searchNodeModules(baseDir, pattern, types)
      plugins.push(...nodeModulesPlugins)
    }

    // Search in local directories
    if (includeLocal) {
      const localPlugins = await this.searchLocalDirectories(baseDir, pattern, types)
      plugins.push(...localPlugins)
    }

    // Cache the results
    plugins.forEach(plugin => {
      this.infoCache.set(plugin.name, plugin)
    })

    debug('Discovered %d plugins: %o', plugins.length, plugins.map(p => p.name))
    return plugins
  }

  async load(pluginName: string): Promise<PluginModule | null> {
    if (this.pluginCache.has(pluginName)) {
      return this.pluginCache.get(pluginName)!
    }

    try {
      debug('Loading plugin: %s', pluginName)
      
      // Try to resolve the plugin
      const pluginPath = require.resolve(pluginName)
      const pluginModule = await import(pluginPath)
      
      // Validate plugin structure
      const plugin = this.validatePlugin(pluginModule, pluginName)
      if (!plugin) {
        debug('Invalid plugin structure: %s', pluginName)
        return null
      }

      // Cache the plugin
      this.pluginCache.set(pluginName, plugin)
      return plugin
    } catch (error) {
      debug('Failed to load plugin %s: %s', pluginName, error.message)
      return null
    }
  }

  async loadAll(options: PluginDiscoveryOptions = {}): Promise<PluginModule[]> {
    const discoveredPlugins = await this.discover(options)
    const loadedPlugins: PluginModule[] = []

    for (const pluginInfo of discoveredPlugins) {
      const plugin = await this.load(pluginInfo.name)
      if (plugin) {
        loadedPlugins.push(plugin)
      }
    }

    return loadedPlugins
  }

  async getPluginInfo(pluginName: string): Promise<PluginInfo | null> {
    if (this.infoCache.has(pluginName)) {
      return this.infoCache.get(pluginName)!
    }

    try {
      const packageJsonPath = path.join(path.dirname(require.resolve(pluginName)), 'package.json')
      const packageJson = await fs.readJson(packageJsonPath)
      
      const pluginInfo = this.extractPluginInfo(packageJson)
      if (pluginInfo) {
        this.infoCache.set(pluginName, pluginInfo)
        return pluginInfo
      }
    } catch (error) {
      debug('Failed to get plugin info for %s: %s', pluginName, error.message)
    }

    return null
  }

  register(plugin: PluginModule, options: Record<string, any> = {}): void {
    if (plugin.type === 'template-engine' && plugin.createTemplateEngine) {
      // Register with template engine factory
      const { templateEngineFactory } = require('../template-engines/factory.js')
      const engineInstance = plugin.createTemplateEngine(options)
      templateEngineFactory.register(engineInstance)
      debug('Registered template engine plugin: %s', plugin.name)
    } else {
      debug('Unknown plugin type or missing factory function: %s', plugin.type)
    }
  }

  private async searchNodeModules(baseDir: string, pattern: string, types: string[]): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = []
    const nodeModulesPath = path.join(baseDir, 'node_modules')

    if (!(await fs.pathExists(nodeModulesPath))) {
      return plugins
    }

    try {
      const packagePaths = await glob(path.join(nodeModulesPath, pattern, 'package.json'))
      
      for (const packagePath of packagePaths) {
        try {
          const packageJson = await fs.readJson(packagePath)
          const pluginInfo = this.extractPluginInfo(packageJson)
          
          if (pluginInfo && types.includes(pluginInfo.type)) {
            plugins.push(pluginInfo)
          }
        } catch (error) {
          debug('Failed to read package.json at %s: %s', packagePath, error.message)
        }
      }
    } catch (error) {
      debug('Failed to search node_modules: %s', error.message)
    }

    return plugins
  }

  private async searchLocalDirectories(baseDir: string, pattern: string, types: string[]): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = []

    // Search in current directory and parent directories
    let currentDir = baseDir
    const root = path.parse(currentDir).root

    while (currentDir !== root) {
      try {
        const packagePaths = await glob(path.join(currentDir, pattern, 'package.json'))
        
        for (const packagePath of packagePaths) {
          try {
            const packageJson = await fs.readJson(packagePath)
            const pluginInfo = this.extractPluginInfo(packageJson)
            
            if (pluginInfo && types.includes(pluginInfo.type)) {
              plugins.push(pluginInfo)
            }
          } catch (error) {
            debug('Failed to read package.json at %s: %s', packagePath, error.message)
          }
        }
      } catch (error) {
        debug('Failed to search directory %s: %s', currentDir, error.message)
      }

      currentDir = path.dirname(currentDir)
    }

    return plugins
  }

  private extractPluginInfo(packageJson: any): PluginInfo | null {
    if (!packageJson.name || !packageJson.hypergen) {
      return null
    }

    const hypergenConfig = packageJson.hypergen
    if (!hypergenConfig.type || !hypergenConfig.name) {
      return null
    }

    return {
      name: packageJson.name,
      type: hypergenConfig.type,
      id: hypergenConfig.name,
      version: packageJson.version || '0.0.0',
      description: packageJson.description,
      config: hypergenConfig
    }
  }

  private validatePlugin(pluginModule: any, pluginName: string): PluginModule | null {
    // Check for default export
    if (pluginModule.default && pluginModule.default.type && pluginModule.default.name) {
      return {
        type: pluginModule.default.type,
        name: pluginModule.default.name,
        createTemplateEngine: pluginModule.default.createTemplateEngine || pluginModule.createTemplateEngine
      }
    }

    // Check for named exports
    if (pluginModule.createTemplateEngine) {
      // Try to extract type and name from package.json
      const info = this.infoCache.get(pluginName)
      if (info) {
        return {
          type: info.type,
          name: info.id,
          createTemplateEngine: pluginModule.createTemplateEngine
        }
      }
    }

    return null
  }
}

// Global plugin manager instance
export const pluginManager = new DefaultPluginManager()