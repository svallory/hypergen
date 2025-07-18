# Hypergen V8 Examples

This directory contains practical examples demonstrating V8 architecture features and usage patterns.

## Example Categories

### Basic V8 Usage
- [ ] **Basic Template.md** - Simple template with `template.yml` configuration
- [ ] **Variable Types.md** - Examples of all variable types (string, enum, boolean, etc.)
- [ ] **Template Files.md** - Multiple template files with different extensions

### Template Composition  
- [ ] **Simple Composition.md** - Basic template inclusion with URL references
- [ ] **Variable Mapping.md** - Passing variables between composed templates
- [ ] **GitHub Templates.md** - Using templates from GitHub repositories
- [ ] **Gist Templates.md** - Including templates from GitHub Gists

### Action Development
- [ ] **Basic Actions.md** - Simple actions with `@action` decorators
- [ ] **Action Parameters.md** - Actions with various parameter types
- [ ] **File Operations.md** - Actions that manipulate files and directories
- [ ] **External Tools.md** - Actions that integrate with external tools

### Generator Packages
- [ ] **Local Generator.md** - Creating a local generator package
- [ ] **Distributed Generator.md** - Publishing and consuming generator packages
- [ ] **Generator Composition.md** - Generators that extend other generators

### Advanced Patterns
- [ ] **Conditional Inclusion.md** - Templates that include others based on variables
- [ ] **Multi-Language.md** - Templates for different programming languages
- [ ] **Monorepo Templates.md** - Templates for monorepo structures
- [ ] **Full-Stack Apps.md** - Complex multi-template applications

### Migration Examples
- [ ] **From Yeoman.md** - Converting Yeoman generators to V8
- [ ] **From Hygen.md** - Migrating existing Hygen templates
- [ ] **From EJS to Liquid.md** - Template syntax conversion examples

## Example Structure

Each example should follow this format:

```markdown
# Example Name

## Overview
What this example demonstrates and when to use it.

## File Structure
```
example-project/
├── template.yml
├── component.liquid
└── test.liquid
```

## Configuration
```yaml
# template.yml content
```

## Template Files
```liquid
<!-- template file content -->
```

## Usage
```bash
# How to run this example
hypergen run ./example-project --name MyComponent
```

## Expected Output
```
# What files are generated and their content
```

## Variations
Different ways to use or modify this example.

## Related Examples
Links to related examples that build on this pattern.
```

## Example Guidelines

1. **Self-Contained**: Each example should work independently
2. **Well-Documented**: Clear explanations of what's happening
3. **Progressive Complexity**: Start simple, build up to advanced patterns
4. **Real-World Focused**: Examples should solve actual development problems
5. **Cross-Referenced**: Link related examples and concepts

## Learning Path

### Beginner Path
1. Basic Template → Variable Types → Template Files
2. Simple Composition → Variable Mapping
3. Basic Actions → Action Parameters

### Intermediate Path  
1. GitHub Templates → Gist Templates
2. Local Generator → File Operations
3. Conditional Inclusion → Multi-Language

### Advanced Path
1. Distributed Generator → Generator Composition
2. Full-Stack Apps → Monorepo Templates
3. Migration examples for ecosystem adoption

## Contributing Examples

When adding new examples:

1. **Follow the structure** defined above
2. **Test thoroughly** - ensure examples actually work
3. **Keep current** - update examples when V8 features change
4. **Cross-reference** - link to related examples and technical docs
5. **Real problems** - base examples on actual development scenarios

This examples collection will serve as both learning material and validation that our V8 architecture solves real-world code generation problems.