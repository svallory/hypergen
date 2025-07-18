/**
 * Action Registry
 * 
 * Central registry for decorated actions with discovery and querying capabilities
 */

import createDebug from 'debug'
import type { 
  ActionMetadata, 
  ActionFunction, 
  DecoratedAction, 
  ActionQueryOptions 
} from './types.js'

const debug = createDebug('hypergen:v8:action:registry')

export class ActionRegistry {
  private static instance: ActionRegistry
  private actions: Map<string, DecoratedAction> = new Map()
  private categoriesIndex: Map<string, Set<string>> = new Map()
  private tagsIndex: Map<string, Set<string>> = new Map()

  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry()
      debug('Action registry initialized')
    }
    return ActionRegistry.instance
  }

  /**
   * Register a decorated action
   */
  register(fn: ActionFunction, metadata: ActionMetadata): void {
    if (this.actions.has(metadata.name)) {
      debug('Warning: Overriding existing action: %s', metadata.name)
    }

    const action: DecoratedAction = {
      metadata,
      fn,
      module: this.getModulePath(fn),
      exported: true
    }

    this.actions.set(metadata.name, action)
    this.updateIndexes(metadata)
    
    debug('Registered action: %s (category: %s, tags: %s)', 
      metadata.name, 
      metadata.category, 
      metadata.tags?.join(', ') || 'none'
    )
  }

  /**
   * Get a specific action by name
   */
  get(name: string): DecoratedAction | undefined {
    return this.actions.get(name)
  }

  /**
   * Get all registered actions
   */
  getAll(): DecoratedAction[] {
    return Array.from(this.actions.values())
  }

  /**
   * Get actions by category
   */
  getByCategory(category: string): DecoratedAction[] {
    const actionNames = this.categoriesIndex.get(category)
    if (!actionNames) {
      return []
    }

    return Array.from(actionNames)
      .map(name => this.actions.get(name))
      .filter((action): action is DecoratedAction => action !== undefined)
  }

  /**
   * Get actions by tags (OR operation - any matching tag)
   */
  getByTags(tags: string[]): DecoratedAction[] {
    const matchingActionNames = new Set<string>()

    for (const tag of tags) {
      const actionNames = this.tagsIndex.get(tag)
      if (actionNames) {
        actionNames.forEach(name => matchingActionNames.add(name))
      }
    }

    return Array.from(matchingActionNames)
      .map(name => this.actions.get(name))
      .filter((action): action is DecoratedAction => action !== undefined)
  }

  /**
   * Query actions with various filters
   */
  query(options: ActionQueryOptions = {}): DecoratedAction[] {
    let results = this.getAll()

    // Filter by category
    if (options.category) {
      results = results.filter(action => action.metadata.category === options.category)
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(action => 
        action.metadata.tags?.some(tag => options.tags!.includes(tag))
      )
    }

    // Filter by search term (name or description)
    if (options.search) {
      const searchTerm = options.search.toLowerCase()
      results = results.filter(action => 
        action.metadata.name.toLowerCase().includes(searchTerm) ||
        action.metadata.description?.toLowerCase().includes(searchTerm)
      )
    }

    return results
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.categoriesIndex.keys()).sort()
  }

  /**
   * Get all available tags
   */
  getTags(): string[] {
    return Array.from(this.tagsIndex.keys()).sort()
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalActions: number
    categories: Record<string, number>
    tags: Record<string, number>
  } {
    const categories: Record<string, number> = {}
    const tags: Record<string, number> = {}

    for (const [category, actionNames] of this.categoriesIndex) {
      categories[category] = actionNames.size
    }

    for (const [tag, actionNames] of this.tagsIndex) {
      tags[tag] = actionNames.size
    }

    return {
      totalActions: this.actions.size,
      categories,
      tags
    }
  }

  /**
   * Check if an action exists
   */
  has(name: string): boolean {
    return this.actions.has(name)
  }

  /**
   * Remove an action from the registry
   */
  unregister(name: string): boolean {
    const action = this.actions.get(name)
    if (!action) {
      return false
    }

    this.actions.delete(name)
    this.removeFromIndexes(action.metadata)
    
    debug('Unregistered action: %s', name)
    return true
  }

  /**
   * Clear all registered actions
   */
  clear(): void {
    this.actions.clear()
    this.categoriesIndex.clear()
    this.tagsIndex.clear()
    debug('Registry cleared')
  }

  /**
   * Update search indexes for an action
   */
  private updateIndexes(metadata: ActionMetadata): void {
    // Update category index
    if (metadata.category) {
      if (!this.categoriesIndex.has(metadata.category)) {
        this.categoriesIndex.set(metadata.category, new Set())
      }
      this.categoriesIndex.get(metadata.category)!.add(metadata.name)
    }

    // Update tags index
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        if (!this.tagsIndex.has(tag)) {
          this.tagsIndex.set(tag, new Set())
        }
        this.tagsIndex.get(tag)!.add(metadata.name)
      }
    }
  }

  /**
   * Remove action from search indexes
   */
  private removeFromIndexes(metadata: ActionMetadata): void {
    // Remove from category index
    if (metadata.category) {
      const categoryActions = this.categoriesIndex.get(metadata.category)
      if (categoryActions) {
        categoryActions.delete(metadata.name)
        if (categoryActions.size === 0) {
          this.categoriesIndex.delete(metadata.category)
        }
      }
    }

    // Remove from tags index
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const tagActions = this.tagsIndex.get(tag)
        if (tagActions) {
          tagActions.delete(metadata.name)
          if (tagActions.size === 0) {
            this.tagsIndex.delete(tag)
          }
        }
      }
    }
  }

  /**
   * Extract module path from function for better error reporting
   */
  private getModulePath(fn: ActionFunction): string {
    // Try to extract file path from function toString
    const fnString = fn.toString()
    
    // Look for file:// URLs in the function string
    const fileMatch = fnString.match(/file:\/\/([^"'\s]+)/)
    if (fileMatch) {
      return fileMatch[1]
    }

    // Check if function has a name that might indicate its source
    if (fn.name) {
      return `<${fn.name}>`
    }

    return '<unknown>'
  }
}