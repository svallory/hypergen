# Hypergen Example Generators

This directory contains comprehensive example generators that demonstrate the capabilities of the Hypergen V8 architecture. Each generator showcases different aspects of the `@action` decorator system and template composition.

## Available Generators

### 1. React Component Generator
**Location:** `_templates/react-component/`

Generates React components with TypeScript support, including:
- Functional or class components
- Optional Storybook stories
- Comprehensive test files
- Multiple styling options (CSS, SCSS, styled-components)

**Usage:**
```bash
hypergen action create-react-component --name Button --type functional --withStorybook true
```

### 2. API Endpoint Generator
**Location:** `_templates/api-endpoint/`

Creates REST API endpoints with:
- Multiple HTTP methods (GET, POST, PUT, DELETE)
- Authentication middleware
- Input validation
- Multiple framework support (Express, Fastify, Koa)
- Database integration (MongoDB, PostgreSQL, MySQL)
- Comprehensive test suites

**Usage:**
```bash
hypergen action create-api-endpoint --name user --methods GET,POST,PUT,DELETE --withAuth true
```

### 3. Database Schema Generator
**Location:** `_templates/database-schema/`

Generates database schemas with:
- Multiple database support (MongoDB, PostgreSQL, MySQL, SQLite)
- Migration files
- Model/schema definitions
- Seed data files
- Field validation and constraints

**Usage:**
```bash
hypergen action create-database-schema --tableName users --database postgresql --withMigration true
```

### 4. CLI Tool Generator
**Location:** `_templates/cli-tool/`

Creates CLI applications with:
- Commander.js integration
- Multiple commands
- Configuration file support
- Logging utilities
- Package.json generation
- Test suites

**Usage:**
```bash
hypergen action create-cli-tool --name dev-tools --commands init,build,deploy --withConfig true
```

### 5. Configuration File Generator
**Location:** `_templates/config-file/`

Generates configuration files for:
- ESLint, Prettier, TypeScript
- Jest, Webpack, Vite, Tailwind
- Multiple formats (JSON, JS, YAML)
- Preset configurations for React, Node.js, etc.
- Explanatory comments

**Usage:**
```bash
hypergen action create-config-file --type eslint --format js --preset react --withComments true
```

### 6. Test Suite Generator
**Location:** `_templates/test-suite/`

Creates comprehensive test suites with:
- Multiple frameworks (Jest, Vitest, Cypress, Playwright)
- Unit, integration, and E2E tests
- Coverage configuration
- Mock implementations
- Test fixtures and utilities

**Usage:**
```bash
hypergen action create-test-suite --framework jest --testType all --withCoverage true
```

## Architecture Highlights

### @action Decorator System
Each generator demonstrates the `@action` decorator pattern:

```typescript
@action({
  name: 'create-react-component',
  description: 'Generate a React component with TypeScript',
  category: 'react',
  tags: ['react', 'component', 'typescript'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      pattern: '^[a-zA-Z][a-zA-Z0-9]*$'
    }
  ],
  examples: [
    {
      title: 'Basic component',
      parameters: { name: 'Button' }
    }
  ]
})
export async function createReactComponent(context: ActionContext): Promise<ActionResult> {
  // Implementation
}
```

### Template.yml Integration
Each generator includes a `template.yml` file that mirrors the `@action` decorator configuration:

```yaml
name: react-component
description: Generate React components with TypeScript
version: 1.0.0
author: Hypergen Team

variables:
  name:
    type: string
    required: true
    description: Component name
    pattern: "^[a-zA-Z][a-zA-Z0-9]*$"

examples:
  - title: "Basic component"
    variables:
      name: "Button"
```

### Parameter Validation
All generators demonstrate comprehensive parameter validation:
- Type checking (string, boolean, enum, array, object)
- Required field validation
- Pattern matching with regex
- Default value assignment
- Enum value constraints

### File Generation Patterns
Each generator follows consistent patterns:
- Directory structure creation
- Multiple file generation
- Template composition
- Error handling with meaningful messages
- Success reporting with file lists

## Running the Examples

To test these generators, use the Hypergen CLI:

```bash
# List available actions
hypergen discover

# Get help for specific action
hypergen action create-react-component --help

# Run with parameters
hypergen action create-react-component --name MyComponent --type functional --withTests true

# Run with example configuration
hypergen action create-api-endpoint --example "User management endpoints"
```

## Key Features Demonstrated

1. **Type Safety**: All generators use TypeScript with proper type definitions
2. **Parameter Validation**: Comprehensive validation with helpful error messages
3. **Template Composition**: Complex file generation with multiple templates
4. **Error Handling**: Graceful error handling with rollback capabilities
5. **Extensibility**: Easy to extend with new parameters and file types
6. **Documentation**: Self-documenting with examples and descriptions
7. **Testing**: All generators include test file generation
8. **Configuration**: Flexible configuration options for different use cases

## Adding New Generators

To add a new generator:

1. Create a new directory under `_templates/`
2. Create an `actions.ts` file with `@action` decorator
3. Create a `template.yml` file with variable definitions
4. Implement the action function with proper error handling
5. Add examples and documentation
6. Test the generator with various parameter combinations

Each generator serves as a complete example of the Hypergen V8 architecture capabilities.