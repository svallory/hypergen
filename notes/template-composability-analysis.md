# Template Composability Analysis & Design

## Problem Analysis

### Current State of Template Composability

Based on analysis of the moon-templates repository and GitHub issue #1385, the core challenges with template composability are:

#### 1. **Yeoman's Fundamental Limitations**
- **Monolithic generators**: Large, do-everything generators that are hard to decompose
- **No inheritance mechanism**: Cannot extend or compose existing generators
- **Complex creation process**: Multiple steps discourage atomic generator creation
- **Implementation opacity**: Deep understanding required to compose generators

#### 2. **Moon's Partial Success**
- **Achieved**: Hierarchical extension, conditional inclusion, macro system
- **Failed**: Macro duplication, path resolution complexity, maintenance overhead
- **Limitations**: Template engine constraints, missing dependency resolution

#### 3. **Root Cause Analysis**
The fundamental issue is that current systems treat templates as **monolithic units** rather than **composable components**. This leads to:
- **Code duplication** across similar templates
- **Maintenance burden** when updating common patterns
- **Barrier to entry** for creating small, focused generators
- **Inflexibility** in combining generators for complex workflows

## Composability Design for Hypergen

### 1. **Atomic Generator Architecture**

#### Generator Types
```typescript
interface GeneratorManifest {
  id: string
  name: string
  description: string
  type: 'atomic' | 'composite' | 'meta'
  
  // Dependency management
  depends: string[]           // Required generators
  before?: string[]          // Execute before these generators
  after?: string[]           // Execute after these generators
  
  // Variable interface
  exports: VariableExport[]   // Variables this generator provides
  imports: VariableImport[]   // Variables this generator requires
  
  // Composition metadata
  composable: boolean
  category: string
  tags: string[]
}
```

#### Atomic Generator Examples
```yaml
# generators/package-json/template.yml
id: package-json
name: Package.json Generator
type: atomic
composable: true
category: infrastructure

exports:
  - name: packageJson
    type: object
    description: Package.json configuration object
  - name: dependencies
    type: array
    description: List of dependencies to install

variables:
  name:
    type: string
    required: true
    prompt: Package name?
  version:
    type: string
    default: "1.0.0"
  description:
    type: string
    prompt: Package description?
```

### 2. **Generator Composition System**

#### Composite Generator Definition
```yaml
# generators/react-app/template.yml
id: react-app
name: React Application
type: composite
category: application

# Declare composition
composition:
  generators:
    - id: package-json
      config:
        name: "{{ name }}"
        description: "{{ description }}"
        type: "application"
    
    - id: typescript
      condition: "{{ language === 'typescript' }}"
      config:
        strict: true
    
    - id: eslint
      after: [typescript]
      config:
        extends: ["@typescript-eslint/recommended"]
    
    - id: react-components
      depends: [package-json]
      config:
        componentStyle: "{{ componentStyle }}"

# Bubble up parameters
variables:
  name:
    type: string
    required: true
    prompt: Application name?
  
  language:
    type: enum
    values: [javascript, typescript]
    default: typescript
    prompt: Programming language?
  
  componentStyle:
    type: enum
    values: [functional, class]
    default: functional
    prompt: Component style?
```

### 3. **Variable Sharing and Conflict Resolution**

#### Variable Propagation System
```typescript
interface VariableContext {
  // User-provided variables
  user: Record<string, any>
  
  // Generator-exported variables
  exports: Record<string, Record<string, any>>
  
  // Computed variables
  computed: Record<string, any>
  
  // Conflict resolution
  conflicts: ConflictResolution[]
}

interface ConflictResolution {
  variable: string
  generators: string[]
  resolution: 'merge' | 'override' | 'rename' | 'prompt'
  strategy?: MergeStrategy
}
```

#### Example Variable Flow
```yaml
# generators/package-json exports
exports:
  packageJson.dependencies: []
  packageJson.devDependencies: []
  packageJson.scripts: {}

# generators/react-components imports and modifies
imports:
  - packageJson.dependencies
  - packageJson.devDependencies

# This generator adds to the shared variables
effects:
  - type: append
    target: packageJson.dependencies
    value: ["react", "react-dom"]
  
  - type: append
    target: packageJson.devDependencies
    value: ["@types/react", "@types/react-dom"]
```

### 4. **Generator Registry and Discovery**

#### Registry System
```typescript
interface GeneratorRegistry {
  // Local generators
  local: Map<string, GeneratorManifest>
  
  // Remote generators (GitHub, npm, etc.)
  remote: Map<string, RemoteGeneratorRef>
  
  // Cached generators
  cache: Map<string, GeneratorManifest>
  
  // Resolution methods
  resolve(id: string): Promise<GeneratorManifest>
  discover(pattern: string): Promise<GeneratorManifest[]>
  install(ref: string): Promise<GeneratorManifest>
}

interface RemoteGeneratorRef {
  id: string
  source: 'github' | 'npm' | 'url'
  ref: string
  version?: string
}
```

#### Discovery Examples
```bash
# Reference without installation
hypergen github:svallory/hypergen-react-components

# Install and reference
hypergen install github:svallory/hypergen-react-components
hypergen react-components --name MyComponent

# Compose on-the-fly
hypergen compose \
  --generator package-json \
  --generator typescript \
  --generator react-components \
  --name MyReactApp
```

### 5. **Execution Engine**

#### Dependency Resolution
```typescript
class CompositionEngine {
  async resolve(compositeId: string): Promise<ExecutionPlan> {
    const generators = await this.loadComposition(compositeId)
    const plan = new ExecutionPlan()
    
    // Resolve dependencies
    const resolved = await this.resolveDependencies(generators)
    
    // Check for conflicts
    const conflicts = this.detectConflicts(resolved)
    
    // Create execution order
    const ordered = this.topologicalSort(resolved)
    
    // Build variable context
    const context = this.buildVariableContext(ordered)
    
    return plan
  }
  
  private async resolveDependencies(generators: GeneratorRef[]): Promise<GeneratorManifest[]> {
    // Recursive dependency resolution with cycle detection
  }
  
  private detectConflicts(generators: GeneratorManifest[]): ConflictResolution[] {
    // Detect variable conflicts and suggest resolutions
  }
  
  private topologicalSort(generators: GeneratorManifest[]): GeneratorManifest[] {
    // Order generators based on dependencies and before/after constraints
  }
}
```

### 6. **Use Case Implementation**

#### Use Case 1: Package.json Variable Sharing
```yaml
# generators/package-json/template.yml
exports:
  - name: packageJson
    type: object
    initial: 
      name: "{{ name }}"
      version: "1.0.0"
      dependencies: {}
      devDependencies: {}

# generators/react/template.yml
imports:
  - packageJson
  
effects:
  - type: merge
    target: packageJson.dependencies
    value:
      react: "^18.0.0"
      react-dom: "^18.0.0"

# generators/typescript/template.yml
imports:
  - packageJson
  
effects:
  - type: merge
    target: packageJson.devDependencies
    value:
      typescript: "^5.0.0"
      "@types/react": "^18.0.0"
```

#### Use Case 2: Conditional Execution
```yaml
# generators/mega-app/template.yml
composition:
  generators:
    - id: package-json
      config:
        name: "{{ name }}"
    
    - id: typescript
      condition: "{{ language === 'typescript' }}"
    
    - id: javascript-config
      condition: "{{ language === 'javascript' }}"
    
    - id: react-components
      depends: [package-json]
      condition: "{{ framework === 'react' }}"
    
    - id: vue-components
      depends: [package-json]
      condition: "{{ framework === 'vue' }}"

variables:
  language:
    type: enum
    values: [javascript, typescript]
    default: typescript
    prompt: Programming language?
  
  framework:
    type: enum
    values: [react, vue, angular]
    default: react
    prompt: Frontend framework?
```

### 7. **Implementation Strategy**

#### Phase 1: Core Composition Engine
1. **Generator Manifest System** - Define composable generator format
2. **Variable Context System** - Implement shared variable system
3. **Dependency Resolution** - Build topological sorting and conflict detection
4. **Execution Engine** - Create composition execution system

#### Phase 2: Registry and Discovery
1. **Local Generator Registry** - Scan and index local generators
2. **Remote Generator Support** - GitHub, npm, URL references
3. **Generator Installation** - Cache and version management
4. **Discovery Commands** - Search and browse generators

#### Phase 3: Advanced Features
1. **Conflict Resolution UI** - Interactive conflict resolution
2. **Generator Testing** - Composition validation and testing
3. **Performance Optimization** - Lazy loading and caching
4. **Documentation Generation** - Auto-generated composition docs

### 8. **Benefits Over Yeoman**

#### For Generator Authors
- **Atomic development**: Create small, focused generators
- **Reusability**: Compose generators without duplication
- **Maintainability**: Update shared generators automatically
- **Testability**: Test generators in isolation

#### For Generator Users
- **Flexibility**: Mix and match generators as needed
- **Consistency**: Shared patterns across generator ecosystem
- **Discoverability**: Find and combine generators easily
- **Customization**: Override and extend existing generators

#### For Ecosystem
- **Modularity**: Encourage small, focused generators
- **Collaboration**: Share and reuse community generators
- **Innovation**: Rapid experimentation with new combinations
- **Standards**: Consistent patterns across the ecosystem

This composability system would fundamentally transform how developers create and use code generators, making Hypergen the definitive solution for template-based code generation.