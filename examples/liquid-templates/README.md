# LiquidJS Template Examples

This directory contains example templates using LiquidJS syntax to demonstrate the capabilities of Hypergen's new template engine.

## Template Features

### LiquidJS Syntax
- `{{ variable }}` - Output variables
- `{% if condition %}...{% endif %}` - Conditional logic
- `{% for item in array %}...{% endfor %}` - Loops
- `{{ variable | filter }}` - Apply filters

### Built-in Filters
- `{{ name | capitalize }}` - Capitalize first letter
- `{{ name | camelCase }}` - Convert to camelCase
- `{{ name | pascalCase }}` - Convert to PascalCase
- `{{ name | kebabCase }}` - Convert to kebab-case
- `{{ name | snakeCase }}` - Convert to snake_case
- `{{ name | constantCase }}` - Convert to CONSTANT_CASE
- `{{ name | humanize }}` - Convert to human readable format
- `{{ name | pluralize }}` - Convert to plural form
- `{{ name | singularize }}` - Convert to singular form

## Usage Examples

### Generate a React Component
```bash
hypergen component new --name MyButton
```

### Generate an API Route
```bash
hypergen api new --name user-profile
```

## Template Structure

### Frontmatter
Each template starts with YAML frontmatter that defines:
- `to`: The output file path (supports LiquidJS templating)
- `inject`: Whether to inject into existing file
- `skip_if`: Condition to skip generation

### Template Body
The template body uses LiquidJS syntax with access to:
- All command-line arguments
- Built-in filters for text transformation
- Context helpers for file operations

## Comparison with EJS

| Feature | EJS | LiquidJS |
|---------|-----|----------|
| Safety | Uses eval() | No eval() - AST based |
| Performance | Good | 4x faster streaming |
| Syntax | JavaScript-like | Shopify Liquid |
| Filters | Via helpers | Built-in + custom |
| Logic | Full JavaScript | Limited but safe |
| Errors | Can be cryptic | Clear error messages |

## Migration from EJS

### Variable Output
```javascript
// EJS
<%= name %>

// LiquidJS
{{ name }}
```

### Conditionals
```javascript
// EJS
<% if (condition) { %>content<% } %>

// LiquidJS
{% if condition %}content{% endif %}
```

### Loops
```javascript
// EJS
<% items.forEach(item => { %>
  <%= item.name %>
<% }) %>

// LiquidJS
{% for item in items %}
  {{ item.name }}
{% endfor %}
```

### Filters/Helpers
```javascript
// EJS
<%= h.capitalize(name) %>

// LiquidJS
{{ name | capitalize }}
```

## Best Practices

1. **Use filters for text transformation** - LiquidJS filters are more readable than helper functions
2. **Leverage template inheritance** - Use includes and layouts for shared template parts
3. **Keep logic simple** - Use LiquidJS for presentation logic, not business logic
4. **Test templates thoroughly** - Use the built-in test suite to validate templates
5. **Document custom filters** - If you create custom filters, document them clearly