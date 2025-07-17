/**
 * Plugin System Types
 * 
 * Defines the interfaces and types for Hypergen's plugin system
 */

export interface PluginInfo {
  /**
   * Package name
   */
  name: string

  /**
   * Plugin type (template-engine, validator, formatter, etc.)
   */
  type: string

  /**
   * Plugin identifier within its type
   */
  id: string

  /**
   * Plugin version
   */
  version: string

  /**
   * Plugin description
   */
  description?: string

  /**
   * Plugin configuration from package.json
   */
  config?: Record<string, any>
}

export interface PluginModule {
  /**
   * Plugin type
   */
  type: string

  /**
   * Plugin name/identifier
   */
  name: string

  /**
   * Factory function to create plugin instance
   */
  createTemplateEngine?: (options?: Record<string, any>) => any

  /**
   * Default export for auto-discovery
   */
  default?: {
    createTemplateEngine?: (options?: Record<string, any>) => any
    type: string
    name: string
  }
}

export interface PluginDiscoveryOptions {
  /**
   * Base directory to search for plugins (defaults to process.cwd())
   */
  baseDir?: string

  /**
   * Plugin name pattern (defaults to 'hypergen-plugin-*')
   */
  pattern?: string

  /**
   * Whether to search in node_modules
   */
  includeNodeModules?: boolean

  /**
   * Whether to search in local directories
   */
  includeLocal?: boolean

  /**
   * Plugin types to discover
   */
  types?: string[]
}

export interface PluginManager {
  /**
   * Discover plugins matching the pattern
   */
  discover(options?: PluginDiscoveryOptions): Promise<PluginInfo[]>

  /**
   * Load a specific plugin
   */
  load(pluginName: string): Promise<PluginModule | null>

  /**
   * Load all discovered plugins
   */
  loadAll(options?: PluginDiscoveryOptions): Promise<PluginModule[]>

  /**
   * Get information about a specific plugin
   */
  getPluginInfo(pluginName: string): Promise<PluginInfo | null>

  /**
   * Register a plugin with the appropriate factory
   */
  register(plugin: PluginModule, options?: Record<string, any>): void
}

export interface PluginConfig {
  /**
   * Plugin-specific configuration
   */
  plugins?: {
    [pluginType: string]: {
      [pluginName: string]: {
        enabled?: boolean
        options?: Record<string, any>
      }
    }
  }
}