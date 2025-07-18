# Template Composition Example

## Overview

This example demonstrates V8's powerful template composition system using URL-based includes. Templates can include other templates from GitHub repositories, local files, or other sources, creating a composable and reusable template ecosystem.

## File Structure

```
full-stack-component/
├── template.yml
├── component.liquid
└── story.liquid

shared-templates/
├── base-component/
│   ├── template.yml
│   ├── component.liquid
│   └── test.liquid
└── api-endpoint/
    ├── template.yml
    ├── controller.liquid
    └── route.liquid
```

## Base Template (Shared)

### `shared-templates/base-component/template.yml`
```yaml
title: "Base React Component"
description: "Basic React component with TypeScript and testing"

variables:
  name:
    type: string
    required: true
    prompt: "Component name?"
    pattern: "^[A-Z][a-zA-Z0-9]*$"
  
  typescript:
    type: boolean
    default: true
    prompt: "Use TypeScript?"
  
  includeTests:
    type: boolean
    default: true
    prompt: "Include test files?"

files:
  - component.liquid
  - test.liquid
```

### `shared-templates/base-component/component.liquid`
```liquid
---
to: src/components/{{ name }}/{{ name }}.{{ typescript ? 'tsx' : 'jsx' }}
---
{% if typescript %}import React from 'react'

interface {{ name }}Props {
  children?: React.ReactNode
  className?: string
}

const {{ name }}: React.FC<{{ name }}Props> = ({ children, className }) => {
{% else %}import React from 'react'

const {{ name }} = ({ children, className }) => {
{% endif %}
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export default {{ name }}
```

### `shared-templates/base-component/test.liquid`
```liquid
---
to: src/components/{{ name }}/{{ name }}.test.{{ typescript ? 'tsx' : 'jsx' }}
condition: "{{ includeTests }}"
---
import { render, screen } from '@testing-library/react'
import {{ name }} from './{{ name }}'

describe('{{ name }}', () => {
  test('renders children correctly', () => {
    render(<{{ name }}>Test Content</{{ name }}>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
```

## API Endpoint Template (Shared)

### `shared-templates/api-endpoint/template.yml`
```yaml
title: "API Endpoint"
description: "Express.js API endpoint with controller and route"

variables:
  endpoint:
    type: string
    required: true
    prompt: "API endpoint path (e.g., /api/users)?"
  
  method:
    type: enum
    values: [GET, POST, PUT, DELETE]
    default: GET
    prompt: "HTTP method?"
  
  # Internal computed variables
  controllerName:
    type: string
    internal: true
    default: "{{ endpoint | replace: '/api/', '' | pascalCase }}Controller"
  
  routeName:
    type: string
    internal: true
    default: "{{ endpoint | replace: '/api/', '' | kebabCase }}"

files:
  - controller.liquid
  - route.liquid
```

### `shared-templates/api-endpoint/controller.liquid`
```liquid
---
to: src/controllers/{{ controllerName }}.ts
---
import { Request, Response } from 'express'

export class {{ controllerName }} {
  {% if method == 'GET' %}async get(req: Request, res: Response): Promise<void> {
    // TODO: Implement GET logic
    res.json({ message: 'GET {{ endpoint }}' })
  }{% elsif method == 'POST' %}async create(req: Request, res: Response): Promise<void> {
    // TODO: Implement POST logic
    res.status(201).json({ message: 'Created at {{ endpoint }}' })
  }{% elsif method == 'PUT' %}async update(req: Request, res: Response): Promise<void> {
    // TODO: Implement PUT logic
    res.json({ message: 'Updated at {{ endpoint }}' })
  }{% elsif method == 'DELETE' %}async delete(req: Request, res: Response): Promise<void> {
    // TODO: Implement DELETE logic
    res.status(204).send()
  }{% endif %}
}
```

### `shared-templates/api-endpoint/route.liquid`
```liquid
---
to: src/routes/{{ routeName }}.ts
---
import { Router } from 'express'
import { {{ controllerName }} } from '../controllers/{{ controllerName }}'

const router = Router()
const controller = new {{ controllerName }}()

{% if method == 'GET' %}router.get('{{ endpoint }}', controller.get.bind(controller))
{% elsif method == 'POST' %}router.post('{{ endpoint }}', controller.create.bind(controller))
{% elsif method == 'PUT' %}router.put('{{ endpoint }}', controller.update.bind(controller))
{% elsif method == 'DELETE' %}router.delete('{{ endpoint }}', controller.delete.bind(controller))
{% endif %}

export default router
```

## Composed Template

### `full-stack-component/template.yml`
```yaml
title: "Full-Stack React Component"
description: "React component with backend API endpoint and Storybook story"

# Include other templates with variable mapping
includes:
  # Include base React component
  - url: "./shared-templates/base-component"
    variables:
      name: "{{ name }}"
      typescript: "{{ typescript }}"
      includeTests: "{{ includeTests }}"
  
  # Include API endpoint if requested
  - url: "./shared-templates/api-endpoint"
    condition: "{{ includeApi }}"
    variables:
      endpoint: "/api/{{ name | kebabCase }}"
      method: "{{ apiMethod }}"
  
  # Include from GitHub repository
  - url: "github:storybook-team/templates@v1.0.0/react-story"
    condition: "{{ includeStory }}"
    variables:
      componentName: "{{ name }}"
      typescript: "{{ typescript }}"

# Additional variables for this template
variables:
  name:
    type: string
    required: true
    prompt: "Component name?"
    pattern: "^[A-Z][a-zA-Z0-9]*$"
  
  typescript:
    type: boolean
    default: true
    prompt: "Use TypeScript?"
  
  includeTests:
    type: boolean
    default: true
    prompt: "Include test files?"
  
  includeApi:
    type: boolean
    default: false
    prompt: "Include backend API endpoint?"
  
  apiMethod:
    type: enum
    values: [GET, POST, PUT, DELETE]
    default: GET
    prompt: "API method?"
    condition: "{{ includeApi }}"
  
  includeStory:
    type: boolean
    default: false
    prompt: "Include Storybook story?"
  
  # Internal computed variables
  apiPath:
    type: string
    internal: true
    default: "/api/{{ name | kebabCase }}"

# Additional files specific to this template
files:
  - component.liquid
  - story.liquid

# Lifecycle hooks
hooks:
  after:
    - action: "npm:@hypergen/actions.install-dependencies"
      condition: "{{ includeApi }}"
      variables:
        packages: ["express", "@types/express"]
    
    - action: "./actions/update-routes-index"
      condition: "{{ includeApi }}"
      variables:
        routeName: "{{ name | kebabCase }}"
```

### `full-stack-component/component.liquid`
```liquid
---
to: src/components/{{ name }}/{{ name }}.module.css
---
.container {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
}
```

### `full-stack-component/story.liquid`
```liquid
---
to: src/components/{{ name }}/{{ name }}.stories.{{ typescript ? 'tsx' : 'jsx' }}
condition: "{{ includeStory }}"
---
{% if typescript %}import type { Meta, StoryObj } from '@storybook/react'
{% else %}import { Meta, StoryObj } from '@storybook/react'
{% endif %}import {{ name }} from './{{ name }}'

const meta{% if typescript %}: Meta<typeof {{ name }}>{% endif %} = {
  title: 'Components/{{ name }}',
  component: {{ name }},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
{% if typescript %}type Story = StoryObj<typeof meta>
{% else %}type Story = StoryObj
{% endif %}

export const Default: Story = {
  args: {
    children: 'Hello {{ name }}',
  },
}

export const WithCustomClass: Story = {
  args: {
    children: 'Styled {{ name }}',
    className: 'custom-style',
  },
}
```

## Usage Examples

### Basic Component Only
```bash
hypergen run full-stack-component \
  --name UserCard \
  --typescript true \
  --includeTests true \
  --includeApi false \
  --includeStory false
```

**Generated files:**
```
src/components/UserCard/
├── UserCard.tsx              # From base-component include
├── UserCard.test.tsx         # From base-component include  
├── UserCard.module.css       # From this template
└── index.ts                  # From base-component include
```

### Full-Stack Component with API
```bash
hypergen run full-stack-component \
  --name ProductCard \
  --typescript true \
  --includeTests true \
  --includeApi true \
  --apiMethod GET \
  --includeStory true
```

**Generated files:**
```
src/
├── components/ProductCard/
│   ├── ProductCard.tsx           # From base-component include
│   ├── ProductCard.test.tsx      # From base-component include
│   ├── ProductCard.module.css    # From this template
│   ├── ProductCard.stories.tsx   # From this template
│   └── index.ts                  # From base-component include
├── controllers/
│   └── ProductCardController.ts  # From api-endpoint include
└── routes/
    └── product-card.ts           # From api-endpoint include
```

### GitHub Template Include
```bash
# This would also include templates from GitHub repositories
hypergen run full-stack-component \
  --name NavigationMenu \
  --includeStory true
```

**Additional files from GitHub:**
```
src/components/NavigationMenu/
├── NavigationMenu.stories.tsx    # From github:storybook-team/templates
└── NavigationMenu.docs.mdx       # From GitHub template
```

## Variable Resolution and Merging

When templates are composed, variables are resolved in this order:

1. **Base template defaults**: Default values from included templates
2. **Override variables**: Variables passed to includes in the `variables` section
3. **User input**: Values provided via CLI or prompts
4. **Computed variables**: Internal variables calculated from other values

### Example Variable Flow
```yaml
# User runs:
# hypergen run full-stack-component --name UserProfile --includeApi true

# Variables resolved as:
name: "UserProfile"           # From user input
typescript: true              # From base-component default
includeTests: true            # From base-component default  
includeApi: true              # From user input
apiMethod: "GET"              # From this template default
endpoint: "/api/user-profile" # Computed in api-endpoint include
controllerName: "UserProfileController" # Computed in api-endpoint
```

## Advanced Composition Features

### Conditional Includes
```yaml
includes:
  - url: "./shared/database-model"
    condition: "{{ includeApi && persistData }}"
    variables:
      modelName: "{{ name }}"
```

### Version-Specific Includes
```yaml
includes:
  - url: "github:company/templates@v2.1.0/auth-component"
    condition: "{{ includeAuth }}"
  
  - url: "npm:@design-system/templates@^3.0.0/button"
    variables:
      variant: "{{ buttonVariant }}"
```

### Multiple Template Sources
```yaml
includes:
  - url: "./local/base"           # Local template
  - url: "github:team/shared@main" # GitHub repository
  - url: "npm:@company/templates"  # npm package
  - url: "https://cdn.company.com/templates/v1/addon.yml" # HTTP URL
```

## Key Benefits

1. **Reusability**: Base templates can be shared across projects
2. **Composability**: Complex templates built from simple, focused pieces
3. **Versioning**: Include specific versions of templates from GitHub/npm
4. **Flexibility**: Mix local and remote templates as needed
5. **Community**: Share templates via GitHub repositories and Gists
6. **Maintenance**: Update shared templates independently

This composition system makes Hypergen uniquely powerful for building scalable, maintainable template ecosystems.