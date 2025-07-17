import type { TemplateEngine, TemplateEngineFactory } from './types.js'

/**
 * Default implementation of TemplateEngineFactory
 */
export class DefaultTemplateEngineFactory implements TemplateEngineFactory {
  private engines = new Map<string, TemplateEngine>()
  private defaultEngine: string | undefined

  register(engine: TemplateEngine): void {
    this.engines.set(engine.name, engine)
    
    // Set as default if it's the first engine or if it's LiquidJS
    if (!this.defaultEngine || engine.name === 'liquidjs') {
      this.defaultEngine = engine.name
    }
  }

  get(name: string): TemplateEngine | undefined {
    return this.engines.get(name)
  }

  getForExtension(extension: string): TemplateEngine | undefined {
    // Remove leading dot if present
    const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`
    
    for (const engine of this.engines.values()) {
      if (engine.supports(normalizedExtension)) {
        return engine
      }
    }
    
    return undefined
  }

  getDefault(): TemplateEngine {
    if (!this.defaultEngine) {
      throw new Error('No default template engine configured')
    }
    
    const engine = this.engines.get(this.defaultEngine)
    if (!engine) {
      throw new Error(`Default template engine '${this.defaultEngine}' not found`)
    }
    
    return engine
  }

  setDefault(name: string): void {
    if (!this.engines.has(name)) {
      throw new Error(`Template engine '${name}' not registered`)
    }
    this.defaultEngine = name
  }

  list(): string[] {
    return Array.from(this.engines.keys())
  }
}

// Global factory instance
export const templateEngineFactory = new DefaultTemplateEngineFactory()