import { Liquid } from 'liquidjs'
import fs from 'fs-extra'
import path from 'path'
import type { TemplateEngine } from './types.js'

/**
 * LiquidJS Template Engine Implementation
 * 
 * Provides safe, fast template rendering using the LiquidJS engine.
 * This is the default template engine for Hypergen.
 */
export class LiquidTemplateEngine implements TemplateEngine {
  readonly name = 'liquidjs'
  readonly supportedExtensions = ['.liquid', '.liquid.t', '.liq', '.liq.t']
  
  private liquid: Liquid
  private configured = false

  constructor() {
    this.liquid = new Liquid({
      // Enable file system access for includes and layouts
      fs: {
        readFileSync: (file: string) => fs.readFileSync(file, 'utf8'),
        existsSync: (file: string) => fs.existsSync(file),
        resolve: (root: string, file: string, ext: string) => path.resolve(root, file + ext),
        exists: (file: string) => fs.existsSync(file),
        readFile: (file: string) => fs.readFileSync(file, 'utf8'),
      },
      // Default configuration
      cache: true,
      strictFilters: false,
      strictVariables: false,
      relativeReference: false,
      trimTagRight: false,
      trimTagLeft: false,
      trimOutputRight: false,
      trimOutputLeft: false,
      greedy: true,
      tagDelimiterLeft: '{%',
      tagDelimiterRight: '%}',
      outputDelimiterLeft: '{{',
      outputDelimiterRight: '}}',
    })

    this.setupDefaultFilters()
  }

  async render(template: string, context: Record<string, any>): Promise<string> {
    try {
      return await this.liquid.parseAndRender(template, context)
    } catch (error) {
      throw new Error(`LiquidJS template rendering failed: ${error.message}`)
    }
  }

  async renderFile(filePath: string, context: Record<string, any>): Promise<string> {
    try {
      return await this.liquid.renderFile(filePath, context)
    } catch (error) {
      throw new Error(`LiquidJS file rendering failed (${filePath}): ${error.message}`)
    }
  }

  supports(extension: string): boolean {
    return this.supportedExtensions.includes(extension)
  }

  configure(options: Record<string, any>): void {
    // Create new Liquid instance with custom options
    this.liquid = new Liquid({
      ...this.liquid.options,
      ...options,
      relativeReference: false,
      fs: {
        readFileSync: (file: string) => fs.readFileSync(file, 'utf8'),
        existsSync: (file: string) => fs.existsSync(file),
        resolve: (root: string, file: string, ext: string) => path.resolve(root, file + ext),
        exists: (file: string) => fs.existsSync(file),
        readFile: (file: string) => fs.readFileSync(file, 'utf8'),
      },
    })
    
    this.setupDefaultFilters()
    this.configured = true
  }

  /**
   * Setup default filters that match Hypergen's existing helpers
   */
  private setupDefaultFilters(): void {
    // Change case filters (matching change-case library)
    this.liquid.registerFilter('camelCase', (str: string) => {
      return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    })

    this.liquid.registerFilter('pascalCase', (str: string) => {
      const camelCased = str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      return camelCased.charAt(0).toUpperCase() + camelCased.slice(1)
    })

    this.liquid.registerFilter('snakeCase', (str: string) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[-\s]+/g, '_')
    })

    this.liquid.registerFilter('kebabCase', (str: string) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_\s]+/g, '-')
    })

    this.liquid.registerFilter('constantCase', (str: string) => {
      return str.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '').replace(/[-\s]+/g, '_')
    })

    this.liquid.registerFilter('dotCase', (str: string) => {
      return str.replace(/([A-Z])/g, '.$1').toLowerCase().replace(/^\./, '').replace(/[-_\s]+/g, '.')
    })

    this.liquid.registerFilter('pathCase', (str: string) => {
      return str.replace(/([A-Z])/g, '/$1').toLowerCase().replace(/^\//, '').replace(/[-_\s]+/g, '/')
    })

    this.liquid.registerFilter('paramCase', (str: string) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_\s]+/g, '-')
    })

    // Inflection filters
    this.liquid.registerFilter('pluralize', (str: string) => {
      // Basic pluralization - could be enhanced with inflection library
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies'
      }
      if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) {
        return str + 'es'
      }
      return str + 's'
    })

    this.liquid.registerFilter('singularize', (str: string) => {
      // Basic singularization - could be enhanced with inflection library
      if (str.endsWith('ies')) {
        return str.slice(0, -3) + 'y'
      }
      if (str.endsWith('es')) {
        return str.slice(0, -2)
      }
      if (str.endsWith('s') && !str.endsWith('ss')) {
        return str.slice(0, -1)
      }
      return str
    })

    // Utility filters
    this.liquid.registerFilter('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1)
    })

    this.liquid.registerFilter('titleize', (str: string) => {
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
    })

    this.liquid.registerFilter('humanize', (str: string) => {
      return str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
    })
  }

  /**
   * Get the underlying Liquid instance for advanced usage
   */
  getLiquidInstance(): Liquid {
    return this.liquid
  }

  /**
   * Register a custom filter
   */
  registerFilter(name: string, filter: (...args: any[]) => any): void {
    this.liquid.registerFilter(name, filter)
  }

  /**
   * Register a custom tag
   */
  registerTag(name: string, tag: any): void {
    this.liquid.registerTag(name, tag)
  }
}