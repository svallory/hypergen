# Hypergen v8 Architecture Design

## Overview

Hypergen v8 introduces a completely new architecture based on three clear concepts:
- **Templates**: Atomic content units that must be applied entirely
- **Actions**: Functions that transform projects programmatically 
- **Generators**: Packages containing templates and/or actions with composability

## Core Concepts

### Template
An atomic unit of content generation that includes:
- Configuration (variables, metadata)
- One or more template files
- Execution context and dependencies

### Action  
A JavaScript/TypeScript function that performs project transformations:
- File operations (delete, move, copy)
- Dependency management (install, remove packages)
- Programmatic file modifications
- External tool integration

### Generator
A package (local or remote) that exports templates and/or actions:
- Can define its own templates/actions
- Can extend/compose other generators
- Provides a distribution and versioning mechanism

## File Structure

```
generators/
  my-generator/
    generator.config.ts        # Generator configuration
    templates/
      react-component/         # Template name
        template.yml          # Template configuration
        component.liquid      # Template files
        test.liquid
        index.liquid
      api-endpoint/
        template.yml
        controller.liquid
        route.liquid
    actions/
      cleanup.ts              # Action functions
      migrate.ts
    lib/                      # Shared utilities
      helpers.ts
```

## Generator Configuration

### `generator.config.ts`
```typescript
import type { GeneratorConfig } from 'hypergen'
import { cleanup } from './actions/cleanup.js'
import { migrate } from './actions/migrate.js'

export default {
  name: 'react-components',
  version: '1.0.0',
  description: 'React component templates and utilities',
  
  // Generator composition
  extends: [
    'github:facebook/react-devtools-generator@v2.1.0',
    'npm:@storybook/hypergen-templates@^3.0.0',
    './local-shared-generator'
  ],
  
  // Templates are auto-discovered by scanning for template.yml files
  // No need to explicitly define them here
  
  // Action functions (imported from action files)
  actions: [
    cleanup,
    migrate
  ],
  
  // Global hooks for all templates in this generator
  hooks: {
    beforeAll: ['./actions/setup-environment.ts'],
    afterAll: ['./actions/cleanup-temp.ts']
  }
} satisfies GeneratorConfig
```

## Template Configuration

### `template.yml`
```yaml
title: "React Component"
description: "Creates a React component with tests and styles"

# Template inheritance and composition
extends:
  - url: "github:react-community/base-component@v1.0.0"
    variables:
      typescript: "{{ typescript }}"
      styled: "{{ styling === 'styled-components' }}"
  
  - url: "./shared-component-base"
    variables:
      componentType: "{{ type }}"

# Variable definitions
variables:
  name:
    type: string
    required: true
    prompt: "Component name?"
  
  typescript:
    type: boolean
    default: true
    prompt: "Use TypeScript?"
  
  styling:
    type: enum
    values: [css-modules, styled-components, tailwind]
    default: css-modules
    prompt: "Styling approach?"
  
  type:
    type: enum
    values: [functional, class]
    default: functional
    internal: true  # Computed, not prompted

# Execution hooks and ordering
hooks:
  # Run before processing this template
  before:
    - action: "npm:@typescript/generator.check-typescript"
      condition: "{{ typescript }}"
    
  # Run after processing this template  
  after:
    - action: "./actions/update-index"
      variables:
        componentName: "{{ name }}"
    
    - action: "npm:@storybook/generator.add-story"
      condition: "{{ storybook }}"
      variables:
        component: "{{ name }}"

# File processing order (if specific order needed)
files:
  - component.liquid    # Process first
  - test.liquid        # Then test
  - index.liquid       # Finally index
```

## Action Implementation

### `actions/cleanup.ts`
```typescript
import type { ActionContext, ActionResult } from 'hypergen'
import { action } from 'hypergen/decorators'
import fs from 'fs-extra'
import path from 'path'

@action({
  name: 'cleanup',
  description: 'Remove generated files and dependencies',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      prompt: 'Component name to clean up?'
    },
    {
      name: 'force',
      type: 'boolean',
      default: false,
      prompt: 'Force deletion without confirmation?'
    }
  ]
})
export async function cleanup(
  context: ActionContext
): Promise<ActionResult> {
  const { variables, projectRoot, logger } = context
  const componentName = variables.name as string
  
  // Delete component files
  const componentPath = path.join(
    projectRoot, 
    'src/components', 
    componentName
  )
  
  if (await fs.pathExists(componentPath)) {
    await fs.remove(componentPath)
    logger.success(`Removed ${componentPath}`)
  }
  
  // Remove from index
  const indexPath = path.join(projectRoot, 'src/components/index.ts')
  if (await fs.pathExists(indexPath)) {
    let content = await fs.readFile(indexPath, 'utf-8')
    content = content.replace(
      new RegExp(`export \\* from '\\./${componentName}'\\n?`, 'g'),
      ''
    )
    await fs.writeFile(indexPath, content)
    logger.success(`Updated ${indexPath}`)
  }
  
  return { success: true, filesModified: [componentPath, indexPath] }
}
```

## Command Interface

### Basic Usage
```bash
# Run a template
hypergen run react-components.react-component --name Button --typescript

# Run an action
hypergen action react-components.cleanup --name Button --force

# List available templates/actions
hypergen list react-components
hypergen list react-components.templates
hypergen list react-components.actions
```

### Advanced Usage
```bash
# Install generator
hypergen install github:facebook/react-devtools@v2.1.0

# Run with specific version
hypergen run github:facebook/react-devtools@v2.1.0.component --name MyComponent

# Compose on the fly (creates temporary composed template)
hypergen compose \
  --template react-components.react-component \
  --template storybook.story \
  --template testing.jest-test \
  --name Button
```

## Composability and Extension

### Template Extension Process

1. **Load Base Template**: Parse template.yml and identify `extends`
2. **Resolve Dependencies**: Fetch extended templates recursively  
3. **Merge Variables**: Combine variable definitions (with conflict detection)
4. **Build Execution Plan**: Determine hook execution order
5. **Execute**: Run hooks and render templates in correct sequence

### Variable Merging Rules

```yaml
# Base template defines:
variables:
  type:
    type: enum
    values: [basic, advanced]
    default: basic

# Extending template can:
# 1. Override defaults
variables:
  type:
    default: advanced    # Override default

# 2. Add constraints  
variables:
  type:
    values: [advanced]   # Restrict options

# 3. Make internal (computed)
variables:
  type:
    internal: true       # No longer prompted
    default: "{{ typescript ? 'advanced' : 'basic' }}"
```

### Hook Execution Order

```yaml
# Template A extends Template B
# Execution order:
1. Template B hooks.before
2. Template B file processing  
3. Template B hooks.after
4. Template A hooks.before
5. Template A file processing
6. Template A hooks.after
```

### Conflict Resolution

```typescript
interface ConflictResolution {
  strategy: 'fail' | 'override' | 'merge' | 'prompt'
  
  // For variable conflicts
  variableConflicts: {
    [variableName: string]: {
      strategy: 'override' | 'merge' | 'prompt'
      source: 'base' | 'extending' | 'user'
    }
  }
  
  // For file conflicts  
  fileConflicts: {
    [fileName: string]: {
      strategy: 'override' | 'merge' | 'rename' | 'skip'
    }
  }
}
```

## Generator Registry and Discovery

### Local Generators
```bash
# Scan for generators in current project
hypergen scan ./generators
hypergen scan ./node_modules/@company/hypergen-*

# Use local generator
hypergen run ./generators/my-local-generator.template-name
```

### Remote Generators
```bash
# GitHub repositories
hypergen run github:facebook/react-devtools@v2.1.0.component

# npm packages  
hypergen run npm:@storybook/hypergen-templates@^3.0.0.story

# Direct URLs
hypergen run https://gist.github.com/user/abc123/generator.zip.template-name
```

### Caching and Versioning
- Remote generators cached in `~/.hypergen/cache/`
- Version resolution follows semver
- Cache invalidation based on version and TTL
- Integrity verification for remote content

## Extension Scenarios

### Scenario 1: Simple Template Extension
```yaml
# Base: github:react-community/base-component
title: "Base React Component"
variables:
  name:
    type: string
    required: true

# Extending: my-generator/advanced-component  
extends:
  - url: "github:react-community/base-component"
    variables:
      name: "{{ name }}"

variables:
  typescript:
    type: boolean
    default: true
    
# Result: User prompted for 'name', typescript defaults to true
# Base component logic + typescript additions
```

### Scenario 2: Variable Override and Computation
```yaml
# Base template asks for 'styling' approach
variables:
  styling:
    type: enum
    values: [css, scss, styled-components]
    prompt: "Styling approach?"

# Extending template makes it computed
extends:
  - url: "./base-component"
    variables:
      styling: "{{ framework === 'emotion' ? 'styled-components' : 'css' }}"

variables:
  framework:
    type: enum  
    values: [react, emotion, styled-system]
    prompt: "CSS framework?"
    
# Result: User only prompted for 'framework'
# 'styling' computed based on framework choice
```

### Scenario 3: Hook-Based Coordination
```yaml
# Extended template adds package dependencies
extends:
  - url: "github:react-community/base-component"

hooks:
  before:
    # Install required dependencies before base template runs
    - action: "hypergen.actions.install-packages"
      variables:
        packages: ["react-router-dom", "@types/react-router-dom"]
        
  after:
    # Update routing after component is created
    - action: "./actions/add-to-routes"
      variables:
        component: "{{ name }}"
        route: "/{{ name | kebabCase }}"
```

### Scenario 4: Generator Composition
```typescript
// generator.config.ts
export default {
  name: 'full-stack-app',
  
  extends: [
    'github:react-team/frontend-generator@v2.0.0',
    'github:express-team/backend-generator@v1.5.0', 
    'github:database-team/postgres-generator@v3.0.0'
  ],
  
  templates: {
    'complete-app': {
      description: 'Full-stack app with frontend, backend, and database',
      
      // This template orchestrates the others
      hooks: {
        before: [
          // Setup project structure first
          './actions/setup-monorepo'
        ],
        
        after: [
          // Configure inter-service communication
          './actions/configure-proxy',
          './actions/setup-shared-types'
        ]
      }
    }
  }
} satisfies GeneratorConfig
```

## Execution Engine

### Template Resolution Algorithm
1. Parse template configuration
2. Resolve `extends` dependencies recursively
3. Detect circular dependencies
4. Build dependency graph
5. Merge variables using precedence rules
6. Create execution plan with hook ordering
7. Execute plan with proper error handling

### Error Handling
- **Dependency Resolution Errors**: Missing templates, version conflicts
- **Variable Conflicts**: Multiple templates define same variable differently  
- **File Conflicts**: Multiple templates generate same file
- **Hook Execution Errors**: Action failures, missing dependencies
- **Template Rendering Errors**: Invalid template syntax, missing variables

### Performance Optimization
- **Lazy Loading**: Load templates only when needed
- **Parallel Execution**: Run independent operations concurrently
- **Caching**: Cache resolved templates and rendered content
- **Incremental Updates**: Only re-render changed templates

This architecture provides true composability while maintaining clear conceptual boundaries and atomic operations. The extension system allows for powerful composition without sacrificing simplicity or predictability.