# Template Syntax Reference

Complete reference for Hypergen template syntax, including EJS templates and frontmatter configuration.

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Frontmatter](#frontmatter)
- [EJS Syntax](#ejs-syntax)
- [Template Variables](#template-variables)
- [Helper Functions](#helper-functions)
- [Conditional Logic](#conditional-logic)
- [Loops and Iteration](#loops-and-iteration)
- [File Operations](#file-operations)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Overview

Hypergen uses EJS (Embedded JavaScript) for template rendering with YAML frontmatter for configuration. Templates have a `.ejs.t` extension and combine:

- **Frontmatter**: YAML configuration at the top
- **Template Body**: EJS template content

## File Structure

Templates are organized in generator directories:

```
_templates/
├── my-generator/
│   ├── actions.ts              # Action definitions
│   ├── template.yml            # Configuration
│   └── templates/
│       ├── component.tsx.ejs.t # Component template
│       ├── test.tsx.ejs.t      # Test template
│       └── story.tsx.ejs.t     # Story template
```

## Frontmatter

Frontmatter is YAML configuration at the top of template files, enclosed in `---`:

```ejs
---
to: src/components/<%= name %>.tsx
inject: true
skip_if: <%= !withTests %>
---
Template content here...
```

### Frontmatter Properties

#### `to` (required)
Specifies the output file path:

```yaml
# Static path
to: src/components/Button.tsx

# Dynamic path with variables
to: src/components/<%= name %>.tsx

# Complex path logic
to: <%= category === 'component' ? 'src/components' : 'src/utils' %>/<%= name %>.tsx
```

#### `inject`
Controls file injection behavior:

```yaml
# Append to existing file
inject: true

# Prepend to existing file
inject: prepend

# Skip if file exists
inject: false
```

#### `skip_if`
Conditionally skip file generation:

```yaml
# Skip if condition is true
skip_if: <%= !withTests %>

# Skip based on multiple conditions
skip_if: <%= type === 'simple' && !advanced %>
```

#### `force`
Force overwrite existing files:

```yaml
# Always overwrite
force: true

# Conditional overwrite
force: <%= force || environment === 'development' %>
```

#### `unless_exists`
Only create if file doesn't exist:

```yaml
unless_exists: true
```

## EJS Syntax

### Basic Output

```ejs
<%= variable %> <!-- Outputs escaped HTML -->
<%- variable %> <!-- Outputs raw HTML -->
<% variable %>  <!-- JavaScript code, no output -->
```

### Variables

Access template variables:

```ejs
<!-- Basic variable -->
<%= name %>

<!-- Object property -->
<%= config.apiVersion %>

<!-- Array element -->
<%= methods[0] %>

<!-- Default values -->
<%= description || 'No description' %>
```

### Comments

```ejs
<%# This is a comment %>
<%# 
Multi-line comment
%>
```

### Whitespace Control

```ejs
<%_ code _%>  <!-- Trim whitespace before and after -->
<%- code -%>  <!-- Trim whitespace after -->
<% code -%>   <!-- Trim whitespace after -->
```

## Template Variables

Variables are passed from the template.yml configuration and action parameters.

### Common Variables

```ejs
<!-- From template.yml -->
<%= name %>        <!-- Component name -->
<%= description %> <!-- Component description -->
<%= author %>      <!-- Author name -->
<%= version %>     <!-- Template version -->

<!-- From action parameters -->
<%= withTests %>   <!-- Boolean flag -->
<%= framework %>   <!-- Framework choice -->
<%= methods %>     <!-- Array of methods -->
```

### Variable Types

#### Strings
```ejs
<%= name %>                    <!-- Basic string -->
<%= name.toUpperCase() %>      <!-- String method -->
<%= name.charAt(0) %>          <!-- String manipulation -->
```

#### Numbers
```ejs
<%= count %>                   <!-- Number output -->
<%= Math.max(count, 1) %>      <!-- Math operations -->
<%= count.toFixed(2) %>        <!-- Number formatting -->
```

#### Booleans
```ejs
<%= withTests %>               <!-- Boolean output -->
<%= withTests ? 'true' : 'false' %> <!-- Conditional -->
```

#### Arrays
```ejs
<%= methods.join(', ') %>      <!-- Array join -->
<%= methods.length %>          <!-- Array length -->
<%= methods[0] %>              <!-- Array access -->
```

#### Objects
```ejs
<%= config.apiVersion %>       <!-- Property access -->
<%= JSON.stringify(config) %>  <!-- JSON output -->
```

## Helper Functions

Hypergen provides built-in helper functions for common operations.

### String Helpers

```ejs
<!-- Case conversion -->
<%= h.camelCase(name) %>       <!-- myComponentName -->
<%= h.pascalCase(name) %>      <!-- MyComponentName -->
<%= h.snakeCase(name) %>       <!-- my_component_name -->
<%= h.kebabCase(name) %>       <!-- my-component-name -->
<%= h.constantCase(name) %>    <!-- MY_COMPONENT_NAME -->

<!-- Pluralization -->
<%= h.singular(name) %>        <!-- user -->
<%= h.plural(name) %>          <!-- users -->

<!-- Capitalization -->
<%= h.capitalize(name) %>      <!-- Name -->
<%= h.titleCase(name) %>       <!-- My Component Name -->
```

### Path Helpers

```ejs
<!-- Path manipulation -->
<%= h.dirname(filePath) %>     <!-- Directory name -->
<%= h.basename(filePath) %>    <!-- File name -->
<%= h.extname(filePath) %>     <!-- File extension -->
<%= h.join('src', 'components', name) %> <!-- Path joining -->
```

### Date Helpers

```ejs
<!-- Date formatting -->
<%= h.now() %>                 <!-- Current timestamp -->
<%= h.date() %>                <!-- Current date -->
<%= h.year() %>                <!-- Current year -->
<%= h.formatDate(date, 'YYYY-MM-DD') %> <!-- Custom format -->
```

### Custom Helpers

Define custom helpers in your generator:

```typescript
// In actions.ts
export const helpers = {
  generateId: () => Math.random().toString(36).substr(2, 9),
  formatApiPath: (path: string) => `/api/v1/${path}`,
  createImportPath: (from: string, to: string) => {
    // Custom import path logic
    return `../utils/${to}`;
  }
};
```

Use in templates:

```ejs
<%= h.generateId() %>
<%= h.formatApiPath('users') %>
<%= h.createImportPath(currentFile, 'helpers') %>
```

## Conditional Logic

### If Statements

```ejs
<% if (withTests) { %>
import { render } from '@testing-library/react';
<% } %>

<% if (framework === 'react') { %>
import React from 'react';
<% } else if (framework === 'vue') { %>
import Vue from 'vue';
<% } else { %>
// Generic framework
<% } %>
```

### Ternary Operators

```ejs
<%= withTests ? 'with tests' : 'without tests' %>
<%= async ? 'async ' : '' %>function <%= name %>() {
```

### Logical Operators

```ejs
<% if (withTests && framework === 'react') { %>
import { render, screen } from '@testing-library/react';
<% } %>

<% if (withStories || withDocs) { %>
import type { Meta, StoryObj } from '@storybook/react';
<% } %>
```

## Loops and Iteration

### Array Iteration

```ejs
<!-- For each method -->
<% methods.forEach(method => { %>
  <%= method %>: (req: Request, res: Response) => {
    // Handle <%= method %> request
  },
<% }) %>

<!-- For loop -->
<% for (let i = 0; i < methods.length; i++) { %>
  Method <%= i + 1 %>: <%= methods[i] %>
<% } %>

<!-- For...of loop -->
<% for (const method of methods) { %>
  case '<%= method %>':
    return handle<%= h.pascalCase(method) %>(req, res);
<% } %>
```

### Object Iteration

```ejs
<!-- For...in loop -->
<% for (const key in config) { %>
  <%= key %>: <%= config[key] %>,
<% } %>

<!-- Object.entries -->
<% Object.entries(config).forEach(([key, value]) => { %>
  <%= key %>: <%= typeof value === 'string' ? `"${value}"` : value %>,
<% }) %>
```

### Conditional Iteration

```ejs
<% if (methods && methods.length > 0) { %>
  <% methods.forEach(method => { %>
    <% if (method !== 'OPTIONS') { %>
      <%= method.toLowerCase() %>Router.use(<%= name %>Handler.<%= method.toLowerCase() %>);
    <% } %>
  <% }) %>
<% } %>
```

## File Operations

### Multiple Files

Generate multiple files from a single template:

```ejs
---
to: src/components/<%= name %>/<%= name %>.tsx
---
<% if (withTests) { %>
---
to: src/components/<%= name %>/<%= name %>.test.tsx
---
<% } %>
<% if (withStories) { %>
---
to: src/components/<%= name %>/<%= name %>.stories.tsx
---
<% } %>
```

### File Injection

Inject content into existing files:

```ejs
---
to: src/index.ts
inject: true
after: "// Component exports"
---
export { <%= name %> } from './components/<%= name %>';
```

### Skip Patterns

Skip file generation based on conditions:

```ejs
---
to: src/components/<%= name %>.test.tsx
skip_if: <%= !withTests %>
---
```

## Best Practices

### 1. Use Clear Variable Names

```ejs
<!-- Good -->
<%= componentName %>
<%= apiEndpoint %>
<%= hasValidation %>

<!-- Avoid -->
<%= n %>
<%= ep %>
<%= v %>
```

### 2. Handle Edge Cases

```ejs
<!-- Check for undefined/null -->
<%= name || 'DefaultName' %>

<!-- Validate arrays -->
<% if (methods && methods.length > 0) { %>
  <!-- Generate methods -->
<% } %>

<!-- Type checking -->
<% if (typeof config === 'object' && config !== null) { %>
  <!-- Use config -->
<% } %>
```

### 3. Use Whitespace Control

```ejs
<!-- Trim unnecessary whitespace -->
<%_ if (condition) { _%>
Content here
<%_ } _%>

<!-- Preserve formatting -->
<% if (condition) { %>
  Content with preserved indentation
<% } %>
```

### 4. Organize Complex Logic

```ejs
<!-- Extract complex logic -->
<%
const importStatements = [];
if (withRouter) importStatements.push("import { Router } from 'express';");
if (withAuth) importStatements.push("import { authenticate } from './auth';");
if (withValidation) importStatements.push("import { validate } from './validation';");
%>

<!-- Use the extracted logic -->
<% importStatements.forEach(statement => { %>
<%= statement %>
<% }) %>
```

### 5. Comment Your Templates

```ejs
<%# Component interface definition %>
interface <%= name %>Props {
  <%# Add props based on configuration %>
  <% if (withChildren) { %>
  children?: React.ReactNode;
  <% } %>
  <% if (withClassName) { %>
  className?: string;
  <% } %>
}
```

## Common Patterns

### Component Generation

```ejs
---
to: src/components/<%= name %>/<%= name %>.tsx
---
import React<%_ if (withTypes) { _%>, { FC }<%_ } _%> from 'react';
<%_ if (withStyles) { _%>
import styles from './<%= name %>.module.css';
<%_ } _%>

<%_ if (withTypes) { _%>
interface <%= name %>Props {
  <%_ if (withChildren) { _%>
  children?: React.ReactNode;
  <%_ } _%>
  <%_ if (withClassName) { _%>
  className?: string;
  <%_ } _%>
}

export const <%= name %>: FC<<%= name %>Props> = (<%_ if (withProps) { _%>props<%_ } _%>) => {
<%_ } else { _%>
export const <%= name %> = (<%_ if (withProps) { _%>props<%_ } _%>) => {
<%_ } _%>
  return (
    <div<%_ if (withStyles) { _%> className={styles.<%= h.camelCase(name) %>}<%_ } _%>>
      <%_ if (withChildren) { _%>
      {props.children}
      <%_ } else { _%>
      <h1><%= name %> Component</h1>
      <%_ } _%>
    </div>
  );
};
```

### API Route Generation

```ejs
---
to: src/routes/<%= h.kebabCase(name) %>.ts
---
import { Router, Request, Response } from 'express';
<%_ if (withAuth) { _%>
import { authenticate } from '../middleware/auth';
<%_ } _%>
<%_ if (withValidation) { _%>
import { validate } from '../middleware/validation';
import { <%= h.camelCase(name) %>Schema } from '../schemas/<%= h.kebabCase(name) %>';
<%_ } _%>

const router = Router();

<%_ methods.forEach(method => { _%>
router.<%= method.toLowerCase() %>('/<%= h.kebabCase(name) %>'<%_ if (withAuth) { _%>, authenticate<%_ } _%><%_ if (withValidation && (method === 'POST' || method === 'PUT')) { _%>, validate(<%= h.camelCase(name) %>Schema)<%_ } _%>, (req: Request, res: Response) => {
  // Handle <%= method %> request for <%= name %>
  res.json({ message: '<%= method %> <%= name %> endpoint' });
});

<%_ }) _%>
export default router;
```

### Test Generation

```ejs
---
to: src/components/<%= name %>/<%= name %>.test.tsx
skip_if: <%= !withTests %>
---
import { render<%_ if (withUserEvents) { _%>, screen<%_ } _%> } from '@testing-library/react';
<%_ if (withUserEvents) { _%>
import userEvent from '@testing-library/user-event';
<%_ } _%>
import { <%= name %> } from './<%= name %>';

describe('<%= name %>', () => {
  it('renders without crashing', () => {
    render(<<%= name %> />);
  });

  <%_ if (withUserEvents) { _%>
  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<<%= name %> />);
    
    // Add interaction tests here
  });
  <%_ } _%>

  <%_ if (withProps) { _%>
  it('renders with props', () => {
    const props = {
      // Add test props here
    };
    render(<<%= name %> {...props} />);
  });
  <%_ } _%>
});
```

### Configuration File Generation

```ejs
---
to: <%= configPath %>/<%= h.kebabCase(name) %>.config.js
---
<%_ if (format === 'module') { _%>
export default {
<%_ } else { _%>
module.exports = {
<%_ } _%>
  name: '<%= name %>',
  version: '<%= version %>',
  <%_ if (withDatabase) { _%>
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || '<%= h.snakeCase(name) %>',
  },
  <%_ } _%>
  <%_ if (withAuth) { _%>
  auth: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  <%_ } _%>
  <%_ if (withApi) { _%>
  api: {
    version: 'v1',
    prefix: '/api',
    port: process.env.PORT || 3000,
  },
  <%_ } _%>
};
```

For more examples and detailed usage, see the [Getting Started Guide](./getting-started.md) and [Examples](./examples.md) documentation.