/**
 * React Component Generator Actions
 * 
 * Demonstrates @action decorator usage for React component generation
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

@action({
  name: 'create-react-component',
  description: 'Generate a React component with TypeScript',
  category: 'react',
  tags: ['react', 'component', 'typescript'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Component name (will be PascalCased)',
      pattern: '^[a-zA-Z][a-zA-Z0-9]*$'
    },
    {
      name: 'type',
      type: 'enum',
      values: ['functional', 'class'],
      default: 'functional',
      description: 'Component type'
    },
    {
      name: 'withStorybook',
      type: 'boolean',
      default: false,
      description: 'Generate Storybook stories'
    },
    {
      name: 'withTests',
      type: 'boolean',
      default: true,
      description: 'Generate test files'
    },
    {
      name: 'directory',
      type: 'string',
      default: 'src/components',
      description: 'Output directory'
    },
    {
      name: 'styling',
      type: 'enum',
      values: ['css', 'scss', 'styled-components', 'none'],
      default: 'css',
      description: 'Styling approach'
    }
  ],
  examples: [
    {
      title: 'Basic functional component',
      description: 'Create a simple functional component with tests',
      parameters: {
        name: 'Button',
        type: 'functional',
        withTests: true
      }
    },
    {
      title: 'Class component with Storybook',
      description: 'Create a class component with Storybook stories',
      parameters: {
        name: 'Modal',
        type: 'class',
        withStorybook: true,
        styling: 'styled-components'
      }
    }
  ]
})
export async function createReactComponent(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { name, type, withStorybook, withTests, directory, styling } = variables
  
  logger.info(`Creating React ${type} component: ${name}`)
  
  // Convert name to PascalCase
  const componentName = name.charAt(0).toUpperCase() + name.slice(1)
  const componentDir = path.join(directory, componentName)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure component directory exists
    await utils.ensureDir(componentDir)
    
    // Generate component file
    const componentPath = path.join(componentDir, `${componentName}.tsx`)
    const componentContent = generateComponent(componentName, type, styling)
    await utils.writeFile(componentPath, componentContent)
    filesCreated.push(componentPath)
    
    // Generate index file
    const indexPath = path.join(componentDir, 'index.ts')
    const indexContent = `export { default } from './${componentName}';\nexport * from './${componentName}';\n`
    await utils.writeFile(indexPath, indexContent)
    filesCreated.push(indexPath)
    
    // Generate styles if needed
    if (styling === 'css' || styling === 'scss') {
      const styleExt = styling === 'scss' ? 'scss' : 'css'
      const stylePath = path.join(componentDir, `${componentName}.${styleExt}`)
      const styleContent = generateStyles(componentName, styling)
      await utils.writeFile(stylePath, styleContent)
      filesCreated.push(stylePath)
    }
    
    // Generate test file if requested
    if (withTests) {
      const testPath = path.join(componentDir, `${componentName}.test.tsx`)
      const testContent = generateTest(componentName, type)
      await utils.writeFile(testPath, testContent)
      filesCreated.push(testPath)
    }
    
    // Generate Storybook story if requested
    if (withStorybook) {
      const storyPath = path.join(componentDir, `${componentName}.stories.tsx`)
      const storyContent = generateStory(componentName, type)
      await utils.writeFile(storyPath, storyContent)
      filesCreated.push(storyPath)
    }
    
    logger.success(`Created React component ${componentName} with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created React ${type} component: ${componentName}`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create component: ${error.message}`)
    return {
      success: false,
      message: `Failed to create component: ${error.message}`
    }
  }
}

function generateComponent(name: string, type: string, styling: string): string {
  const hasStyles = styling === 'css' || styling === 'scss'
  const styleImport = hasStyles ? `import './${name}.${styling}';` : ''
  
  if (type === 'functional') {
    return `import React from 'react';
${styleImport}

export interface ${name}Props {
  children?: React.ReactNode;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ children, className }) => {
  return (
    <div className={\`${name.toLowerCase()}\${className ? \` \${className}\` : ''}\`}>
      {children || '${name} Component'}
    </div>
  );
};

export default ${name};
`
  } else {
    return `import React, { Component } from 'react';
${styleImport}

export interface ${name}Props {
  children?: React.ReactNode;
  className?: string;
}

export interface ${name}State {
  // Add state properties here
}

class ${name} extends Component<${name}Props, ${name}State> {
  constructor(props: ${name}Props) {
    super(props);
    this.state = {
      // Initialize state here
    };
  }

  render() {
    const { children, className } = this.props;
    
    return (
      <div className={\`${name.toLowerCase()}\${className ? \` \${className}\` : ''}\`}>
        {children || '${name} Component'}
      </div>
    );
  }
}

export default ${name};
`
  }
}

function generateStyles(name: string, styling: string): string {
  const className = name.toLowerCase()
  
  return `.${className} {
  /* Add your styles here */
  display: block;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.${className}:hover {
  border-color: #007bff;
}
`
}

function generateTest(name: string, type: string): string {
  return `import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
    expect(screen.getByText('${name} Component')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(<${name}>Custom content</${name}>);
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<${name} className="custom-class">Test</${name}>);
    const element = screen.getByText('Test');
    expect(element).toHaveClass('${name.toLowerCase()}', 'custom-class');
  });
});
`
}

function generateStory(name: string, type: string): string {
  return `import type { Meta, StoryObj } from '@storybook/react';
import ${name} from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
    },
    className: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithContent: Story = {
  args: {
    children: 'Custom ${name} content',
  },
};

export const WithClassName: Story = {
  args: {
    className: 'custom-styling',
    children: 'Styled ${name}',
  },
};
`
}