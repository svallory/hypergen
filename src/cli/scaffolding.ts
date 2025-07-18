/**
 * Generator Scaffolding System
 * 
 * Provides commands to initialize new generators and templates
 */

import fs from 'fs'
import path from 'path'
import { DefaultActionUtils, ConsoleActionLogger } from '../actions/index.js'

export interface ScaffoldingOptions {
  name: string
  description?: string
  category?: string
  author?: string
  directory?: string
  type?: 'action' | 'template' | 'both'
  framework?: 'react' | 'vue' | 'node' | 'cli' | 'api' | 'generic'
  withExamples?: boolean
  withTests?: boolean
}

export class GeneratorScaffolding {
  private utils = new DefaultActionUtils()
  private logger = new ConsoleActionLogger()

  /**
   * Initialize a new generator with scaffolding
   */
  async initGenerator(options: ScaffoldingOptions): Promise<{ success: boolean; message?: string; filesCreated?: string[] }> {
    try {
      const generatorDir = path.join(options.directory || '_templates', options.name)
      const filesCreated: string[] = []

      // Ensure generator directory exists
      this.utils.createDirectory(generatorDir)

      // Create actions.ts file if action type
      if (options.type === 'action' || options.type === 'both') {
        const actionsPath = path.join(generatorDir, 'actions.ts')
        const actionsContent = this.generateActionsFile(options)
        this.utils.writeFile(actionsPath, actionsContent)
        filesCreated.push(actionsPath)
      }

      // Create template.yml file if template type
      if (options.type === 'template' || options.type === 'both') {
        const templatePath = path.join(generatorDir, 'template.yml')
        const templateContent = this.generateTemplateFile(options)
        this.utils.writeFile(templatePath, templateContent)
        filesCreated.push(templatePath)
      }

      // Create example template files
      if (options.withExamples) {
        const exampleFiles = this.generateExampleTemplates(options)
        for (const [filePath, content] of Object.entries(exampleFiles)) {
          const fullPath = path.join(generatorDir, filePath)
          this.utils.createDirectory(path.dirname(fullPath))
          this.utils.writeFile(fullPath, content)
          filesCreated.push(fullPath)
        }
      }

      // Create test files
      if (options.withTests) {
        const testPath = path.join(generatorDir, `${options.name}.test.ts`)
        const testContent = this.generateTestFile(options)
        this.utils.writeFile(testPath, testContent)
        filesCreated.push(testPath)
      }

      // Create README
      const readmePath = path.join(generatorDir, 'README.md')
      const readmeContent = this.generateReadmeFile(options)
      this.utils.writeFile(readmePath, readmeContent)
      filesCreated.push(readmePath)

      return {
        success: true,
        message: `Generator '${options.name}' created successfully`,
        filesCreated
      }

    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create generator: ${error.message}`
      }
    }
  }

  /**
   * Initialize a workspace with multiple generators
   */
  async initWorkspace(options: { directory?: string; withExamples?: boolean }): Promise<{ success: boolean; message?: string; filesCreated?: string[] }> {
    try {
      const workspaceDir = options.directory || '_templates'
      const filesCreated: string[] = []

      // Ensure workspace directory exists
      this.utils.createDirectory(workspaceDir)

      // Create workspace configuration
      const configPath = path.join(workspaceDir, 'hypergen.config.js')
      const configContent = this.generateWorkspaceConfig()
      await this.utils.writeFile(configPath, configContent)
      filesCreated.push(configPath)

      // Create workspace README
      const readmePath = path.join(workspaceDir, 'README.md')
      const readmeContent = this.generateWorkspaceReadme()
      this.utils.writeFile(readmePath, readmeContent)
      filesCreated.push(readmePath)

      // Create example generators if requested
      if (options.withExamples) {
        const exampleGenerators = [
          { name: 'component', framework: 'react', type: 'both' },
          { name: 'api-route', framework: 'api', type: 'both' },
          { name: 'util-function', framework: 'generic', type: 'both' }
        ]

        for (const example of exampleGenerators) {
          const result = await this.initGenerator({
            name: example.name,
            description: `Example ${example.name} generator`,
            category: 'examples',
            author: 'Hypergen',
            directory: workspaceDir,
            type: example.type as 'both',
            framework: example.framework as any,
            withExamples: true,
            withTests: true
          })

          if (result.filesCreated) {
            filesCreated.push(...result.filesCreated)
          }
        }
      }

      return {
        success: true,
        message: `Workspace initialized at ${workspaceDir}`,
        filesCreated
      }

    } catch (error: any) {
      return {
        success: false,
        message: `Failed to initialize workspace: ${error.message}`
      }
    }
  }

  /**
   * Generate actions.ts file content
   */
  private generateActionsFile(options: ScaffoldingOptions): string {
    const actionName = this.toCamelCase(options.name)
    const pascalName = this.toPascalCase(options.name)
    const framework = options.framework || 'generic'
    
    const parameters = this.getFrameworkParameters(framework)
    const imports = this.getFrameworkImports(framework)
    const implementation = this.getFrameworkImplementation(framework, options)

    return `/**
 * ${pascalName} Generator Actions
 * 
 * ${options.description || `Generator for ${options.name}`}
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'
${imports}

@action({
  name: '${options.name}',
  description: '${options.description || `Generate ${options.name} files`}',
  category: '${options.category || 'custom'}',
  tags: ['${options.category || 'custom'}', '${framework}'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: '${pascalName} name',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$'
    },
${parameters.map(p => `    {
      name: '${p.name}',
      type: '${p.type}',
      ${p.required ? 'required: true,' : ''}
      ${p.default !== undefined ? `default: ${JSON.stringify(p.default)},` : ''}
      description: '${p.description}'${p.values ? `,\n      values: ${JSON.stringify(p.values)}` : ''}
    }`).join(',\n')}
  ],
  examples: [
    {
      title: 'Basic ${options.name}',
      description: 'Create a basic ${options.name}',
      parameters: {
        name: 'example-${options.name}',
${parameters.filter(p => p.default !== undefined).map(p => `        ${p.name}: ${JSON.stringify(p.default)}`).join(',\n')}
      }
    }
  ]
})
export async function ${actionName}(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { name${parameters.length > 0 ? ', ' + parameters.map(p => p.name).join(', ') : ''} } = variables
  
  logger.info(\`Creating ${options.name}: \${name}\`)
  
  const filesCreated: string[] = []
  
  try {
${implementation}
    
    logger.success(\`Created ${options.name} \${name} with \${filesCreated.length} files\`)
    
    return {
      success: true,
      message: \`Successfully created ${options.name}: \${name}\`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(\`Failed to create ${options.name}: \${error.message}\`)
    return {
      success: false,
      message: \`Failed to create ${options.name}: \${error.message}\`
    }
  }
}

${this.getFrameworkHelperFunctions(framework, options)}
`
  }

  /**
   * Generate template.yml file content
   */
  private generateTemplateFile(options: ScaffoldingOptions): string {
    const framework = options.framework || 'generic'
    const parameters = this.getFrameworkParameters(framework)

    return `name: ${options.name}
description: ${options.description || `Generate ${options.name} files`}
version: 1.0.0
author: ${options.author || 'Unknown'}
category: ${options.category || 'custom'}
tags: [${options.category || 'custom'}, ${framework}]

variables:
  name:
    type: string
    required: true
    description: ${options.name} name
    pattern: "^[a-zA-Z][a-zA-Z0-9-_]*$"
${parameters.map(p => `    
  ${p.name}:
    type: ${p.type}
    ${p.required ? 'required: true' : ''}
    ${p.default !== undefined ? `default: ${JSON.stringify(p.default)}` : ''}
    description: ${p.description}${p.values ? `\n    values: ${JSON.stringify(p.values)}` : ''}`).join('\n')}

examples:
  - title: "Basic ${options.name}"
    description: "Create a basic ${options.name}"
    variables:
      name: "example-${options.name}"
${parameters.filter(p => p.default !== undefined).map(p => `      ${p.name}: ${JSON.stringify(p.default)}`).join('\n')}
`
  }

  /**
   * Generate example template files
   */
  private generateExampleTemplates(options: ScaffoldingOptions): Record<string, string> {
    const framework = options.framework || 'generic'
    const templates: Record<string, string> = {}

    switch (framework) {
      case 'react':
        templates['templates/component.tsx.ejs'] = this.getReactComponentTemplate()
        templates['templates/component.test.tsx.ejs'] = this.getReactTestTemplate()
        templates['templates/component.stories.tsx.ejs'] = this.getReactStoryTemplate()
        break
        
      case 'vue':
        templates['templates/component.vue.ejs'] = this.getVueComponentTemplate()
        templates['templates/component.test.ts.ejs'] = this.getVueTestTemplate()
        break
        
      case 'api':
        templates['templates/route.ts.ejs'] = this.getApiRouteTemplate()
        templates['templates/route.test.ts.ejs'] = this.getApiTestTemplate()
        templates['templates/model.ts.ejs'] = this.getApiModelTemplate()
        break
        
      case 'cli':
        templates['templates/command.ts.ejs'] = this.getCliCommandTemplate()
        templates['templates/command.test.ts.ejs'] = this.getCliTestTemplate()
        break
        
      case 'node':
        templates['templates/module.ts.ejs'] = this.getNodeModuleTemplate()
        templates['templates/module.test.ts.ejs'] = this.getNodeTestTemplate()
        break
        
      default:
        templates['templates/file.ts.ejs'] = this.getGenericFileTemplate()
        templates['templates/file.test.ts.ejs'] = this.getGenericTestTemplate()
    }

    return templates
  }

  /**
   * Generate test file content
   */
  private generateTestFile(options: ScaffoldingOptions): string {
    const actionName = this.toCamelCase(options.name)
    
    return `import { ${actionName} } from './${options.name}'
import { ActionContext } from '../../src/actions/index.js'
import { beforeEach, describe, it, expect } from 'bun:test'

describe('${options.name} generator', () => {
  let mockContext: ActionContext
  
  beforeEach(() => {
    mockContext = {
      variables: {
        name: 'test-${options.name}'
      },
      utils: {
        ensureDir: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn(),
        fileExists: jest.fn()
      },
      logger: {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    }
  })

  it('should create ${options.name} successfully', async () => {
    const result = await ${actionName}(mockContext)
    
    expect(result.success).toBe(true)
    expect(result.message).toContain('test-${options.name}')
    expect(result.filesCreated).toBeDefined()
  })

  it('should handle errors gracefully', async () => {
    mockContext.utils.writeFile = jest.fn().mockRejectedValue(new Error('Write failed'))
    
    const result = await ${actionName}(mockContext)
    
    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to create ${options.name}')
  })
})
`
  }

  /**
   * Generate README file content
   */
  private generateReadmeFile(options: ScaffoldingOptions): string {
    return `# ${options.name} Generator

${options.description || `Generator for creating ${options.name} files`}

## Usage

\`\`\`bash
hypergen action ${options.name} --name=my-${options.name}
\`\`\`

## Parameters

- **name** (required): ${options.name} name
${this.getFrameworkParameters(options.framework || 'generic').map(p => 
  `- **${p.name}**: ${p.description}${p.default !== undefined ? ` (default: ${JSON.stringify(p.default)})` : ''}`
).join('\n')}

## Examples

\`\`\`bash
# Basic usage
hypergen action ${options.name} --name=example-${options.name}

# With all options
hypergen action ${options.name} --name=my-${options.name} ${this.getFrameworkParameters(options.framework || 'generic').filter(p => p.default !== undefined).map(p => `--${p.name}=${JSON.stringify(p.default)}`).join(' ')}
\`\`\`

## Generated Files

This generator creates the following files:

${this.getFrameworkFileList(options.framework || 'generic').map(f => `- ${f}`).join('\n')}

## Configuration

You can customize the generator by modifying:

- \`actions.ts\` - Action implementation
- \`template.yml\` - Variable definitions and examples
- \`templates/\` - Template files
- \`README.md\` - Documentation

## Framework

This generator is configured for: **${options.framework || 'generic'}**

## Category

Category: **${options.category || 'custom'}**

## Author

${options.author || 'Unknown'}
`
  }

  /**
   * Generate workspace configuration
   */
  private generateWorkspaceConfig(): string {
    return `module.exports = {
  // Hypergen workspace configuration
  templates: [
    {
      name: 'local',
      path: './_templates'
    }
  ],
  
  // Default configuration for generators
  defaults: {
    author: 'Your Name',
    category: 'custom',
    withTests: true,
    withExamples: true
  },
  
  // Custom helpers available to all templates
  helpers: {
    capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    kebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    camelCase: (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  }
}
`
  }

  /**
   * Generate workspace README
   */
  private generateWorkspaceReadme(): string {
    return `# Hypergen Workspace

This is a Hypergen workspace containing custom generators and templates.

## Structure

\`\`\`
_templates/
├── hypergen.config.js    # Workspace configuration
├── component/            # Example component generator
│   ├── actions.ts
│   ├── template.yml
│   └── templates/
├── api-route/           # Example API route generator
│   ├── actions.ts
│   ├── template.yml
│   └── templates/
└── util-function/       # Example utility function generator
    ├── actions.ts
    ├── template.yml
    └── templates/
\`\`\`

## Usage

### List available generators
\`\`\`bash
hypergen discover
hypergen list
\`\`\`

### Use a generator
\`\`\`bash
hypergen action component --name=Button --type=functional
hypergen action api-route --name=users --method=GET
hypergen action util-function --name=formatDate
\`\`\`

### Create new generator
\`\`\`bash
hypergen init generator --name=my-generator --framework=react
\`\`\`

### Validate templates
\`\`\`bash
hypergen template validate component/template.yml
hypergen template list
\`\`\`

## Configuration

Edit \`hypergen.config.js\` to customize:

- Template discovery paths
- Default values for generators
- Custom helper functions
- Workspace-wide settings

## Adding New Generators

1. Create a new directory under \`_templates/\`
2. Add \`actions.ts\` and/or \`template.yml\`
3. Create template files in \`templates/\` subdirectory
4. Test with \`hypergen template validate\`

## Best Practices

- Use descriptive names for generators
- Include comprehensive examples
- Add tests for complex generators
- Document all parameters
- Follow consistent file naming conventions

## Resources

- [Hypergen Documentation](https://hypergen.dev)
- [Template Syntax Guide](https://hypergen.dev/templates)
- [Action API Reference](https://hypergen.dev/actions)
`
  }

  // Helper methods for different frameworks
  private getFrameworkParameters(framework: string): Array<{name: string, type: string, required?: boolean, default?: any, description: string, values?: string[]}> {
    switch (framework) {
      case 'react':
        return [
          { name: 'type', type: 'enum', values: ['functional', 'class'], default: 'functional', description: 'Component type' },
          { name: 'withProps', type: 'boolean', default: true, description: 'Include props interface' },
          { name: 'withStorybook', type: 'boolean', default: false, description: 'Generate Storybook stories' },
          { name: 'styling', type: 'enum', values: ['css', 'scss', 'styled-components'], default: 'css', description: 'Styling approach' }
        ]
      case 'vue':
        return [
          { name: 'type', type: 'enum', values: ['sfc', 'composition', 'options'], default: 'composition', description: 'Component type' },
          { name: 'withProps', type: 'boolean', default: true, description: 'Include props definition' },
          { name: 'withEmits', type: 'boolean', default: false, description: 'Include emits definition' }
        ]
      case 'api':
        return [
          { name: 'method', type: 'enum', values: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET', description: 'HTTP method' },
          { name: 'withAuth', type: 'boolean', default: true, description: 'Include authentication' },
          { name: 'withValidation', type: 'boolean', default: true, description: 'Include validation' }
        ]
      case 'cli':
        return [
          { name: 'hasOptions', type: 'boolean', default: true, description: 'Include command options' },
          { name: 'hasSubcommands', type: 'boolean', default: false, description: 'Include subcommands' }
        ]
      case 'node':
        return [
          { name: 'type', type: 'enum', values: ['class', 'function', 'module'], default: 'function', description: 'Module type' },
          { name: 'withAsync', type: 'boolean', default: false, description: 'Use async/await' }
        ]
      default:
        return [
          { name: 'type', type: 'enum', values: ['typescript', 'javascript'], default: 'typescript', description: 'File type' },
          { name: 'withExports', type: 'boolean', default: true, description: 'Include exports' }
        ]
    }
  }

  private getFrameworkImports(framework: string): string {
    switch (framework) {
      case 'react':
      case 'vue':
        return ''
      case 'api':
        return ''
      case 'cli':
        return ''
      case 'node':
        return ''
      default:
        return ''
    }
  }

  private getFrameworkImplementation(framework: string, options: ScaffoldingOptions): string {
    return `    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'src', '${options.name}s')
    await utils.ensureDir(outputDir)
    
    // Generate main file
    const mainFile = path.join(outputDir, \`\${name}.ts\`)
    const mainContent = generate${this.toPascalCase(options.name)}(name, variables)
    await utils.writeFile(mainFile, mainContent)
    filesCreated.push(mainFile)
    
    // Generate test file
    const testFile = path.join(outputDir, \`\${name}.test.ts\`)
    const testContent = generate${this.toPascalCase(options.name)}Test(name, variables)
    await utils.writeFile(testFile, testContent)
    filesCreated.push(testFile)`
  }

  private getFrameworkHelperFunctions(framework: string, options: ScaffoldingOptions): string {
    const pascalName = this.toPascalCase(options.name)
    
    return `function generate${pascalName}(name: string, variables: any): string {
  return \`// Generated ${options.name}: \${name}
export const \${name} = {
  // Add your implementation here
};
\`
}

function generate${pascalName}Test(name: string, variables: any): string {
  return \`import { \${name} } from './${options.name}';

describe('\${name}', () => {
  it('should be defined', () => {
    expect(\${name}).toBeDefined();
  });
});
\`
}`
  }

  private getFrameworkFileList(framework: string): string[] {
    switch (framework) {
      case 'react':
        return ['Component.tsx', 'Component.test.tsx', 'Component.stories.tsx', 'index.ts']
      case 'vue':
        return ['Component.vue', 'Component.test.ts', 'index.ts']
      case 'api':
        return ['route.ts', 'route.test.ts', 'model.ts']
      case 'cli':
        return ['command.ts', 'command.test.ts']
      case 'node':
        return ['module.ts', 'module.test.ts', 'index.ts']
      default:
        return ['file.ts', 'file.test.ts']
    }
  }

  // Template generation methods
  private getReactComponentTemplate(): string {
    return `---
to: src/components/<%= name %>/<%= name %>.tsx
---
import React from 'react';

export interface <%= name %>Props {
  children?: React.ReactNode;
  className?: string;
}

const <%= name %>: React.FC<<%= name %>Props> = ({ children, className }) => {
  return (
    <div className={\`<%= name.toLowerCase() %>\${className ? \` \${className}\` : ''}\`}>
      {children || '<%= name %> Component'}
    </div>
  );
};

export default <%= name %>;
`
  }

  private getReactTestTemplate(): string {
    return `---
to: src/components/<%= name %>/<%= name %>.test.tsx
---
import React from 'react';
import { render, screen } from '@testing-library/react';
import <%= name %> from './<%= name %>';

describe('<%= name %>', () => {
  it('renders without crashing', () => {
    render(<<%= name %> />);
    expect(screen.getByText('<%= name %> Component')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(<<%= name %>>Custom content</<%= name %>>);
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });
});
`
  }

  private getReactStoryTemplate(): string {
    return `---
to: src/components/<%= name %>/<%= name %>.stories.tsx
---
import type { Meta, StoryObj } from '@storybook/react';
import <%= name %> from './<%= name %>';

const meta: Meta<typeof <%= name %>> = {
  title: 'Components/<%= name %>',
  component: <%= name %>,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithContent: Story = {
  args: {
    children: 'Custom content',
  },
};
`
  }

  private getVueComponentTemplate(): string {
    return `---
to: src/components/<%= name %>.vue
---
<template>
  <div class="<%= name.toLowerCase() %>">
    <slot><%= name %> Component</slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  className: ''
});
</script>

<style scoped>
.<%= name.toLowerCase() %> {
  /* Add your styles here */
}
</style>
`
  }

  private getVueTestTemplate(): string {
    return `---
to: src/components/<%= name %>.test.ts
---
import { mount } from '@vue/test-utils';
import <%= name %> from './<%= name %>.vue';

describe('<%= name %>', () => {
  it('renders properly', () => {
    const wrapper = mount(<%= name %>);
    expect(wrapper.text()).toContain('<%= name %> Component');
  });

  it('renders slot content', () => {
    const wrapper = mount(<%= name %>, {
      slots: {
        default: 'Custom content'
      }
    });
    expect(wrapper.text()).toContain('Custom content');
  });
});
`
  }

  private getApiRouteTemplate(): string {
    return `---
to: src/routes/<%= name %>.ts
---
import { Router, Request, Response } from 'express';

const router = Router();

router.<%= method.toLowerCase() %>('/<%= name %>', async (req: Request, res: Response) => {
  try {
    // TODO: Implement <%= method %> /<%= name %> logic
    res.json({ message: '<%= name %> endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`
  }

  private getApiTestTemplate(): string {
    return `---
to: src/routes/<%= name %>.test.ts
---
import request from 'supertest';
import express from 'express';
import <%= name %>Router from './<%= name %>';

const app = express();
app.use(express.json());
app.use('/api/<%= name %>', <%= name %>Router);

describe('<%= name %> API', () => {
  it('should respond to <%= method %> /<%= name %>', async () => {
    const response = await request(app)
      .<%= method.toLowerCase() %>('/api/<%= name %>')
      .expect(200);
    
    expect(response.body.message).toBe('<%= name %> endpoint');
  });
});
`
  }

  private getApiModelTemplate(): string {
    return `---
to: src/models/<%= name %>.ts
---
export interface <%= name %> {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class <%= name %>Model {
  static async findById(id: string): Promise<<%= name %> | null> {
    // TODO: Implement database query
    return null;
  }

  static async create(data: Partial<<%= name %>>): Promise<<%= name %>> {
    // TODO: Implement database creation
    throw new Error('Not implemented');
  }

  static async update(id: string, data: Partial<<%= name %>>): Promise<<%= name %> | null> {
    // TODO: Implement database update
    return null;
  }

  static async delete(id: string): Promise<boolean> {
    // TODO: Implement database deletion
    return false;
  }
}
`
  }

  private getCliCommandTemplate(): string {
    return `---
to: src/commands/<%= name %>.ts
---
import { Command } from 'commander';

export const <%= name %>Command = new Command('<%= name %>')
  .description('<%= name %> command')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log('Running <%= name %> command');
      
      if (options.verbose) {
        console.log('Verbose mode enabled');
      }
      
      // TODO: Implement <%= name %> command logic
      
      console.log('<%= name %> command completed');
    } catch (error: any) {
      console.error(\`<%= name %> command failed: \${error.message}\`);
      process.exit(1);
    }
  });
`
  }

  private getCliTestTemplate(): string {
    return `---
to: src/commands/<%= name %>.test.ts
---
import { execSync } from 'child_process';

describe('<%= name %> command', () => {
  it('should run successfully', () => {
    expect(() => {
      execSync('node dist/cli.js <%= name %>', { encoding: 'utf-8' });
    }).not.toThrow();
  });

  it('should show help', () => {
    const result = execSync('node dist/cli.js <%= name %> --help', { encoding: 'utf-8' });
    expect(result).toContain('<%= name %>');
  });
});
`
  }

  private getNodeModuleTemplate(): string {
    return `---
to: src/<%= name %>.ts
---
export interface <%= name %>Options {
  // Define options here
}

export class <%= name %> {
  private options: <%= name %>Options;

  constructor(options: <%= name %>Options = {}) {
    this.options = options;
  }

  // TODO: Implement <%= name %> methods
}

export function create<%= name %>(options?: <%= name %>Options): <%= name %> {
  return new <%= name %>(options);
}
`
  }

  private getNodeTestTemplate(): string {
    return `---
to: src/<%= name %>.test.ts
---
import { <%= name %>, create<%= name %> } from './<%= name %>';

describe('<%= name %>', () => {
  it('should create instance', () => {
    const instance = create<%= name %>();
    expect(instance).toBeInstanceOf(<%= name %>);
  });

  it('should accept options', () => {
    const options = {};
    const instance = create<%= name %>(options);
    expect(instance).toBeInstanceOf(<%= name %>);
  });
});
`
  }

  private getGenericFileTemplate(): string {
    return `---
to: src/<%= name %>.ts
---
/**
 * <%= name %> - Generated file
 */

export interface <%= name %>Config {
  // Define configuration here
}

export function <%= name %>(config: <%= name %>Config): void {
  // TODO: Implement <%= name %> functionality
  console.log('Running <%= name %> with config:', config);
}

export default <%= name %>;
`
  }

  private getGenericTestTemplate(): string {
    return `---
to: src/<%= name %>.test.ts
---
import <%= name %> from './<%= name %>';

describe('<%= name %>', () => {
  it('should be defined', () => {
    expect(<%= name %>).toBeDefined();
  });

  it('should run without errors', () => {
    expect(() => {
      <%= name %>({});
    }).not.toThrow();
  });
});
`
  }

  // Utility methods
  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w)/g, (g) => g.replace('-', '').toUpperCase())
  }
}