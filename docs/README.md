# Hypergen Documentation

Welcome to the comprehensive documentation for Hypergen, the modern, production-ready code generator built with TypeScript and powered by decorators.

## Quick Links

- [🚀 Getting Started](./getting-started.md) - Installation and first steps
- [📖 User Guide](./user-guide.md) - Complete usage documentation
- [🛠️ API Reference](./api-reference.md) - Technical API documentation
- [🎯 Examples](./examples.md) - Real-world examples and patterns
- [🔧 Advanced Usage](./advanced-usage.md) - Advanced features and customization
- [❓ FAQ](./faq.md) - Frequently asked questions

## Documentation Structure

### For Users

- **[Getting Started](./getting-started.md)** - New to Hypergen? Start here
- **[User Guide](./user-guide.md)** - Complete guide to using Hypergen
- **[CLI Reference](./cli-reference.md)** - All CLI commands and options
- **[Template Syntax](./template-syntax.md)** - EJS template syntax and helpers
- **[Configuration](./configuration.md)** - Configuration options and files

### For Generator Authors

- **[Creating Generators](./creating-generators.md)** - How to build custom generators
- **[Template.yml Reference](./template-yml-reference.md)** - Template configuration reference
- **[Action System](./action-system.md)** - TypeScript decorator-based actions
- **[Best Practices](./best-practices.md)** - Guidelines for quality generators
- **[Testing Generators](./testing-generators.md)** - How to test your generators

### For Developers

- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Architecture](./architecture.md)** - System architecture and design
- **[Plugin System](./plugin-system.md)** - Extending Hypergen with plugins
- **[Contributing](./contributing.md)** - How to contribute to Hypergen
- **[Development Setup](./development-setup.md)** - Setting up for development

## Key Features

### 🎯 Modern Architecture
- **TypeScript-first** - Built with TypeScript for type safety and great DX
- **Decorator-based Actions** - Clean, declarative action definitions
- **Template.yml Configuration** - YAML-based template configuration
- **Comprehensive Error Handling** - User-friendly error messages with actionable suggestions

### 🚀 Production Ready
- **Scalable Generator Discovery** - Efficient discovery from multiple sources
- **Template Validation** - Comprehensive validation with detailed error reporting
- **URL Template Support** - Load generators from GitHub, npm, and other sources
- **Caching System** - Intelligent caching for performance

### 🛠️ Developer Experience
- **Rich CLI** - Intuitive command-line interface with helpful commands
- **Interactive Scaffolding** - Easy generator creation with `hypergen init`
- **Comprehensive Documentation** - Detailed docs with examples
- **Testing Support** - Built-in testing utilities for generators

### 🔧 Flexible & Extensible
- **Multiple Template Engines** - Support for EJS and other template engines
- **Plugin System** - Extend functionality with custom plugins
- **Multi-framework Support** - Works with React, Vue, Node.js, and more
- **Custom Resolvers** - Add support for custom template sources

## Getting Started

### Installation

```bash
# Install globally
npm install -g hypergen

# Or use with npx
npx hypergen --help
```

### Quick Start

```bash
# Initialize a workspace with examples
hypergen init workspace --withExamples=true

# Discover available generators
hypergen discover

# List available actions
hypergen list

# Get information about an action
hypergen info create-react-component

# Execute an action
hypergen action create-react-component --name=Button --type=tsx
```

### Your First Generator

```bash
# Create a new generator
hypergen init generator --name=my-generator --framework=react

# Validate the template
hypergen template validate _templates/my-generator/template.yml

# Test the generator
hypergen action my-generator --name=example
```

## Core Concepts

### Actions
Executable commands that generate code using TypeScript decorators:

```typescript
@action({
  name: 'create-component',
  description: 'Create a React component with tests',
  category: 'react'
})
async function createComponent(context: ActionContext): Promise<ActionResult> {
  // Implementation
}
```

### Templates
EJS-based templates with frontmatter configuration:

```ejs
---
to: src/components/<%= name %>.tsx
---
import React from 'react';

interface <%= name %>Props {
  // Props here
}

export const <%= name %>: React.FC<<%= name %>Props> = (props) => {
  return <div>Hello from <%= name %>!</div>;
};
```

### Configuration
YAML-based template configuration:

```yaml
name: create-component
description: Create a React component with TypeScript
version: 1.0.0
category: react

variables:
  name:
    type: string
    required: true
    description: Component name
    pattern: ^[A-Z][a-zA-Z0-9]*$
```

## Community & Support

- **GitHub**: [https://github.com/svallory/hypergen](https://github.com/svallory/hypergen)
- **Issues**: [Report bugs and request features](https://github.com/svallory/hypergen/issues)
- **Discussions**: [Community discussions](https://github.com/svallory/hypergen/discussions)
- **Documentation**: [https://hypergen.dev/docs](https://hypergen.dev/docs)

## Contributing

We welcome contributions! See our [Contributing Guide](./contributing.md) for details on:

- Setting up the development environment
- Running tests
- Submitting pull requests
- Coding standards

## License

Hypergen is open source software licensed under the [MIT License](../LICENSE).

---

## What's Next?

- **New to Hypergen?** Start with the [Getting Started Guide](./getting-started.md)
- **Ready to build generators?** Check out [Creating Generators](./creating-generators.md)
- **Want to contribute?** See the [Contributing Guide](./contributing.md)
- **Need help?** Visit our [FAQ](./faq.md) or [open an issue](https://github.com/svallory/hypergen/issues)

Happy generating! 🚀