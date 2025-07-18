/**
 * Hypergen Configuration System
 * 
 * Provides configuration loading and management for hypergen projects
 */

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { ErrorHandler, ErrorCode } from '../errors/hypergen-errors.js'

export interface HypergenConfig {
  // Template directories
  templates?: string[]
  
  // Template discovery options
  discovery?: {
    sources?: ('local' | 'npm' | 'workspace' | 'github' | 'git')[]
    directories?: string[]
    exclude?: string[]
  }
  
  // Template engine options
  engine?: {
    type?: 'ejs' | 'handlebars' | 'mustache'
    options?: Record<string, any>
  }
  
  // Output options
  output?: {
    conflictStrategy?: 'fail' | 'overwrite' | 'skip' | 'merge'
    createDirectories?: boolean
    preserveTimestamps?: boolean
  }
  
  // Validation options
  validation?: {
    strict?: boolean
    validateTemplates?: boolean
    validateVariables?: boolean
  }
  
  // Cache options
  cache?: {
    enabled?: boolean
    directory?: string
    ttl?: number
  }
  
  // Plugin system
  plugins?: string[]
  
  // Custom helpers
  helpers?: string | Record<string, Function>
  
  // Environment-specific settings
  environments?: Record<string, Partial<HypergenConfig>>
}

export interface ResolvedConfig extends Required<HypergenConfig> {
  // Resolved paths
  configPath: string
  projectRoot: string
  
  // Runtime environment
  environment: string
  
  // Loaded helpers
  loadedHelpers: Record<string, Function>
}

export class HypergenConfigLoader {
  private static readonly CONFIG_FILES = [
    'hypergen.config.js',
    'hypergen.config.mjs',
    'hypergen.config.cjs',
    'hypergen.config.json',
    '.hypergenrc',
    '.hypergenrc.js',
    '.hypergenrc.json'
  ]
  
  private static readonly DEFAULT_CONFIG: HypergenConfig = {
    templates: ['_templates'],
    discovery: {
      sources: ['local', 'npm', 'workspace'],
      directories: ['_templates', 'templates', 'generators'],
      exclude: ['node_modules', '.git', 'dist', 'build']
    },
    engine: {
      type: 'ejs',
      options: {}
    },
    output: {
      conflictStrategy: 'fail',
      createDirectories: true,
      preserveTimestamps: false
    },
    validation: {
      strict: true,
      validateTemplates: true,
      validateVariables: true
    },
    cache: {
      enabled: true,
      directory: '.hypergen-cache',
      ttl: 3600000 // 1 hour
    },
    plugins: [],
    helpers: {},
    environments: {}
  }
  
  /**
   * Load configuration from various sources
   */
  static async loadConfig(
    configPath?: string,
    projectRoot: string = process.cwd(),
    environment: string = process.env.NODE_ENV || 'development'
  ): Promise<ResolvedConfig> {
    let config: HypergenConfig = {}
    let actualConfigPath: string | null = null
    
    try {
      // 1. Try explicit config path
      if (configPath) {
        if (fs.existsSync(configPath)) {
          config = await this.loadConfigFile(configPath)
          actualConfigPath = configPath
        } else {
          throw ErrorHandler.createError(
            ErrorCode.CONFIG_FILE_NOT_FOUND,
            `Configuration file not found: ${configPath}`,
            { file: configPath }
          )
        }
      }
      
      // 2. Try environment variable
      if (!actualConfigPath) {
        const envConfigPath = process.env.HYPERGEN_CONFIG
        if (envConfigPath && fs.existsSync(envConfigPath)) {
          config = await this.loadConfigFile(envConfigPath)
          actualConfigPath = envConfigPath
        }
      }
      
      // 3. Try default config files
      if (!actualConfigPath) {
        for (const fileName of this.CONFIG_FILES) {
          const fullPath = path.join(projectRoot, fileName)
          if (fs.existsSync(fullPath)) {
            config = await this.loadConfigFile(fullPath)
            actualConfigPath = fullPath
            break
          }
        }
      }
      
      // 4. Try parent directories
      if (!actualConfigPath) {
        let currentDir = projectRoot
        while (currentDir !== path.dirname(currentDir)) {
          for (const fileName of this.CONFIG_FILES) {
            const fullPath = path.join(currentDir, fileName)
            if (fs.existsSync(fullPath)) {
              config = await this.loadConfigFile(fullPath)
              actualConfigPath = fullPath
              break
            }
          }
          if (actualConfigPath) break
          currentDir = path.dirname(currentDir)
        }
      }
      
      // 5. Try home directory
      if (!actualConfigPath) {
        const homeDir = process.env.HOME || process.env.USERPROFILE
        if (homeDir) {
          for (const fileName of this.CONFIG_FILES) {
            const fullPath = path.join(homeDir, fileName)
            if (fs.existsSync(fullPath)) {
              config = await this.loadConfigFile(fullPath)
              actualConfigPath = fullPath
              break
            }
          }
        }
      }
      
      // Merge with default config
      const mergedConfig = this.mergeConfig(this.DEFAULT_CONFIG, config)
      
      // Apply environment-specific settings
      if (mergedConfig.environments && mergedConfig.environments[environment]) {
        const envConfig = mergedConfig.environments[environment]
        Object.assign(mergedConfig, this.mergeConfig(mergedConfig, envConfig))
      }
      
      // Load helpers
      const loadedHelpers = await this.loadHelpers(mergedConfig.helpers, projectRoot)
      
      // Resolve paths
      const resolvedConfig: ResolvedConfig = {
        ...mergedConfig,
        configPath: actualConfigPath || 'default',
        projectRoot,
        environment,
        loadedHelpers,
        
        // Ensure required properties are set
        templates: mergedConfig.templates || this.DEFAULT_CONFIG.templates!,
        discovery: mergedConfig.discovery || this.DEFAULT_CONFIG.discovery!,
        engine: mergedConfig.engine || this.DEFAULT_CONFIG.engine!,
        output: mergedConfig.output || this.DEFAULT_CONFIG.output!,
        validation: mergedConfig.validation || this.DEFAULT_CONFIG.validation!,
        cache: mergedConfig.cache || this.DEFAULT_CONFIG.cache!,
        plugins: mergedConfig.plugins || this.DEFAULT_CONFIG.plugins!,
        helpers: mergedConfig.helpers || this.DEFAULT_CONFIG.helpers!,
        environments: mergedConfig.environments || this.DEFAULT_CONFIG.environments!
      }
      
      // Resolve template paths
      resolvedConfig.templates = resolvedConfig.templates.map(templatePath => {
        if (path.isAbsolute(templatePath)) {
          return templatePath
        }
        return path.resolve(projectRoot, templatePath)
      })
      
      // Resolve cache directory
      if (resolvedConfig.cache.directory && !path.isAbsolute(resolvedConfig.cache.directory)) {
        resolvedConfig.cache.directory = path.resolve(projectRoot, resolvedConfig.cache.directory)
      }
      
      return resolvedConfig
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw ErrorHandler.createError(
          ErrorCode.CONFIG_FILE_NOT_FOUND,
          `Configuration file not found: ${error.path}`,
          { file: error.path }
        )
      }
      
      if (error.name === 'SyntaxError' || error.message.includes('JSON Parse error')) {
        throw ErrorHandler.createError(
          ErrorCode.CONFIG_INVALID_FORMAT,
          `Invalid configuration file syntax: ${error.message}`,
          { file: actualConfigPath || 'unknown' }
        )
      }
      
      throw error
    }
  }
  
  /**
   * Load configuration from a specific file
   */
  private static async loadConfigFile(configPath: string): Promise<HypergenConfig> {
    const ext = path.extname(configPath).toLowerCase()
    
    try {
      if (ext === '.json' || path.basename(configPath) === '.hypergenrc') {
        // JSON configuration
        const content = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(content)
      } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        // JavaScript/ES module configuration
        const fileUrl = pathToFileURL(configPath).href
        const module = await import(fileUrl)
        return module.default || module
      } else {
        throw ErrorHandler.createError(
          ErrorCode.CONFIG_INVALID_FORMAT,
          `Unsupported configuration file format: ${ext}`,
          { file: configPath }
        )
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw ErrorHandler.createError(
          ErrorCode.CONFIG_FILE_NOT_FOUND,
          `Configuration file not found: ${configPath}`,
          { file: configPath }
        )
      }
      
      throw ErrorHandler.createError(
        ErrorCode.CONFIG_INVALID_FORMAT,
        `Failed to load configuration: ${error.message}`,
        { file: configPath }
      )
    }
  }
  
  /**
   * Merge configuration objects
   */
  private static mergeConfig(base: HypergenConfig, override: HypergenConfig): HypergenConfig {
    const merged = { ...base }
    
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue
      
      if (key === 'templates' && Array.isArray(value)) {
        // Replace templates instead of merging
        merged.templates = value
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key as keyof HypergenConfig] = {
          ...(merged[key as keyof HypergenConfig] as any),
          ...value
        } as any
      } else {
        merged[key as keyof HypergenConfig] = value
      }
    }
    
    return merged
  }
  
  /**
   * Load helper functions
   */
  private static async loadHelpers(
    helpers: string | Record<string, Function> | undefined,
    projectRoot: string
  ): Promise<Record<string, Function>> {
    if (!helpers) return {}
    
    if (typeof helpers === 'string') {
      // Load helpers from file
      const helpersPath = path.isAbsolute(helpers) 
        ? helpers 
        : path.resolve(projectRoot, helpers)
      
      try {
        const fileUrl = pathToFileURL(helpersPath).href
        const module = await import(fileUrl)
        return module.default || module
      } catch (error) {
        console.warn(`Warning: Could not load helpers from ${helpersPath}`)
        return {}
      }
    } else if (typeof helpers === 'object') {
      // Use provided helpers object
      return helpers
    }
    
    return {}
  }
  
  /**
   * Validate configuration
   */
  static validateConfig(config: HypergenConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validate templates
    if (config.templates && !Array.isArray(config.templates)) {
      errors.push('templates must be an array of strings')
    }
    
    // Validate discovery sources
    if (config.discovery?.sources) {
      const validSources = ['local', 'npm', 'workspace', 'github', 'git']
      const invalidSources = config.discovery.sources.filter(source => !validSources.includes(source))
      if (invalidSources.length > 0) {
        errors.push(`Invalid discovery sources: ${invalidSources.join(', ')}`)
      }
    }
    
    // Validate engine type
    if (config.engine?.type) {
      const validEngines = ['ejs', 'handlebars', 'mustache']
      if (!validEngines.includes(config.engine.type)) {
        errors.push(`Invalid engine type: ${config.engine.type}`)
      }
    }
    
    // Validate conflict strategy
    if (config.output?.conflictStrategy) {
      const validStrategies = ['fail', 'overwrite', 'skip', 'merge']
      if (!validStrategies.includes(config.output.conflictStrategy)) {
        errors.push(`Invalid conflict strategy: ${config.output.conflictStrategy}`)
      }
    }
    
    // Validate plugins
    if (config.plugins && !Array.isArray(config.plugins)) {
      errors.push('plugins must be an array of strings')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Generate default configuration file
   */
  static generateDefaultConfig(format: 'js' | 'json' = 'js'): string {
    if (format === 'json') {
      return JSON.stringify(this.DEFAULT_CONFIG, null, 2)
    }
    
    return `/**
 * Hypergen Configuration
 * 
 * @type {import('hypergen').HypergenConfig}
 */
export default {
  // Template directories to search
  templates: ['_templates'],
  
  // Generator discovery options
  discovery: {
    sources: ['local', 'npm', 'workspace'],
    directories: ['_templates', 'templates', 'generators'],
    exclude: ['node_modules', '.git', 'dist', 'build']
  },
  
  // Template engine configuration
  engine: {
    type: 'ejs',
    options: {}
  },
  
  // Output handling
  output: {
    conflictStrategy: 'fail', // fail | overwrite | skip | merge
    createDirectories: true,
    preserveTimestamps: false
  },
  
  // Validation options
  validation: {
    strict: true,
    validateTemplates: true,
    validateVariables: true
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    directory: '.hypergen-cache',
    ttl: 3600000 // 1 hour in milliseconds
  },
  
  // Plugins to load
  plugins: [],
  
  // Custom helper functions
  helpers: {},
  
  // Environment-specific configuration
  environments: {
    development: {
      validation: {
        strict: false
      }
    },
    production: {
      cache: {
        enabled: true,
        ttl: 86400000 // 24 hours
      }
    }
  }
}
`
  }
}

/**
 * Create a new configuration file
 */
export async function createConfigFile(
  projectRoot: string,
  format: 'js' | 'json' = 'js'
): Promise<string> {
  const fileName = format === 'json' ? 'hypergen.config.json' : 'hypergen.config.js'
  const configPath = path.join(projectRoot, fileName)
  
  if (fs.existsSync(configPath)) {
    throw ErrorHandler.createError(
      ErrorCode.FILE_ALREADY_EXISTS,
      `Configuration file already exists: ${configPath}`,
      { file: configPath }
    )
  }
  
  const content = HypergenConfigLoader.generateDefaultConfig(format)
  fs.writeFileSync(configPath, content, 'utf-8')
  
  return configPath
}

/**
 * Get configuration information
 */
export function getConfigInfo(config: ResolvedConfig): {
  source: string
  templates: string[]
  environment: string
  cacheEnabled: boolean
  pluginCount: number
  helperCount: number
} {
  return {
    source: config.configPath,
    templates: config.templates,
    environment: config.environment,
    cacheEnabled: config.cache.enabled,
    pluginCount: config.plugins.length,
    helperCount: Object.keys(config.loadedHelpers).length
  }
}