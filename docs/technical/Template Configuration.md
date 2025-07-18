# Template Configuration Implementation

## Overview

The Template Configuration system implements `template.yml` parsing with rich variable types, validation, and metadata support. This is the foundation of the V8 architecture, replacing the current frontmatter-based approach with a structured YAML configuration.

## Architecture Integration

The Template Configuration system fits into V8 architecture as:
- **Templates**: Each template has a `template.yml` file defining its configuration
- **Variables**: Rich variable system with types, validation, and prompting
- **Composition**: Configuration supports `includes` for template composition

## Implementation Details

### Data Structures

```typescript
// Core template configuration interface
interface TemplateConfig {
  title?: string
  description?: string
  includes?: TemplateInclude[]
  variables?: Record<string, VariableDefinition>
  files?: string[]
  hooks?: TemplateHooks
}

// Template inclusion for composition
interface TemplateInclude {
  url: string
  variables?: Record<string, any>
  condition?: string
}

// Rich variable definition
interface VariableDefinition {
  type: VariableType
  required?: boolean
  default?: any
  prompt?: string
  description?: string
  internal?: boolean
  validation?: VariableValidation
  // Type-specific properties
  values?: string[] // for enum
  min?: number // for number
  max?: number // for number
  pattern?: string // for string
}

// Variable types supported
type VariableType = 'string' | 'boolean' | 'number' | 'enum' | 'array' | 'object'

// Validation rules
interface VariableValidation {
  required?: boolean
  custom?: string // path to custom validator
  message?: string // custom error message
}

// Template lifecycle hooks
interface TemplateHooks {
  before?: HookDefinition[]
  after?: HookDefinition[]
}

interface HookDefinition {
  action: string
  condition?: string
  variables?: Record<string, any>
}
```

### Core Algorithms

#### 1. Template Configuration Parser
```typescript
class TemplateConfigParser {
  async parseConfig(configPath: string): Promise<TemplateConfig> {
    // 1. Read and parse YAML file
    // 2. Validate against schema
    // 3. Resolve variable defaults
    // 4. Process includes recursively
    // 5. Return merged configuration
  }

  validateSchema(config: any): TemplateConfig {
    // JSON schema validation
    // Type checking for all properties
    // Circular dependency detection for includes
  }

  resolveIncludes(config: TemplateConfig): Promise<TemplateConfig> {
    // Process includes array
    // Fetch remote templates if needed
    // Merge variable definitions
    // Handle conflicts with resolution strategy
  }
}
```

#### 2. Variable System
```typescript
class VariableSystem {
  async promptForVariables(
    variables: Record<string, VariableDefinition>, 
    provided: Record<string, any>
  ): Promise<Record<string, any>> {
    // 1. Filter out internal variables
    // 2. Apply provided values
    // 3. Prompt for missing required variables
    // 4. Validate all values
    // 5. Compute internal variables
  }

  validateVariable(
    value: any, 
    definition: VariableDefinition
  ): ValidationResult {
    // Type checking
    // Range/pattern validation  
    // Custom validator execution
    // Return success/error with messages
  }

  computeInternalVariables(
    variables: Record<string, VariableDefinition>,
    values: Record<string, any>
  ): Record<string, any> {
    // Process variables marked as internal: true
    // Evaluate expressions using current values
    // Handle dependencies between internal variables
  }
}
```

### Error Handling

```typescript
class TemplateConfigError extends Error {
  constructor(
    message: string,
    public configPath: string,
    public field?: string,
    public validationErrors?: ValidationError[]
  ) {
    super(message)
  }
}

interface ValidationError {
  field: string
  value: any
  message: string
  code: string
}
```

Common error scenarios:
- Invalid YAML syntax
- Missing required variables
- Type validation failures
- Circular includes
- Custom validator failures
- File not found errors

## API Design

### Public Interface
```typescript
// Main parser class
export class TemplateConfigParser {
  constructor(options?: ParserOptions)
  
  async parseConfig(configPath: string): Promise<ParsedTemplateConfig>
  async parseConfigFromString(yaml: string, basePath?: string): Promise<ParsedTemplateConfig>
  
  validateConfig(config: any): ValidationResult
  resolveVariables(config: ParsedTemplateConfig, provided: Record<string, any>): Promise<ResolvedVariables>
}

// Parsed configuration with resolved includes
export interface ParsedTemplateConfig extends TemplateConfig {
  basePath: string
  resolvedIncludes: ParsedTemplateConfig[]
  allVariables: Record<string, VariableDefinition> // merged from includes
}

// Variables resolved with user input
export interface ResolvedVariables {
  values: Record<string, any>
  metadata: {
    prompted: string[]
    computed: string[]
    defaults: string[]
  }
}

// Configuration and validation
export interface ParserOptions {
  allowRemoteIncludes?: boolean
  includeCache?: Map<string, ParsedTemplateConfig>
  customValidators?: Record<string, ValidatorFunction>
  conflictResolution?: ConflictResolutionStrategy
}

type ValidatorFunction = (value: any, context: ValidationContext) => ValidationResult
type ConflictResolutionStrategy = 'fail' | 'override' | 'merge' | 'prompt'
```

### Usage Examples
```typescript
// Basic usage
const parser = new TemplateConfigParser()
const config = await parser.parseConfig('./template.yml')
const variables = await parser.resolveVariables(config, { name: 'Button' })

// With options
const parser = new TemplateConfigParser({
  allowRemoteIncludes: true,
  conflictResolution: 'prompt',
  customValidators: {
    'componentName': validateReactComponentName
  }
})
```

## Testing Strategy

### Unit Tests
- YAML parsing with various formats
- Variable type validation (all types)
- Custom validator execution
- Error handling and recovery
- Include resolution logic

### Integration Tests  
- End-to-end config parsing
- Variable prompting simulation
- Include fetching with mocked URLs
- Conflict resolution scenarios

### Test Data Structure
```
tests/
├── fixtures/
│   ├── configs/
│   │   ├── basic.yml
│   │   ├── with-includes.yml
│   │   ├── rich-variables.yml
│   │   └── invalid.yml
│   └── includes/
│       ├── github-template.yml
│       └── local-include.yml
├── unit/
│   ├── parser.test.ts
│   ├── variables.test.ts
│   └── validation.test.ts
└── integration/
    └── end-to-end.test.ts
```

## Performance Considerations

### Optimization Strategies
- **YAML Parsing**: Cache parsed configs to avoid re-parsing
- **Include Resolution**: Parallel fetching of remote includes
- **Variable Validation**: Lazy validation - only validate when needed
- **Schema Validation**: Compile JSON schemas once, reuse for validation

### Memory Management
- Streaming YAML parser for large configs
- LRU cache for frequently accessed includes
- Cleanup temporary data after resolution

### Benchmarking
- Parse time for various config sizes
- Memory usage during include resolution
- Validation time for complex variable definitions

## Security Considerations

### Remote Include Security
- URL whitelist/blacklist for allowed domains
- Content integrity verification (checksums)
- Timeout limits for remote fetching
- Sandboxing for custom validators

### Input Validation
- Sanitize all YAML input
- Prevent prototype pollution
- Limit recursion depth for includes
- Validate file paths for local includes

### Custom Validators
- Isolate custom validator execution
- Timeout limits for validator functions
- Error boundary protection
- Input sanitization for validator parameters

## Migration Path

### From Current Frontmatter System
1. **Detection**: Check for `template.yml` vs frontmatter
2. **Conversion**: Tool to convert existing frontmatter to `template.yml`
3. **Compatibility**: Support both systems during transition
4. **Migration**: Automated migration command

### Breaking Changes
- Variable definition syntax changes
- Hook definition format changes
- Include mechanism completely new

### Compatibility Layer
```typescript
// Support legacy frontmatter temporarily
class LegacyFrontmatterAdapter {
  convertToTemplateConfig(frontmatter: any): TemplateConfig {
    // Convert old format to new template.yml structure
  }
}
```

## Examples

### Basic Template Configuration
```yaml
# template.yml
title: "React Component"
description: "Creates a React component with tests"

variables:
  name:
    type: string
    required: true
    prompt: "Component name?"
    validation:
      pattern: "^[A-Z][a-zA-Z0-9]*$"
      message: "Must be PascalCase"
  
  typescript:
    type: boolean
    default: true
    prompt: "Use TypeScript?"
  
  styling:
    type: enum
    values: [css-modules, styled-components, emotion]
    default: css-modules
    prompt: "Styling approach?"

files:
  - component.liquid
  - test.liquid
  - index.liquid
```

### Template with Includes
```yaml
# template.yml
title: "Full Stack Component"
description: "React component with backend API"

includes:
  - url: "github:react-team/base-component@v1.0.0"
    variables:
      name: "{{ name }}"
      typescript: "{{ typescript }}"
  
  - url: "./shared/api-endpoint"
    variables:
      endpoint: "/api/{{ name | kebabCase }}"
    condition: "{{ includeApi }}"

variables:
  name:
    type: string
    required: true
  
  includeApi:
    type: boolean
    default: false
    prompt: "Include API endpoint?"
  
  # Computed variable
  apiPath:
    type: string
    internal: true
    default: "/api/{{ name | kebabCase }}"
```

This implementation provides the foundation for the V8 architecture's template configuration system, enabling rich variable definitions and template composition through includes.