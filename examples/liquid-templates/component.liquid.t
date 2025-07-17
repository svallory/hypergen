---
to: src/components/{{ name | pascalCase }}.tsx
---
import React from 'react'

interface {{ name | pascalCase }}Props {
  className?: string
  children?: React.ReactNode
}

export const {{ name | pascalCase }}: React.FC<{{ name | pascalCase }}Props> = ({ 
  className = '',
  children 
}) => {
  return (
    <div className={`{{ name | kebabCase }} ${className}`}>
      {children}
    </div>
  )
}

export default {{ name | pascalCase }}