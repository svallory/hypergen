/**
 * Plugin System Module
 * 
 * Provides plugin discovery, loading, and management functionality for Hypergen
 */

export * from './types.js'
export * from './discovery.js'

import { pluginManager } from './discovery.js'
import type { PluginConfig } from './types.js'
import createDebug from 'debug'

const debug = createDebug('hypergen:plugin-system')

/**
 * Initialize the plugin system and auto-discover plugins
 */
export async function initializePluginSystem(config: PluginConfig = {}): Promise<void> {
  try {
    debug('Initializing plugin system')
    
    // Discover and load all plugins
    const plugins = await pluginManager.loadAll({
      types: ['template-engine']
    })

    debug('Found %d plugins', plugins.length)

    // Register each plugin
    for (const plugin of plugins) {
      try {
        // Get plugin configuration
        const pluginConfig = config.plugins?.[plugin.type]?.[plugin.name]
        
        // Skip if plugin is disabled
        if (pluginConfig?.enabled === false) {
          debug('Skipping disabled plugin: %s', plugin.name)
          continue
        }

        // Register the plugin
        pluginManager.register(plugin, pluginConfig?.options || {})
        debug('Registered plugin: %s (%s)', plugin.name, plugin.type)
      } catch (error) {
        debug('Failed to register plugin %s: %s', plugin.name, error.message)
      }
    }

    debug('Plugin system initialized successfully')
  } catch (error) {
    debug('Failed to initialize plugin system: %s', error.message)
  }
}

/**
 * Get the plugin manager instance
 */
export function getPluginManager() {
  return pluginManager
}

/**
 * Discover plugins matching the given criteria
 */
export async function discoverPlugins(options?: any) {
  return pluginManager.discover(options)
}

/**
 * Load a specific plugin by name
 */
export async function loadPlugin(pluginName: string) {
  return pluginManager.load(pluginName)
}

/**
 * Get information about a specific plugin
 */
export async function getPluginInfo(pluginName: string) {
  return pluginManager.getPluginInfo(pluginName)
}

/**
 * Register a plugin manually
 */
export function registerPlugin(plugin: any, options?: Record<string, any>) {
  return pluginManager.register(plugin, options)
}