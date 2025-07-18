# Getting Started with Hypergen

Hypergen is a modern, production-ready code generator that helps you create consistent, scalable code across your projects. This guide will walk you through installation, basic usage, and your first generator.

## Installation

```bash
# Install globally
npm install -g hypergen

# Or use with npx
npx hypergen --help
```

## Quick Start

### 1. Initialize a Workspace

Create a new workspace with example generators:

```bash
hypergen init workspace --withExamples=true
```

This creates a `_templates` directory with example generators that demonstrate different patterns and use cases.

### 2. Discover Available Generators

```bash
hypergen discover
```

This will find all available generators in your project and show you what actions are available.

### 3. List Available Actions

```bash
hypergen list
```

View all available actions, or filter by category:

```bash
hypergen list component
```

### 4. Get Action Information

```bash
hypergen info create-react-component
```

This shows detailed information about an action, including parameters, examples, and usage instructions.

### 5. Execute an Action

```bash
hypergen action create-react-component --name=Button --type=tsx --withTests=true
```

This will generate a React component with the specified parameters.

## Core Concepts

### Actions

Actions are the executable commands that generate code. They're defined using TypeScript decorators and can perform various operations like creating files, modifying existing files, or running shell commands.

### Templates

Templates are EJS files that define the structure and content of generated code. They support:
- Variable substitution
- Conditional logic
- Loops and iterations
- Helper functions

### Generators

Generators are collections of actions and templates organized in directories. Each generator can contain:
- `actions.ts` - Action definitions with TypeScript decorators
- `template.yml` - Configuration and variable definitions
- Template files (`.ejs.t` extension)
- Tests and documentation

## Your First Generator

Let's create a simple utility function generator:

### 1. Create the Generator

```bash
hypergen init generator --name=util-function --framework=node --withExamples=true
```

### 2. Examine the Structure

```
_templates/util-function/
├── actions.ts          # Action definitions
├── template.yml        # Configuration
├── templates/
│   ├── function.js.ejs.t    # Function template
│   └── test.js.ejs.t        # Test template
├── examples/
│   └── basic-example.md     # Usage examples
└── README.md               # Documentation
```

### 3. Customize the Generator

Edit `template.yml` to define your variables:

```yaml
name: util-function
description: Generate utility functions with tests
version: 1.0.0
author: Your Name
category: utilities

variables:
  name:
    type: string
    required: true
    description: Name of the utility function
    pattern: ^[a-zA-Z][a-zA-Z0-9]*$
  
  description:
    type: string
    required: false
    default: A utility function
    description: Description of what the function does
  
  async:
    type: boolean
    required: false
    default: false
    description: Whether the function should be async

examples:
  - title: Basic utility function
    description: Create a simple synchronous utility function
    variables:
      name: formatName
      description: Formats a name string
      async: false
  
  - title: Async utility function
    description: Create an async utility function
    variables:
      name: fetchUserData
      description: Fetches user data from API
      async: true
```

### 4. Create the Templates

Edit `templates/function.js.ejs.t`:

```ejs
---
to: src/utils/<%= name %>.js
---
<%_ if (async) { _%>
/**
 * <%= description %>
 * @param {*} params - Function parameters
 * @returns {Promise<*>} The result
 */
async function <%= name %>(params) {
  // TODO: Implement async function
  return null;
}
<%_ } else { _%>
/**
 * <%= description %>
 * @param {*} params - Function parameters
 * @returns {*} The result
 */
function <%= name %>(params) {
  // TODO: Implement function
  return null;
}
<%_ } _%>

module.exports = <%= name %>;
```

Edit `templates/test.js.ejs.t`:

```ejs
---
to: src/utils/__tests__/<%= name %>.test.js
---
const <%= name %> = require('../<%= name %>');

describe('<%= name %>', () => {
  it('should work correctly', <%_ if (async) { _%>async <%_ } _%>() => {
    // TODO: Add test cases
    expect(<%= name %>).toBeDefined();
  });
});
```

### 5. Test Your Generator

Validate the template configuration:

```bash
hypergen template validate _templates/util-function/template.yml
```

See the template information:

```bash
hypergen template info _templates/util-function/template.yml
```

Run the generator:

```bash
hypergen action util-function --name=calculateTotal --description="Calculates the total price" --async=false
```

## Advanced Features

### Template Validation

Hypergen includes comprehensive template validation:

```bash
# Validate a specific template
hypergen template validate _templates/my-generator/template.yml

# List all templates in a directory
hypergen template list _templates

# Show template examples
hypergen template examples _templates/my-generator/template.yml
```

### URL Templates

You can use generators from remote sources:

```bash
# From GitHub
hypergen url resolve github:username/repo/templates

# From npm package
hypergen url resolve npm:@company/generators
```

### Generator Discovery

Hypergen can discover generators from multiple sources:

```bash
# Discover all generators
hypergen discover

# Discover from specific sources
hypergen discover local npm workspace
```

### System Information

Get system status and information:

```bash
# Show system status
hypergen system status

# Show version information
hypergen system version

# Get help
hypergen system help
```

## Best Practices

### 1. Use Descriptive Names

Choose clear, descriptive names for your generators and actions:

```yaml
# Good
name: create-api-endpoint
description: Generate REST API endpoint with validation and tests

# Avoid
name: api
description: Make API stuff
```

### 2. Provide Good Examples

Include comprehensive examples in your `template.yml`:

```yaml
examples:
  - title: User API endpoint
    description: Create a user management endpoint
    variables:
      name: user
      methods: [GET, POST, PUT, DELETE]
      withAuth: true
      withValidation: true
```

### 3. Use Proper Validation

Define proper validation rules for your variables:

```yaml
variables:
  name:
    type: string
    required: true
    pattern: ^[a-zA-Z][a-zA-Z0-9-]*$
    description: Component name in kebab-case
  
  size:
    type: enum
    required: false
    values: [small, medium, large]
    default: medium
    description: Component size variant
```

### 4. Structure Your Templates

Organize templates logically:

```
_templates/my-generator/
├── actions.ts
├── template.yml
├── templates/
│   ├── component/
│   │   ├── component.tsx.ejs.t
│   │   └── component.module.css.ejs.t
│   ├── stories/
│   │   └── component.stories.tsx.ejs.t
│   └── tests/
│       └── component.test.tsx.ejs.t
```

### 5. Document Your Generators

Include comprehensive documentation:

```markdown
# My Generator

This generator creates...

## Usage

```bash
hypergen action my-generator --name=example --type=advanced
```

## Parameters

- `name` (required): The name of the component
- `type` (optional): The component type (basic|advanced)

## Examples

See the examples directory for complete usage examples.
```

## Troubleshooting

### Common Issues

1. **Action not found**: Run `hypergen discover` to refresh the generator cache
2. **Template validation errors**: Use `hypergen template validate` to check syntax
3. **Parameter errors**: Use `hypergen info <action>` to see parameter requirements
4. **Permission errors**: Ensure you have write permissions to the target directory

### Getting Help

- Use `hypergen system help` for command reference
- Use `hypergen info <action>` for specific action help
- Check the error messages for actionable suggestions
- Visit the documentation at https://hypergen.dev/docs

## Next Steps

- Explore the example generators in your workspace
- Create your own generators for common patterns
- Set up generator sharing across your team
- Integrate with your CI/CD pipeline
- Explore advanced features like plugin systems

Happy generating! 🚀