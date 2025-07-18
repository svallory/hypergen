# Hypergen

[![npm version](https://badge.fury.io/js/hypergen.svg)](https://badge.fury.io/js/hypergen)
[![Build Status](https://github.com/svallory/hypergen/workflows/CI/badge.svg)](https://github.com/svallory/hypergen/actions)
[![Coverage Status](https://coveralls.io/repos/github/svallory/hypergen/badge.svg?branch=main)](https://coveralls.io/github/svallory/hypergen?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The modern, production-ready code generator built with TypeScript and powered by decorators.**

Hypergen is a scalable, flexible code generator that helps you create consistent, high-quality code across your projects. Whether you're building React components, API endpoints, or entire application structures, Hypergen provides the tools you need to automate repetitive coding tasks and maintain consistency across your team.

## ✨ Features

- **🎯 TypeScript-First** - Built with TypeScript for type safety and excellent developer experience
- **🎨 Decorator-Based Actions** - Clean, declarative action definitions using modern decorators
- **📝 YAML Configuration** - Intuitive `template.yml` files for generator configuration
- **🔧 Comprehensive CLI** - Rich command-line interface with helpful commands and error messages
- **🚀 Multiple Sources** - Load generators from local files, npm packages, GitHub repos, and more
- **✅ Template Validation** - Comprehensive validation with detailed error reporting
- **📚 Rich Documentation** - Extensive documentation with examples and best practices
- **🔍 Smart Discovery** - Automatic discovery of generators from multiple sources
- **💾 Intelligent Caching** - Performance optimization through smart caching
- **🧪 Testing Support** - Built-in testing utilities for generator development

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g hypergen

# Or use with npx
npx hypergen --help
```

### Initialize a Workspace

```bash
# Create a workspace with example generators
hypergen init workspace --withExamples=true

# Discover available generators
hypergen discover

# List available actions
hypergen list
```

### Generate Your First Component

```bash
# Get information about an action
hypergen info create-react-component

# Generate a React component
hypergen action create-react-component \
  --name=Button \
  --type=tsx \
  --withTests=true \
  --withStories=true
```

### Create Your Own Generator

```bash
# Create a new generator
hypergen init generator --name=my-widget --framework=react

# Validate the template
hypergen template validate _templates/my-widget/template.yml

# Test your generator
hypergen action my-widget --name=TestWidget
```

## 📖 Documentation

- **[📚 Complete Documentation](./docs/README.md)** - Comprehensive guides and references
- **[🚀 Getting Started](./docs/getting-started.md)** - Installation and first steps
- **[🎯 CLI Reference](./docs/cli-reference.md)** - All CLI commands and options
- **[📝 Template Syntax](./docs/template-syntax.md)** - EJS template syntax and helpers
- **[⚙️ Template.yml Reference](./docs/template-yml-reference.md)** - Configuration file reference
- **[💡 Examples](./docs/examples.md)** - Real-world examples and patterns

## 🎯 Core Concepts

### Actions

Actions are executable commands defined with TypeScript decorators:

```typescript
@action({
  name: 'create-component',
  description: 'Create a React component with tests and stories',
  category: 'react'
})
async function createComponent(context: ActionContext): Promise<ActionResult> {
  // Generate files, run commands, etc.
  return { success: true, message: 'Component created successfully' };
}
```

### Templates

EJS-based templates with YAML frontmatter:

```ejs
---
to: src/components/<%= name %>.tsx
---
import React from 'react';

interface <%= name %>Props {
  children?: React.ReactNode;
}

export const <%= name %>: React.FC<<%= name %>Props> = ({ children }) => {
  return <div className="<%= h.kebabCase(name) %>">{children}</div>;
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
  
  withTests:
    type: boolean
    default: true
    description: Generate test files

examples:
  - title: Basic Component
    description: Create a simple React component
    variables:
      name: Button
      withTests: true
```

## 🛠️ Advanced Features

### Generator Discovery

```bash
# Discover from all sources
hypergen discover

# Discover from specific sources
hypergen discover local npm github:user/repo

# Show system status
hypergen system status
```

### Template Validation

```bash
# Validate specific template
hypergen template validate _templates/my-generator/template.yml

# Show template information
hypergen template info _templates/my-generator/template.yml

# List all templates
hypergen template list _templates
```

### URL Templates

```bash
# Resolve GitHub template
hypergen url resolve github:facebook/react/packages/react-scripts

# Resolve npm package
hypergen url resolve npm:@company/generators

# Manage cache
hypergen url cache clear
hypergen url cache info
```

## 🏗️ Project Structure

```
hypergen/
├── src/
│   ├── actions/           # Action system and execution
│   ├── cli/              # CLI interface and commands
│   ├── config/           # Configuration and parsing
│   ├── discovery/        # Generator discovery
│   ├── errors/           # Error handling system
│   └── templates/        # Template processing
├── docs/                 # Documentation
├── examples/             # Example generators
│   └── _templates/       # Sample generators
├── tests/               # Test suite
└── package.json
```

## 🧪 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/svallory/hypergen.git
cd hypergen

# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Build the project
bun run build
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/error-handling.test.ts

# Run tests with coverage
bun test --coverage

# Run integration tests
bun test tests/metaverse.spec.ts
```

### Development Commands

```bash
# Start development server
bun run dev

# Run hypergen locally
bun run hygen

# Run built version
bun run hygen:build

# Type checking
bun run tsc

# Linting
bun run lint
```

## 🌟 Examples

### React Component Generator

```bash
# Initialize generator
hypergen init generator --name=react-component --framework=react

# Generate component
hypergen action react-component \
  --name=SearchInput \
  --withTests=true \
  --withStories=true \
  --typescript=true
```

### API Endpoint Generator

```bash
# Initialize generator
hypergen init generator --name=api-endpoint --framework=node

# Generate endpoint
hypergen action api-endpoint \
  --name=users \
  --methods=GET,POST,PUT,DELETE \
  --withAuth=true \
  --database=postgresql
```

### Full-Stack Feature Generator

```bash
# Initialize generator
hypergen init generator --name=feature --framework=generic

# Generate complete feature
hypergen action feature \
  --name=UserProfile \
  --withFrontend=true \
  --withBackend=true \
  --withDatabase=true \
  --withTests=true
```

## 📊 Performance

Hypergen is designed for performance with:

- **Lazy Loading** - Dependencies loaded only when needed
- **Intelligent Caching** - Template and generator caching
- **Parallel Processing** - Concurrent file operations
- **Efficient Discovery** - Fast generator discovery algorithms

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style

- TypeScript with strict type checking
- ESLint for code quality
- Prettier for formatting
- Conventional commits for commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- Powered by [EJS](https://ejs.co/) templating
- Inspired by [Hygen](https://www.hygen.io/)
- Testing with [Vitest](https://vitest.dev/)

## 📞 Support

- **Documentation**: [Complete Documentation](./docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/svallory/hypergen/issues)
- **Discussions**: [GitHub Discussions](https://github.com/svallory/hypergen/discussions)
- **Website**: [https://hypergen.dev](https://hypergen.dev)

---

**Happy generating! 🚀**