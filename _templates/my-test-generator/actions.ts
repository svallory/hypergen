/**
 * MyTestGenerator Generator Actions
 * 
 * Test generator for React components
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'


@action({
  name: 'my-test-generator',
  description: 'Test generator for React components',
  category: 'custom',
  tags: ['custom', 'react'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'MyTestGenerator name',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$'
    },
    {
      name: 'type',
      type: 'enum',
      
      default: "functional",
      description: 'Component type',
      values: ["functional","class"]
    },
    {
      name: 'withProps',
      type: 'boolean',
      
      default: true,
      description: 'Include props interface'
    },
    {
      name: 'withStorybook',
      type: 'boolean',
      
      default: false,
      description: 'Generate Storybook stories'
    },
    {
      name: 'styling',
      type: 'enum',
      
      default: "css",
      description: 'Styling approach',
      values: ["css","scss","styled-components"]
    }
  ],
  examples: [
    {
      title: 'Basic my-test-generator',
      description: 'Create a basic my-test-generator',
      parameters: {
        name: 'example-my-test-generator',
        type: "functional",
        withProps: true,
        withStorybook: false,
        styling: "css"
      }
    }
  ]
})
export async function myTestGenerator(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { name, type, withProps, withStorybook, styling } = variables
  
  logger.info(`Creating my-test-generator: ${name}`)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'src', 'my-test-generators')
    await utils.ensureDir(outputDir)
    
    // Generate main file
    const mainFile = path.join(outputDir, `${name}.ts`)
    const mainContent = generateMyTestGenerator(name, variables)
    await utils.writeFile(mainFile, mainContent)
    filesCreated.push(mainFile)
    
    // Generate test file
    const testFile = path.join(outputDir, `${name}.test.ts`)
    const testContent = generateMyTestGeneratorTest(name, variables)
    await utils.writeFile(testFile, testContent)
    filesCreated.push(testFile)
    
    logger.success(`Created my-test-generator ${name} with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created my-test-generator: ${name}`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create my-test-generator: ${error.message}`)
    return {
      success: false,
      message: `Failed to create my-test-generator: ${error.message}`
    }
  }
}

function generateMyTestGenerator(name: string, variables: any): string {
  return `// Generated my-test-generator: ${name}
export const ${name} = {
  // Add your implementation here
};
`
}

function generateMyTestGeneratorTest(name: string, variables: any): string {
  return `import { ${name} } from './my-test-generator';

describe('${name}', () => {
  it('should be defined', () => {
    expect(${name}).toBeDefined();
  });
});
`
}
