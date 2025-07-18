# Basic V8 Template Example

## Overview

This example demonstrates a basic V8 template with `template.yml` configuration, rich variable types, and validation.

## File Structure

```
react-component/
├── template.yml
├── component.liquid
├── test.liquid
└── index.liquid
```

## Configuration

### `template.yml`
```yaml
title: "React Component"
description: "Creates a React component with tests and styles"

variables:
  name:
    type: string
    required: true
    prompt: "Component name?"
    pattern: "^[A-Z][a-zA-Z0-9]*$"
    validation:
      message: "Component name must be PascalCase"
  
  typescript:
    type: boolean
    default: true
    prompt: "Use TypeScript?"
  
  styling:
    type: enum
    values: [css-modules, styled-components, emotion, tailwind]
    default: css-modules
    prompt: "Styling approach?"
  
  testFramework:
    type: enum
    values: [jest, vitest, testing-library]
    default: jest
    prompt: "Test framework?"
  
  storybook:
    type: boolean
    default: false
    prompt: "Include Storybook story?"
  
  # Internal computed variables
  fileName:
    type: string
    internal: true
    default: "{{ name }}.component"
  
  testFileName:
    type: string
    internal: true
    default: "{{ name }}.test"

files:
  - component.liquid
  - test.liquid
  - index.liquid
```

## Template Files

### `component.liquid`
```liquid
---
to: src/components/{{ name }}/{{ fileName }}.{{ typescript ? 'tsx' : 'jsx' }}
---
{% if typescript %}import React from 'react'
{% else %}import React from 'react'
{% endif %}
{% if styling == 'styled-components' %}import styled from 'styled-components'
{% elsif styling == 'emotion' %}import styled from '@emotion/styled'
{% elsif styling == 'css-modules' %}import styles from './{{ name }}.module.css'
{% endif %}

{% if typescript %}interface {{ name }}Props {
  children?: React.ReactNode
  className?: string
}

{% endif %}{% if styling == 'styled-components' or styling == 'emotion' %}const StyledContainer = styled.div`
  /* Add your styles here */
`

{% endif %}const {{ name }}{% if typescript %}: React.FC<{{ name }}Props>{% endif %} = ({% if typescript %}{ children, className }{% else %}{ children, className }{% endif %}) => {
  return (
    {% if styling == 'styled-components' or styling == 'emotion' %}<StyledContainer className={className}>
      {children}
    </StyledContainer>{% elsif styling == 'css-modules' %}<div className={`${styles.container} ${className || ''}`}>
      {children}
    </div>{% elsif styling == 'tailwind' %}<div className={`component-container ${className || ''}`}>
      {children}
    </div>{% else %}<div className={className}>
      {children}
    </div>{% endif %}
  )
}

export default {{ name }}
```

### `test.liquid`
```liquid
---
to: src/components/{{ name }}/{{ testFileName }}.{{ typescript ? 'tsx' : 'jsx' }}
---
{% if testFramework == 'jest' %}import { render, screen } from '@testing-library/react'
{% elsif testFramework == 'vitest' %}import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
{% else %}import { render, screen } from '@testing-library/react'
{% endif %}import {{ name }} from './{{ fileName }}'

{% if testFramework == 'vitest' %}describe('{{ name }}', () => {
  it('renders children correctly', () => {
    render(<{{ name }}>Test Content</{{ name }}>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<{{ name }} className="custom-class">Test</{{ name }}>)
    const element = screen.getByText('Test').parentElement
    expect(element).toHaveClass('custom-class')
  })
})
{% else %}describe('{{ name }}', () => {
  test('renders children correctly', () => {
    render(<{{ name }}>Test Content</{{ name }}>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<{{ name }} className="custom-class">Test</{{ name }}>)
    const element = screen.getByText('Test').parentElement
    expect(element).toHaveClass('custom-class')
  })
})
{% endif %}
```

### `index.liquid`
```liquid
---
to: src/components/{{ name }}/index.{{ typescript ? 'ts' : 'js' }}
---
export { default } from './{{ fileName }}'
{% if typescript %}export type { {{ name }}Props } from './{{ fileName }}'
{% endif %}
```

## Usage

### Basic Usage
```bash
# Run the template with minimum required variables
hypergen run react-component --name Button

# Run with all options specified
hypergen run react-component \
  --name NavigationBar \
  --typescript true \
  --styling styled-components \
  --testFramework vitest \
  --storybook true
```

### Interactive Mode
```bash
# Run interactively - will prompt for all variables
hypergen run react-component

# Output:
# ? Component name? MyButton
# ? Use TypeScript? (Y/n) Y
# ? Styling approach? (css-modules)
#   css-modules
# > styled-components
#   emotion
#   tailwind
# ? Test framework? (jest)
# > jest
#   vitest
#   testing-library
# ? Include Storybook story? (y/N) N
```

## Expected Output

For input `--name Button --typescript true --styling css-modules --testFramework jest`:

```
Generated files:
✓ src/components/Button/Button.component.tsx
✓ src/components/Button/Button.test.tsx  
✓ src/components/Button/index.ts
```

### `src/components/Button/Button.component.tsx`
```tsx
import React from 'react'
import styles from './Button.module.css'

interface ButtonProps {
  children?: React.ReactNode
  className?: string
}

const Button: React.FC<ButtonProps> = ({ children, className }) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      {children}
    </div>
  )
}

export default Button
```

### `src/components/Button/Button.test.tsx`
```tsx
import { render, screen } from '@testing-library/react'
import Button from './Button.component'

describe('Button', () => {
  test('renders children correctly', () => {
    render(<Button>Test Content</Button>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>)
    const element = screen.getByText('Test').parentElement
    expect(element).toHaveClass('custom-class')
  })
})
```

### `src/components/Button/index.ts`
```ts
export { default } from './Button.component'
export type { ButtonProps } from './Button.component'
```

## Variations

### JavaScript Version
```bash
hypergen run react-component --name Button --typescript false
```

### Styled Components Version
```bash
hypergen run react-component --name Button --styling styled-components
```

### With Storybook
```bash
hypergen run react-component --name Button --storybook true
# Would generate additional Button.stories.tsx file
```

## Key V8 Features Demonstrated

1. **Rich Variable Types**: String, boolean, enum with validation
2. **Pattern Validation**: PascalCase requirement for component names
3. **Default Values**: Sensible defaults for all optional variables
4. **Internal Variables**: Computed fileName and testFileName
5. **Conditional Logic**: Different output based on variable values
6. **File Extensions**: Dynamic file extensions based on TypeScript choice
7. **Template Engine**: LiquidJS with advanced filtering and conditionals

This example shows how V8's template.yml configuration makes templates more powerful and user-friendly than the traditional frontmatter approach.