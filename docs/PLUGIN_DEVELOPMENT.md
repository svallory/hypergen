# Hypergen Plugin Development Guide

## Overview

Hypergen supports a plugin system that allows developers to extend functionality through standardized interfaces. Currently, the plugin system supports **Template Engine Plugins**, with plans to expand to other types of plugins in the future.

## Plugin Types

### Template Engine Plugins

Template Engine Plugins allow you to add support for new template engines (e.g., Handlebars, Mustache, Nunjucks, etc.) to Hypergen.

## Plugin Package Naming Convention

Following the Yeoman pattern, Hypergen plugins should use the naming convention:

```
hypergen-plugin-<plugin-type>-<name>
```

Examples:
- `hypergen-plugin-template-handlebars`
- `hypergen-plugin-template-mustache` 
- `hypergen-plugin-template-nunjucks`
- `hypergen-plugin-validator-typescript` (future)
- `hypergen-plugin-formatter-prettier` (future)

## Template Engine Plugin Interface

### Core Interface

All template engine plugins must implement the `TemplateEngine` interface:

```typescript
export interface TemplateEngine {
  /**
   * Unique identifier for the template engine
   */
  readonly name: string

  /**
   * File extensions this engine supports (e.g., ['.hbs', '.handlebars'])
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
   * @param extension - File extension to check (e.g., '.hbs')
   * @returns true if the extension is supported
   */
  supports(extension: string): boolean

  /**
   * Configure the template engine with options
   * @param options - Engine-specific configuration options
   */
  configure(options: Record<string, any>): void
}
```

### Plugin Entry Point

Each plugin must export a `createTemplateEngine` function:

```typescript
export interface TemplateEnginePlugin {
  /**
   * Create a new instance of the template engine
   * @param options - Initial configuration options
   * @returns Template engine instance
   */
  createTemplateEngine(options?: Record<string, any>): TemplateEngine
}
```

## Creating a Template Engine Plugin

### Step 1: Setup Package Structure

Create a new npm package with the following structure:

```
hypergen-plugin-template-handlebars/
├── package.json
├── README.md
├── src/
│   ├── index.ts
│   └── handlebars-engine.ts
├── test/
│   └── handlebars-engine.test.ts
└── tsconfig.json
```

### Step 2: Package.json Configuration

```json
{
  "name": "hypergen-plugin-template-handlebars",
  "version": "1.0.0",
  "description": "Handlebars template engine plugin for Hypergen",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": [
    "hypergen",
    "hypergen-plugin",
    "template-engine",
    "handlebars"
  ],
  "hypergen": {
    "type": "template-engine",
    "name": "handlebars"
  },
  "peerDependencies": {
    "hypergen": ">=7.0.0"
  },
  "dependencies": {
    "handlebars": "^4.7.7"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "hypergen": "^7.0.0"
  }
}
```

### Step 3: Implement the Template Engine

```typescript
// src/handlebars-engine.ts
import Handlebars from 'handlebars'
import fs from 'fs-extra'
import type { TemplateEngine } from 'hypergen/template-engines'

export class HandlebarsTemplateEngine implements TemplateEngine {
  readonly name = 'handlebars'
  readonly supportedExtensions = ['.hbs', '.handlebars', '.hbs.t', '.handlebars.t']
  
  private handlebars: typeof Handlebars

  constructor(options: Record<string, any> = {}) {
    this.handlebars = Handlebars.create()
    this.configure(options)
    this.setupHelpers()
  }

  async render(template: string, context: Record<string, any>): Promise<string> {
    try {
      const compiledTemplate = this.handlebars.compile(template)
      return compiledTemplate(context)
    } catch (error) {
      throw new Error(`Handlebars template rendering failed: ${error.message}`)
    }
  }

  async renderFile(filePath: string, context: Record<string, any>): Promise<string> {
    try {
      const templateContent = await fs.readFile(filePath, 'utf-8')
      return this.render(templateContent, context)
    } catch (error) {
      throw new Error(`Handlebars file rendering failed (${filePath}): ${error.message}`)
    }
  }

  supports(extension: string): boolean {
    return this.supportedExtensions.includes(extension)
  }

  configure(options: Record<string, any>): void {
    // Configure Handlebars with custom options
    if (options.helpers) {
      Object.entries(options.helpers).forEach(([name, helper]) => {
        this.handlebars.registerHelper(name, helper)
      })
    }
    
    if (options.partials) {
      Object.entries(options.partials).forEach(([name, partial]) => {
        this.handlebars.registerPartial(name, partial)
      })
    }
  }

  private setupHelpers(): void {
    // Register default helpers that match Hypergen's context
    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1)
    })

    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/[-_\\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    })

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_\\s]+/g, '-')
    })

    // Add more helpers as needed...
  }
}
```

### Step 4: Create Plugin Entry Point

```typescript
// src/index.ts
import { HandlebarsTemplateEngine } from './handlebars-engine.js'
import type { TemplateEngine } from 'hypergen/template-engines'

export { HandlebarsTemplateEngine }

export function createTemplateEngine(options?: Record<string, any>): TemplateEngine {
  return new HandlebarsTemplateEngine(options)
}

// Default export for auto-discovery
export default {
  createTemplateEngine,
  type: 'template-engine',
  name: 'handlebars'
}
```

### Step 5: Add Tests

```typescript
// test/handlebars-engine.test.ts
import { describe, it, expect } from 'vitest'
import { HandlebarsTemplateEngine } from '../src/handlebars-engine.js'

describe('HandlebarsTemplateEngine', () => {
  it('should render simple templates', async () => {
    const engine = new HandlebarsTemplateEngine()
    const template = 'Hello {{name}}!'
    const context = { name: 'World' }
    
    const result = await engine.render(template, context)
    expect(result).toBe('Hello World!')
  })

  it('should support helpers', async () => {
    const engine = new HandlebarsTemplateEngine()
    const template = 'Hello {{capitalize name}}!'
    const context = { name: 'john' }
    
    const result = await engine.render(template, context)
    expect(result).toBe('Hello John!')
  })

  it('should support file extensions', () => {
    const engine = new HandlebarsTemplateEngine()
    
    expect(engine.supports('.hbs')).toBe(true)
    expect(engine.supports('.handlebars')).toBe(true)
    expect(engine.supports('.hbs.t')).toBe(true)
    expect(engine.supports('.ejs')).toBe(false)
  })
})
```

## Plugin Auto-Discovery System

### How It Works

1. **Package Detection**: Hypergen scans `node_modules` for packages matching the pattern `hypergen-plugin-*`
2. **Plugin Validation**: Each discovered package is validated for the correct structure and exports
3. **Automatic Registration**: Valid plugins are automatically registered with the appropriate factory
4. **Configuration**: Plugins can be configured through the Hypergen configuration file

### Configuration

Plugins can be configured in `hypergen.json`:

```json
{
  "plugins": {
    "template-engines": {
      "handlebars": {
        "enabled": true,
        "options": {
          "helpers": {
            "customHelper": "path/to/helper.js"
          }
        }
      }
    }
  }
}
```

### Manual Registration

For development or custom scenarios, plugins can be manually registered:

```typescript
import { templateEngineFactory } from 'hypergen/template-engines'
import { createTemplateEngine } from 'hypergen-plugin-template-handlebars'

// Manual registration
const handlebarsEngine = createTemplateEngine({
  // custom options
})
templateEngineFactory.register(handlebarsEngine)
```

## Best Practices

### 1. Error Handling
- Always wrap template rendering in try-catch blocks
- Provide meaningful error messages that include context
- Handle both string and file-based template rendering

### 2. Performance
- Implement caching where appropriate
- Use lazy loading for expensive dependencies
- Optimize for multiple template renders

### 3. Configuration
- Support flexible configuration options
- Provide sensible defaults
- Document all configuration options

### 4. Testing
- Test with various template patterns
- Test error conditions
- Test integration with Hypergen's context system

### 5. Documentation
- Provide clear README with examples
- Document all supported features
- Include migration guides from other template engines

## Plugin Development Tools

### Testing with Hypergen

```typescript
// test/integration.test.ts
import { describe, it, expect } from 'vitest'
import { initializeTemplateEngines, getTemplateEngineFactory } from 'hypergen/template-engines'
import { createTemplateEngine } from '../src/index.js'

describe('Handlebars Plugin Integration', () => {
  it('should integrate with Hypergen template engine factory', () => {
    initializeTemplateEngines()
    const factory = getTemplateEngineFactory()
    
    // Register our plugin
    factory.register(createTemplateEngine())
    
    // Verify registration
    expect(factory.get('handlebars')).toBeDefined()
    expect(factory.getForExtension('.hbs')).toBeDefined()
  })
})
```

### Development Workflow

1. Create plugin package structure
2. Implement template engine interface
3. Add comprehensive tests
4. Test integration with Hypergen
5. Add documentation and examples
6. Publish to npm with correct naming convention

## Future Plugin Types

The plugin system is designed to be extensible. Future plugin types may include:

- **Validators**: `hypergen-plugin-validator-typescript`
- **Formatters**: `hypergen-plugin-formatter-prettier`
- **Generators**: `hypergen-plugin-generator-react`
- **Hooks**: `hypergen-plugin-hook-git`
- **Transformers**: `hypergen-plugin-transformer-babel`

Each plugin type will have its own interface and auto-discovery pattern, following the same principles established for template engines.

## Contributing

To contribute to the plugin system:

1. Review the plugin interfaces in `src/template-engines/types.ts`
2. Create example plugins for testing
3. Improve auto-discovery mechanisms
4. Add new plugin types as needed
5. Update documentation and guides

## Support

For plugin development support:
- Check the [Hypergen documentation](https://hypergen.dev)
- Review existing plugin examples
- Open issues for bugs or feature requests
- Contribute to the plugin ecosystem