/**
 * Template Engines Module
 * 
 * This module provides the template engine abstraction layer for Hypergen.
 * It includes interfaces, factory, and implementations for different template engines.
 */

export * from './types.js'
export * from './factory.js'
export * from './liquid-engine.js'
export * from './ejs-engine.js'

import { templateEngineFactory } from './factory.js'
import { LiquidTemplateEngine } from './liquid-engine.js'
import { EJSTemplateEngine } from './ejs-engine.js'

/**
 * Initialize and register default template engines
 */
export function initializeTemplateEngines(): void {
  // Register LiquidJS as the default template engine
  templateEngineFactory.register(new LiquidTemplateEngine())
  
  // Register EJS for backward compatibility
  templateEngineFactory.register(new EJSTemplateEngine())
}

/**
 * Initialize template engines with plugin system support
 */
export async function initializeTemplateEnginesWithPlugins(config?: any): Promise<void> {
  // Initialize built-in template engines
  initializeTemplateEngines()
  
  // Initialize plugin system for template engines
  try {
    const { initializePluginSystem } = await import('../plugin-system/index.js')
    await initializePluginSystem(config)
  } catch (error) {
    console.warn('Failed to initialize plugin system:', error.message)
  }
}

/**
 * Get the configured template engine factory
 */
export function getTemplateEngineFactory() {
  return templateEngineFactory
}

/**
 * Convenience function to get a template engine by name
 */
export function getTemplateEngine(name: string) {
  return templateEngineFactory.get(name)
}

/**
 * Convenience function to get a template engine for a file extension
 */
export function getTemplateEngineForFile(extension: string) {
  return templateEngineFactory.getForExtension(extension)
}

/**
 * Convenience function to get the default template engine
 */
export function getDefaultTemplateEngine() {
  return templateEngineFactory.getDefault()
}