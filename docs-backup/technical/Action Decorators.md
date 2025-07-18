# Action Decorators Implementation

## Overview

The Action Decorator system implements `@action` decorators for defining generator actions with parameters, descriptions, and metadata. This replaces the traditional action configuration with a more modern, type-safe approach that integrates seamlessly with the V8 architecture.

## Architecture Integration

Action Decorators fit into V8 architecture as:
- **Actions**: JavaScript/TypeScript functions decorated with `@action`
- **Parameters**: Defined in decorator metadata, work like template variables
- **Generators**: Import and reference action functions in their configuration
- **CLI Integration**: Actions can be executed via `hypergen action <action-name>`

## Implementation Details

### Data Structures

```typescript
// Action decorator metadata
interface ActionMetadata {
  name: string
  description?: string
  parameters?: ActionParameter[]
  category?: string
  tags?: string[]
  examples?: ActionExample[]
}

// Action parameter definition (similar to template variables)
interface ActionParameter {
  name: string
  type: ParameterType
  required?: boolean
  default?: any
  prompt?: string
  description?: string
  validation?: ParameterValidation
  // Type-specific properties
  values?: string[] // for enum
  min?: number // for number
  max?: number // for number
  pattern?: string // for string
}

type ParameterType = 'string' | 'boolean' | 'number' | 'enum' | 'array' | 'object' | 'file' | 'directory'

interface ParameterValidation {
  required?: boolean
  custom?: string // path to custom validator
  message?: string // custom error message
}

// Action execution context
interface ActionContext {
  variables: Record<string, any> // resolved parameters
  projectRoot: string
  templatePath?: string
  logger: ActionLogger
  utils: ActionUtils
}

// Action execution result
interface ActionResult {
  success: boolean
  message?: string
  filesCreated?: string[]
  filesModified?: string[]
  filesDeleted?: string[]
  data?: any
}

// Action function signature
type ActionFunction = (context: ActionContext) => Promise<ActionResult>

// Decorated action interface
interface DecoratedAction {
  metadata: ActionMetadata
  fn: ActionFunction
  module: string
  exported: boolean
}
```

### Core Algorithms

#### 1. Decorator Implementation
```typescript
// Action decorator factory
export function action(metadata: ActionMetadata) {
  return function <T extends ActionFunction>(
    target: T,
    propertyKey?: string,
    descriptor?: PropertyDescriptor
  ): T {
    // Store metadata on the function
    const actionMetadata: ActionMetadata = {
      name: metadata.name,
      description: metadata.description,
      parameters: metadata.parameters || [],
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      examples: metadata.examples || []
    }

    // Attach metadata to function
    ;(target as any).__actionMetadata = actionMetadata

    // Register with action registry
    ActionRegistry.getInstance().register(target, actionMetadata)

    return target
  }
}

// Usage example:
@action({
  name: 'cleanup',
  description: 'Remove generated files and dependencies',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      prompt: 'Component name to clean up?'
    }
  ]
})
export async function cleanup(context: ActionContext): Promise<ActionResult> {
  // Implementation here
}
```

#### 2. Action Registry
```typescript
class ActionRegistry {
  private static instance: ActionRegistry
  private actions: Map<string, DecoratedAction> = new Map()

  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry()
    }
    return ActionRegistry.instance
  }

  register(fn: ActionFunction, metadata: ActionMetadata): void {
    const action: DecoratedAction = {
      metadata,
      fn,
      module: this.getModulePath(fn),
      exported: true
    }

    this.actions.set(metadata.name, action)
  }

  get(name: string): DecoratedAction | undefined {
    return this.actions.get(name)
  }

  getAll(): DecoratedAction[] {
    return Array.from(this.actions.values())
  }

  getByCategory(category: string): DecoratedAction[] {
    return this.getAll().filter(action => action.metadata.category === category)
  }

  getByTags(tags: string[]): DecoratedAction[] {
    return this.getAll().filter(action => 
      action.metadata.tags?.some(tag => tags.includes(tag))
    )
  }

  private getModulePath(fn: ActionFunction): string {
    // Extract module path from function for better error reporting
    return fn.toString().includes('file://') ? 'unknown' : 'inline'
  }
}
```

#### 3. Parameter Resolution
```typescript
class ActionParameterResolver {
  async resolveParameters(
    metadata: ActionMetadata,
    provided: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = { ...provided }
    
    if (!metadata.parameters) {
      return resolved
    }

    for (const param of metadata.parameters) {
      if (resolved[param.name] === undefined) {
        if (param.default !== undefined) {
          resolved[param.name] = param.default
        } else if (param.required) {
          // For now, throw error; in full implementation, this would prompt
          throw new Error(`Required parameter '${param.name}' not provided`)
        }
      }

      // Validate parameter
      if (resolved[param.name] !== undefined) {
        const validation = this.validateParameter(
          param.name, 
          resolved[param.name], 
          param, 
          resolved
        )
        
        if (!validation.valid) {
          throw new Error(`Parameter validation failed for '${param.name}': ${validation.message}`)
        }
      }
    }

    return resolved
  }

  private validateParameter(
    name: string,
    value: any,
    param: ActionParameter,
    allValues: Record<string, any>
  ): { valid: boolean; message?: string } {
    // Type validation (similar to template variable validation)
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, message: `Expected string, got ${typeof value}` }
        }
        if (param.pattern) {
          const regex = new RegExp(param.pattern)
          if (!regex.test(value)) {
            return { 
              valid: false, 
              message: param.validation?.message || `Value does not match pattern: ${param.pattern}` 
            }
          }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, message: `Expected boolean, got ${typeof value}` }
        }
        break

      case 'number':
        if (typeof value !== 'number') {
          return { valid: false, message: `Expected number, got ${typeof value}` }
        }
        if (param.min !== undefined && value < param.min) {
          return { valid: false, message: `Value ${value} is below minimum ${param.min}` }
        }
        if (param.max !== undefined && value > param.max) {
          return { valid: false, message: `Value ${value} is above maximum ${param.max}` }
        }
        break

      case 'enum':
        if (!param.values?.includes(value)) {
          return { 
            valid: false, 
            message: `Value '${value}' is not in allowed values: ${param.values?.join(', ')}` 
          }
        }
        break

      case 'file':
        if (typeof value !== 'string') {
          return { valid: false, message: 'File path must be a string' }
        }
        // Could add file existence validation here
        break

      case 'directory':
        if (typeof value !== 'string') {
          return { valid: false, message: 'Directory path must be a string' }
        }
        break
    }

    return { valid: true }
  }
}
```

#### 4. Action Execution Engine
```typescript
class ActionExecutor {
  private parameterResolver = new ActionParameterResolver()

  async execute(
    actionName: string,
    parameters: Record<string, any> = {},
    context: Partial<ActionContext> = {}
  ): Promise<ActionResult> {
    const registry = ActionRegistry.getInstance()
    const action = registry.get(actionName)

    if (!action) {
      throw new Error(`Action '${actionName}' not found`)
    }

    try {
      // Resolve parameters
      const resolvedParams = await this.parameterResolver.resolveParameters(
        action.metadata,
        parameters
      )

      // Build execution context
      const executionContext: ActionContext = {
        variables: resolvedParams,
        projectRoot: context.projectRoot || process.cwd(),
        templatePath: context.templatePath,
        logger: context.logger || new ConsoleActionLogger(),
        utils: context.utils || new ActionUtils()
      }

      // Execute action
      const result = await action.fn(executionContext)

      return result
    } catch (error) {
      return {
        success: false,
        message: `Action execution failed: ${error.message}`
      }
    }
  }
}
```

### Error Handling

```typescript
class ActionExecutionError extends Error {
  constructor(
    message: string,
    public actionName: string,
    public parameterErrors?: string[],
    public cause?: Error
  ) {
    super(message)
    this.name = 'ActionExecutionError'
  }
}

class ActionParameterError extends Error {
  constructor(
    message: string,
    public parameterName: string,
    public parameterValue: any,
    public expectedType: ParameterType
  ) {
    super(message)
    this.name = 'ActionParameterError'
  }
}
```

## API Design

### Public Interface
```typescript
// Main decorator
export function action(metadata: ActionMetadata): MethodDecorator

// Action execution
export class ActionExecutor {
  async execute(
    actionName: string,
    parameters?: Record<string, any>,
    context?: Partial<ActionContext>
  ): Promise<ActionResult>
}

// Registry access
export class ActionRegistry {
  static getInstance(): ActionRegistry
  get(name: string): DecoratedAction | undefined
  getAll(): DecoratedAction[]
  getByCategory(category: string): DecoratedAction[]
}

// Utilities for action implementations
export class ActionUtils {
  async readFile(path: string): Promise<string>
  async writeFile(path: string, content: string): Promise<void>
  async deleteFile(path: string): Promise<void>
  async ensureDir(path: string): Promise<void>
  async copyFile(src: string, dest: string): Promise<void>
  async installPackages(packages: string[]): Promise<void>
  async runCommand(command: string, cwd?: string): Promise<string>
}

// Logging interface
export interface ActionLogger {
  success(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}
```

### Usage Examples
```typescript
// Basic action
@action({
  name: 'create-component',
  description: 'Create a new React component',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      prompt: 'Component name?'
    }
  ]
})
export async function createComponent(context: ActionContext): Promise<ActionResult> {
  const { variables, logger, utils } = context
  const componentName = variables.name as string

  await utils.writeFile(
    `src/components/${componentName}.tsx`,
    `export const ${componentName} = () => <div>${componentName}</div>`
  )

  logger.success(`Created component ${componentName}`)

  return {
    success: true,
    filesCreated: [`src/components/${componentName}.tsx`]
  }
}

// Action with complex parameters
@action({
  name: 'setup-database',
  description: 'Setup database configuration and migrations',
  category: 'database',
  tags: ['db', 'migration', 'setup'],
  parameters: [
    {
      name: 'provider',
      type: 'enum',
      values: ['postgresql', 'mysql', 'sqlite'],
      required: true,
      prompt: 'Database provider?'
    },
    {
      name: 'host',
      type: 'string',
      default: 'localhost',
      prompt: 'Database host?'
    },
    {
      name: 'port',
      type: 'number',
      min: 1,
      max: 65535,
      default: 5432,
      prompt: 'Database port?'
    },
    {
      name: 'createMigrations',
      type: 'boolean',
      default: true,
      prompt: 'Create initial migrations?'
    }
  ]
})
export async function setupDatabase(context: ActionContext): Promise<ActionResult> {
  const { variables, logger, utils } = context
  
  // Implementation...
  
  return { success: true }
}

// File operation action
@action({
  name: 'cleanup',
  description: 'Remove generated files',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      required: true,
      prompt: 'File pattern to remove (glob)?'
    },
    {
      name: 'dryRun',
      type: 'boolean',
      default: false,
      prompt: 'Dry run (don\'t actually delete)?'
    }
  ]
})
export async function cleanup(context: ActionContext): Promise<ActionResult> {
  const { variables, logger, utils } = context
  const pattern = variables.pattern as string
  const dryRun = variables.dryRun as boolean

  // Use glob to find files
  const filesToDelete = await utils.glob(pattern)
  
  if (dryRun) {
    logger.info(`Would delete ${filesToDelete.length} files:`)
    filesToDelete.forEach(file => logger.info(`  - ${file}`))
  } else {
    for (const file of filesToDelete) {
      await utils.deleteFile(file)
      logger.success(`Deleted ${file}`)
    }
  }

  return {
    success: true,
    filesDeleted: dryRun ? [] : filesToDelete
  }
}
```

## Testing Strategy

### Unit Tests
- Decorator application and metadata storage
- Parameter validation for all types
- Action registry operations
- Error handling scenarios

### Integration Tests
- End-to-end action execution
- Parameter resolution from CLI args
- File operations and side effects
- Action composition and chaining

### Test Examples
```typescript
describe('Action Decorator System', () => {
  it('should register action with metadata', () => {
    @action({
      name: 'test-action',
      description: 'Test action'
    })
    function testAction(context: ActionContext) {
      return Promise.resolve({ success: true })
    }

    const registry = ActionRegistry.getInstance()
    const registered = registry.get('test-action')
    
    expect(registered).toBeDefined()
    expect(registered!.metadata.name).toBe('test-action')
  })

  it('should validate parameters correctly', async () => {
    const resolver = new ActionParameterResolver()
    
    const metadata: ActionMetadata = {
      name: 'test',
      parameters: [
        {
          name: 'count',
          type: 'number',
          min: 1,
          max: 10,
          required: true
        }
      ]
    }

    // Valid parameter
    const valid = await resolver.resolveParameters(metadata, { count: 5 })
    expect(valid.count).toBe(5)

    // Invalid parameter
    await expect(
      resolver.resolveParameters(metadata, { count: 15 })
    ).rejects.toThrow('above maximum')
  })
})
```

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Load action modules only when needed
- **Registry Caching**: Cache resolved actions and metadata
- **Parameter Validation**: Validate parameters once, reuse results
- **Parallel Execution**: Support concurrent action execution

### Memory Management
- Weak references for action functions to prevent memory leaks
- Cleanup unused registry entries
- Stream large file operations

## Security Considerations

### Action Isolation
- Sandbox action execution environments
- Limit file system access to project directory
- Validate all user inputs and file paths
- Prevent code injection in dynamic action loading

### Parameter Security
- Sanitize all parameter inputs
- Validate file and directory paths
- Prevent prototype pollution
- Rate limiting for action execution

## Migration Path

### From Current System
1. **Gradual Migration**: Support both decorated and traditional actions
2. **Automatic Detection**: Scan for both action types
3. **Migration Tools**: Convert existing actions to decorated format
4. **Documentation**: Provide migration guide and examples

### Integration Points
- **Template Hooks**: Actions can be called from template lifecycle hooks
- **CLI Integration**: Direct action execution via command line
- **Generator Config**: Reference action functions in generator configuration
- **API Access**: Programmatic action execution for tooling

## Examples

### Generator Configuration with Actions
```typescript
// generator.config.ts
import { cleanup } from './actions/cleanup.js'
import { migrate } from './actions/migrate.js'
import { setupTests } from './actions/setup-tests.js'

export default {
  name: 'react-components',
  version: '1.0.0',
  
  // Action functions imported and referenced
  actions: [
    cleanup,
    migrate,
    setupTests
  ],
  
  // Global hooks using actions
  hooks: {
    beforeAll: [setupTests],
    afterAll: [cleanup]
  }
} satisfies GeneratorConfig
```

### CLI Usage
```bash
# Execute action directly
hypergen action cleanup --pattern "**/*.tmp" --dryRun false

# Execute action with prompts
hypergen action setup-database
# ? Database provider? postgresql
# ? Database host? localhost
# ? Database port? 5432
# ? Create initial migrations? Yes

# List available actions
hypergen action list
hypergen action list --category database
hypergen action list --tags migration,setup
```

This decorator system provides a modern, type-safe way to define and execute actions while maintaining the simplicity and power of the V8 architecture.