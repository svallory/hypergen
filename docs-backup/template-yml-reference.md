# Template.yml Reference

Complete reference for the `template.yml` configuration file that defines generator metadata, variables, and examples.

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Metadata Fields](#metadata-fields)
- [Variables](#variables)
- [Variable Types](#variable-types)
- [Variable Validation](#variable-validation)
- [Examples](#examples)
- [Dependencies](#dependencies)
- [Advanced Configuration](#advanced-configuration)
- [Best Practices](#best-practices)
- [Validation](#validation)

## Overview

The `template.yml` file is the configuration heart of your generator. It defines:

- Generator metadata (name, description, author)
- Variable definitions with types and validation
- Usage examples
- Dependencies and outputs
- Version information

## File Structure

```yaml
# Basic structure
name: string                 # Required
description: string          # Optional
version: string              # Optional
author: string               # Optional
category: string             # Optional
tags: string[]               # Optional

variables:                   # Required
  variable_name:
    type: string
    required: boolean
    # ... other properties

examples:                    # Optional
  - title: string
    description: string
    variables:
      key: value

dependencies: string[]       # Optional
outputs: string[]            # Optional
```

## Metadata Fields

### `name` (required)
The generator name, used for action execution:

```yaml
name: create-react-component
```

- Must be a valid identifier
- Used in CLI commands: `hypergen action create-react-component`
- Should be descriptive and unique

### `description` (optional)
A brief description of what the generator does:

```yaml
description: Creates a React component with TypeScript, tests, and stories
```

- Displayed in CLI help and listings
- Should be concise but informative
- Maximum recommended length: 100 characters

### `version` (optional)
Semantic version for the generator:

```yaml
version: 1.2.0
```

- Follows semver format (major.minor.patch)
- Used for compatibility checking
- Displayed in generator information

### `author` (optional)
Generator author information:

```yaml
author: John Doe <john@example.com>
```

- Can be name only or name with email
- Displayed in generator information
- Used for attribution

### `category` (optional)
Category for organizing generators:

```yaml
category: component
```

- Used for filtering with `hypergen list category`
- Common categories: `component`, `api`, `util`, `config`, `test`
- Should be lowercase and descriptive

### `tags` (optional)
Array of tags for searching and filtering:

```yaml
tags:
  - react
  - typescript
  - component
  - ui
```

- Used for search and discovery
- Should be relevant keywords
- Lowercase recommended

## Variables

Variables define the inputs your generator accepts. Each variable has a type and validation rules.

### Basic Variable Structure

```yaml
variables:
  variable_name:
    type: string              # Required
    required: boolean         # Optional, default: false
    default: any             # Optional
    description: string       # Optional
    # Type-specific properties...
```

### Variable Properties

#### `type` (required)
The variable type. See [Variable Types](#variable-types) for details.

#### `required` (optional, default: false)
Whether the variable is required:

```yaml
name:
  type: string
  required: true
  description: Component name
```

#### `default` (optional)
Default value when not provided:

```yaml
withTests:
  type: boolean
  required: false
  default: true
  description: Generate test files
```

**Note**: Cannot be used with `required: true`.

#### `description` (optional)
Human-readable description:

```yaml
framework:
  type: enum
  required: false
  default: react
  description: Target framework for the component
  values: [react, vue, angular]
```

## Variable Types

### String Variables

```yaml
name:
  type: string
  required: true
  description: Component name
  pattern: ^[A-Z][a-zA-Z0-9]*$  # Optional regex pattern
```

#### String Properties
- `pattern`: Regex pattern for validation
- `min`: Minimum length
- `max`: Maximum length

#### Examples

```yaml
# Basic string
title:
  type: string
  required: true
  description: Page title

# String with pattern validation
componentName:
  type: string
  required: true
  pattern: ^[A-Z][a-zA-Z0-9]*$
  description: Component name in PascalCase

# String with length limits
description:
  type: string
  required: false
  min: 10
  max: 200
  description: Component description
```

### Number Variables

```yaml
port:
  type: number
  required: false
  default: 3000
  min: 1000      # Optional minimum value
  max: 9999      # Optional maximum value
  description: Server port number
```

#### Number Properties
- `min`: Minimum value
- `max`: Maximum value

#### Examples

```yaml
# Basic number
version:
  type: number
  required: true
  description: API version number

# Number with range
timeout:
  type: number
  required: false
  default: 5000
  min: 1000
  max: 30000
  description: Request timeout in milliseconds
```

### Boolean Variables

```yaml
withTests:
  type: boolean
  required: false
  default: true
  description: Generate test files
```

#### Examples

```yaml
# Basic boolean
enabled:
  type: boolean
  required: false
  default: true
  description: Enable the feature

# Boolean flag
useTypeScript:
  type: boolean
  required: false
  default: false
  description: Use TypeScript instead of JavaScript
```

### Enum Variables

```yaml
framework:
  type: enum
  required: false
  default: react
  values:        # Required for enum type
    - react
    - vue
    - angular
  description: Target framework
```

#### Enum Properties
- `values`: Array of allowed values (required)

#### Examples

```yaml
# Framework selection
framework:
  type: enum
  required: true
  values: [react, vue, angular, svelte]
  description: Frontend framework

# HTTP methods
methods:
  type: enum
  required: false
  default: GET
  values: [GET, POST, PUT, DELETE, PATCH]
  description: HTTP method

# Size variants
size:
  type: enum
  required: false
  default: medium
  values: [small, medium, large, xlarge]
  description: Component size
```

### Array Variables

```yaml
dependencies:
  type: array
  required: false
  default: []
  description: List of dependencies
```

#### Examples

```yaml
# String array
tags:
  type: array
  required: false
  default: []
  description: Component tags

# Predefined options
features:
  type: array
  required: false
  default: []
  description: Features to include
```

### Object Variables

```yaml
config:
  type: object
  required: false
  default: {}
  description: Configuration object
```

#### Examples

```yaml
# API configuration
apiConfig:
  type: object
  required: false
  default:
    version: v1
    timeout: 5000
  description: API configuration

# Database settings
database:
  type: object
  required: false
  description: Database connection settings
```

## Variable Validation

### Pattern Validation (String)

```yaml
email:
  type: string
  required: true
  pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
  description: Email address

className:
  type: string
  required: true
  pattern: ^[a-z][a-zA-Z0-9]*$
  description: CSS class name in camelCase
```

### Range Validation (Number)

```yaml
priority:
  type: number
  required: false
  default: 1
  min: 1
  max: 10
  description: Priority level (1-10)

percentage:
  type: number
  required: true
  min: 0
  max: 100
  description: Percentage value
```

### Length Validation (String)

```yaml
password:
  type: string
  required: true
  min: 8
  max: 50
  description: Password (8-50 characters)

slug:
  type: string
  required: true
  min: 3
  max: 30
  pattern: ^[a-z0-9-]+$
  description: URL slug
```

### Enum Validation

```yaml
logLevel:
  type: enum
  required: false
  default: info
  values: [debug, info, warn, error]
  description: Logging level

environment:
  type: enum
  required: true
  values: [development, staging, production]
  description: Target environment
```

## Examples

Examples demonstrate how to use your generator with different parameter combinations.

### Basic Example Structure

```yaml
examples:
  - title: Basic React Component
    description: Create a simple React component
    variables:
      name: Button
      withTests: true
      withStories: false
  
  - title: Advanced Component with Stories
    description: Create a component with tests and Storybook stories
    variables:
      name: Card
      withTests: true
      withStories: true
      framework: react
      typescript: true
```

### Example Properties

#### `title` (required)
Short, descriptive title:

```yaml
title: API Endpoint with Authentication
```

#### `description` (optional)
Detailed description of the example:

```yaml
description: Creates a REST API endpoint with JWT authentication and request validation
```

#### `variables` (required)
Variable values for the example:

```yaml
variables:
  name: userProfile
  methods: [GET, PUT]
  withAuth: true
  withValidation: true
  database: postgresql
```

### Complex Examples

```yaml
examples:
  - title: Full-Featured React Component
    description: |
      Creates a React component with:
      - TypeScript support
      - Unit tests with Jest
      - Storybook stories
      - CSS modules
      - Accessibility features
    variables:
      name: SearchInput
      framework: react
      typescript: true
      withTests: true
      withStories: true
      withStyles: true
      withA11y: true
      testingLibrary: testing-library
  
  - title: Simple Vue Component
    description: Basic Vue component without extras
    variables:
      name: HelloWorld
      framework: vue
      typescript: false
      withTests: false
      withStories: false
  
  - title: Node.js API Endpoint
    description: |
      Creates a Node.js Express endpoint with:
      - Multiple HTTP methods
      - Input validation
      - Authentication middleware
      - Database integration
    variables:
      name: products
      methods: [GET, POST, PUT, DELETE]
      withAuth: true
      withValidation: true
      database: mongodb
      withPagination: true
```

## Dependencies

List external packages or tools required:

```yaml
dependencies:
  - react
  - typescript
  - @testing-library/react
  - @storybook/react
```

Usage:
- Documents what the generator needs
- Can be checked during generation
- Helps with error messages

## Advanced Configuration

### Outputs

List files that will be generated:

```yaml
outputs:
  - src/components/{name}.tsx
  - src/components/{name}.test.tsx
  - src/components/{name}.stories.tsx
  - src/components/{name}.module.css
```

### Conditional Configuration

Use variables in configuration:

```yaml
name: create-component
description: Create a <%= framework %> component

variables:
  framework:
    type: enum
    values: [react, vue, angular]
    required: true
  
  name:
    type: string
    required: true
    pattern: <%= framework === 'react' ? '^[A-Z][a-zA-Z0-9]*$' : '^[a-z][a-zA-Z0-9]*$' %>
```

## Best Practices

### 1. Clear Variable Names

```yaml
# Good
componentName:
  type: string
  description: Name of the React component

# Avoid
n:
  type: string
  description: Name
```

### 2. Provide Good Defaults

```yaml
# Good - sensible defaults
withTests:
  type: boolean
  default: true
  description: Generate test files

framework:
  type: enum
  default: react
  values: [react, vue, angular]
  description: Target framework
```

### 3. Use Descriptive Examples

```yaml
examples:
  - title: E-commerce Product Card
    description: |
      Creates a product card component with:
      - Product image and details
      - Add to cart functionality
      - Responsive design
      - Accessibility features
    variables:
      name: ProductCard
      withImage: true
      withAddToCart: true
      responsive: true
      accessible: true
```

### 4. Group Related Variables

```yaml
variables:
  # Component basics
  name:
    type: string
    required: true
  
  framework:
    type: enum
    values: [react, vue, angular]
    default: react
  
  # Testing options
  withTests:
    type: boolean
    default: true
  
  testingLibrary:
    type: enum
    values: [jest, vitest, cypress]
    default: jest
  
  # Documentation options
  withStories:
    type: boolean
    default: false
  
  withDocs:
    type: boolean
    default: false
```

### 5. Validate Input Properly

```yaml
email:
  type: string
  required: true
  pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
  description: Valid email address

port:
  type: number
  required: false
  default: 3000
  min: 1000
  max: 65535
  description: Port number (1000-65535)

slug:
  type: string
  required: true
  pattern: ^[a-z0-9-]+$
  min: 3
  max: 50
  description: URL slug (lowercase, numbers, hyphens only)
```

## Validation

Validate your template.yml file:

```bash
# Validate specific template
hypergen template validate _templates/my-generator/template.yml

# Show template information
hypergen template info _templates/my-generator/template.yml

# List all templates
hypergen template list _templates
```

### Common Validation Errors

1. **Missing required fields**:
   ```yaml
   # Error: name is required
   description: My generator
   variables: {}
   ```

2. **Invalid variable types**:
   ```yaml
   # Error: invalid type
   name:
     type: invalid_type
   ```

3. **Enum without values**:
   ```yaml
   # Error: enum must have values
   framework:
     type: enum
     # Missing values array
   ```

4. **Invalid regex patterns**:
   ```yaml
   # Error: invalid regex
   name:
     type: string
     pattern: '[unclosed'
   ```

5. **Required with default**:
   ```yaml
   # Error: required variables cannot have defaults
   name:
     type: string
     required: true
     default: "DefaultName"
   ```

For complete examples and usage patterns, see the [Examples](./examples.md) and [Getting Started](./getting-started.md) documentation.