/**
 * Template Engine Interface
 * 
 * This interface defines the contract for template engines in Hypergen.
 * Different template engines (LiquidJS, EJS, etc.) implement this interface
 * to provide consistent template rendering capabilities.
 */

export interface TemplateEngine {
  /**
   * Unique identifier for the template engine
   */
  readonly name: string

  /**
   * File extensions this engine supports (e.g., ['.liquid', '.liquid.t'])
   */
  readonly supportedExtensions: string[]

  /**
   * Render a template string with the given context
   * @param template - The template string to render
   * @param context - Variables and data to pass to the template
   * @returns Promise resolving to the rendered string
   */
  render(template: string, context: Record<string, any>): Promise<string>

  /**
   * Render a template file with the given context
   * @param filePath - Path to the template file
   * @param context - Variables and data to pass to the template
   * @returns Promise resolving to the rendered string
   */
  renderFile(filePath: string, context: Record<string, any>): Promise<string>

  /**
   * Check if this engine supports a given file extension
   * @param extension - File extension to check (e.g., '.liquid')
   * @returns true if the extension is supported
   */
  supports(extension: string): boolean

  /**
   * Configure the template engine with options
   * @param options - Engine-specific configuration options
   */
  configure(options: Record<string, any>): void
}

/**
 * Template Engine Factory
 * 
 * Manages registration and retrieval of template engines
 */
export interface TemplateEngineFactory {
  /**
   * Register a template engine
   * @param engine - Template engine instance to register
   */
  register(engine: TemplateEngine): void

  /**
   * Get a template engine by name
   * @param name - Name of the template engine
   * @returns Template engine instance or undefined if not found
   */
  get(name: string): TemplateEngine | undefined

  /**
   * Get a template engine that supports the given file extension
   * @param extension - File extension to check
   * @returns Template engine instance or undefined if none support the extension
   */
  getForExtension(extension: string): TemplateEngine | undefined

  /**
   * Get the default template engine
   * @returns Default template engine instance
   */
  getDefault(): TemplateEngine

  /**
   * Set the default template engine
   * @param name - Name of the template engine to set as default
   */
  setDefault(name: string): void

  /**
   * List all registered template engines
   * @returns Array of registered template engine names
   */
  list(): string[]
}

/**
 * Template Engine Configuration
 */
export interface TemplateEngineConfig {
  /**
   * Default template engine to use
   */
  default?: string

  /**
   * Engine-specific configurations
   */
  engines?: Record<string, Record<string, any>>
}