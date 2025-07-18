# Template Composability Redesign: Author-Focused, Single-File Generators

## Key Insights from Feedback

1. **❌ "Compose on-the-fly"** is NOT a real use case - users don't expect multiple generators to affect each other
2. **✅ Focus on template AUTHORS** - this is about making it easier to write reusable generators  
3. **✅ Single-file generators** - with frontmatter, referenceable from URLs/gists
4. **✅ Use Moon's template.yml structure** - "exports" is confusing, Moon's approach is cleaner

## Redesigned Approach: Single-File Composable Generators

### 1. **Single-File Generator Format**

#### Basic Structure (following Moon's template.yml)
```yaml
---
# Standard Moon configuration
title: "Package.json Generator"
description: "Creates and manages package.json files"
destination: "."

variables:
  name:
    type: string
    required: true
    prompt: "Package name?"
  version:
    type: string
    default: "1.0.0"
  description:
    type: string
    prompt: "Package description?"
  license:
    type: enum
    values: [MIT, Apache-2.0, GPL-3.0]
    prompt: "License type?"

# Composability extensions
includes:
  - url: "https://gist.github.com/svallory/abc123/license-generator.liquid"
    variables:
      license: "{{ license }}"
  
  - url: "github:svallory/hypergen-generators/typescript-config.liquid"
    condition: "{{ language === 'typescript' }}"
    variables:
      strict: true
---
{
  "name": "{{ name }}",
  "version": "{{ version }}",
  "description": "{{ description }}",
  {% if license %}
  "license": "{{ license }}",
  {% endif %}
  "dependencies": {},
  "devDependencies": {}
}
```

### 2. **Template Author Workflow**

#### Creating a Reusable Generator
```bash
# 1. Create a single-file generator
echo '---
title: "TypeScript Config"
description: "Generates tsconfig.json"
variables:
  strict:
    type: boolean
    default: true
    prompt: "Enable strict mode?"
---
{
  "compilerOptions": {
    "strict": {{ strict }},
    "target": "ES2020",
    "module": "ESNext"
  }
}' > typescript-config.liquid

# 2. Share via gist
gh gist create typescript-config.liquid --public

# 3. Reference in other generators
# Now other authors can include:
# - url: "https://gist.github.com/username/abc123/typescript-config.liquid"
```

#### Using Remote Generators
```yaml
---
title: "React TypeScript App"
description: "Full React app with TypeScript"

variables:
  name:
    type: string
    required: true
    prompt: "App name?"
  
  strict:
    type: boolean
    default: true
    prompt: "Enable TypeScript strict mode?"

# Include remote generators
includes:
  - url: "https://gist.github.com/svallory/abc123/package-json.liquid"
    variables:
      name: "{{ name }}"
      description: "React TypeScript application"
  
  - url: "github:community/typescript-config.liquid"
    variables:
      strict: "{{ strict }}"
  
  - url: "https://raw.githubusercontent.com/react-community/generators/main/component.liquid"
    variables:
      name: "App"
      typescript: true
---
// App.tsx will be generated here
import React from 'react';

export default function {{ name | pascalCase }}() {
  return <div>Hello {{ name }}!</div>;
}
```

### 3. **URL Reference System**

#### Supported URL Formats
```yaml
includes:
  # Direct URLs
  - url: "https://gist.github.com/user/abc123/generator.liquid"
  
  # GitHub shorthand  
  - url: "github:user/repo/path/generator.liquid"
  
  # GitHub with version
  - url: "github:user/repo/path/generator.liquid@v1.2.3"
  
  # Local file (for development)
  - url: "file:./local-generator.liquid"
  
  # npm package (future)
  - url: "npm:@company/hypergen-generators/react.liquid"
```

#### Variable Passing
```yaml
includes:
  - url: "github:svallory/generators/license.liquid"
    variables:
      license: "{{ license }}"
      year: "{{ year || 2024 }}"
      author: "{{ author || 'Unknown' }}"
    
    # Optional: rename variables
    map:
      projectName: name
      copyrightYear: year
```

### 4. **Implementation Strategy**

#### Template Resolution Engine
```typescript
interface TemplateInclude {
  url: string
  variables?: Record<string, any>
  condition?: string
  map?: Record<string, string>
}

class TemplateResolver {
  async resolveIncludes(template: ParsedTemplate): Promise<ResolvedTemplate> {
    for (const include of template.includes) {
      // 1. Fetch remote template
      const remoteTemplate = await this.fetchTemplate(include.url)
      
      // 2. Parse and validate
      const parsed = await this.parseTemplate(remoteTemplate)
      
      // 3. Apply variable mapping
      const variables = this.mapVariables(include.variables, include.map)
      
      // 4. Render with context
      const rendered = await this.renderTemplate(parsed, variables)
      
      // 5. Insert into main template
      template.body += rendered
    }
    
    return template
  }
  
  private async fetchTemplate(url: string): Promise<string> {
    // Handle different URL formats
    if (url.startsWith('github:')) {
      return this.fetchGithubTemplate(url)
    } else if (url.startsWith('https://gist.github.com')) {
      return this.fetchGistTemplate(url)
    } else {
      return this.fetchHttpTemplate(url)
    }
  }
}
```

### 5. **Real-World Examples**

#### Example 1: License Generator (Shareable)
```yaml
---
title: "License Generator"
description: "Generates license files"
destination: "LICENSE"

variables:
  license:
    type: enum
    values: [MIT, Apache-2.0, GPL-3.0]
    required: true
    prompt: "License type?"
  
  author:
    type: string
    required: true
    prompt: "Author name?"
  
  year:
    type: number
    default: 2024
---
{% if license == 'MIT' %}
MIT License

Copyright (c) {{ year }} {{ author }}

Permission is hereby granted, free of charge, to any person obtaining a copy...
{% elsif license == 'Apache-2.0' %}
Apache License
Version 2.0, January 2004
...
{% endif %}
```

#### Example 2: Complex App Generator (Using Includes)
```yaml
---
title: "Full-Stack TypeScript App"
description: "Complete app with frontend, backend, and database"

variables:
  name:
    type: string
    required: true
    prompt: "Project name?"
  
  database:
    type: enum
    values: [postgres, mysql, sqlite]
    default: postgres
    prompt: "Database type?"

includes:
  # Base project structure
  - url: "github:svallory/generators/package-json.liquid"
    variables:
      name: "{{ name }}"
      description: "Full-stack TypeScript application"
  
  # TypeScript configuration
  - url: "github:svallory/generators/typescript-config.liquid"
    variables:
      strict: true
  
  # Database configuration
  - url: "github:svallory/generators/database-config.liquid"
    condition: "{{ database === 'postgres' }}"
    variables:
      type: "postgres"
  
  # License
  - url: "https://gist.github.com/svallory/abc123/license.liquid"
    variables:
      license: "MIT"
      author: "{{ author || 'Unknown' }}"
---
# {{ name | titleize }}

A full-stack TypeScript application with {{ database }} database.

## Getting Started

npm install
npm run dev
```

### 6. **Benefits for Template Authors**

#### ✅ **Extreme Simplicity**
- Single file per generator
- Standard frontmatter configuration
- No complex setup or build process

#### ✅ **Instant Sharing**
- Share via GitHub gists
- Reference directly by URL
- No npm publishing required

#### ✅ **True Reusability**
- Include any generator from any URL
- Pass variables to customize behavior
- Compose complex generators from simple ones

#### ✅ **Author-Focused Workflow**
- Template authors benefit from reuse
- End users get the composed result
- No unexpected behavior for consumers

### 7. **Next Steps**

1. **Extend template.yml parsing** to support `includes` section
2. **Build template resolver** for URL fetching and caching
3. **Add variable mapping** for include customization
4. **Create sharing tools** for gist/GitHub integration
5. **Build example generator library** to demonstrate patterns

This approach focuses on the right use case - making template authors productive while keeping the end-user experience simple and predictable.