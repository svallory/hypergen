/**
 * CLI Tool Generator Actions
 * 
 * Demonstrates CLI application generation with command parsing and help system
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

@action({
  name: 'create-cli-tool',
  description: 'Generate a CLI tool with TypeScript and Commander.js',
  category: 'cli',
  tags: ['cli', 'typescript', 'commander', 'node'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'CLI tool name (kebab-case recommended)',
      pattern: '^[a-z][a-z0-9-]*$'
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      description: 'CLI tool description'
    },
    {
      name: 'commands',
      type: 'array',
      default: ['init', 'build', 'deploy'],
      description: 'Commands to generate'
    },
    {
      name: 'withConfig',
      type: 'boolean',
      default: true,
      description: 'Include configuration file support'
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
      default: 'src',
      description: 'Output directory'
    },
    {
      name: 'packageManager',
      type: 'enum',
      values: ['npm', 'yarn', 'pnpm', 'bun'],
      default: 'npm',
      description: 'Package manager'
    }
  ],
  examples: [
    {
      title: 'Development CLI tool',
      description: 'Create a development CLI with common commands',
      parameters: {
        name: 'dev-cli',
        description: 'Development CLI tool',
        commands: ['init', 'build', 'test', 'deploy'],
        withConfig: true
      }
    },
    {
      title: 'Simple utility CLI',
      description: 'Create a simple utility CLI',
      parameters: {
        name: 'file-utils',
        description: 'File utility CLI',
        commands: ['convert', 'compress', 'validate'],
        withConfig: false
      }
    }
  ]
})
export async function createCliTool(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { name, description, commands, withConfig, withTests, directory, packageManager } = variables
  
  logger.info(`Creating CLI tool: ${name}`)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure output directory exists
    await utils.ensureDir(directory)
    
    // Generate main CLI entry point
    const cliPath = path.join(directory, 'cli.ts')
    const cliContent = generateCliMain(name, description, commands, withConfig)
    await utils.writeFile(cliPath, cliContent)
    filesCreated.push(cliPath)
    
    // Generate commands directory
    const commandsDir = path.join(directory, 'commands')
    await utils.ensureDir(commandsDir)
    
    // Generate individual command files
    for (const command of commands) {
      const commandPath = path.join(commandsDir, `${command}.ts`)
      const commandContent = generateCommand(command, name)
      await utils.writeFile(commandPath, commandContent)
      filesCreated.push(commandPath)
    }
    
    // Generate utils
    const utilsDir = path.join(directory, 'utils')
    await utils.ensureDir(utilsDir)
    
    const loggerPath = path.join(utilsDir, 'logger.ts')
    const loggerContent = generateLogger()
    await utils.writeFile(loggerPath, loggerContent)
    filesCreated.push(loggerPath)
    
    // Generate config support if requested
    if (withConfig) {
      const configPath = path.join(utilsDir, 'config.ts')
      const configContent = generateConfig(name)
      await utils.writeFile(configPath, configContent)
      filesCreated.push(configPath)
    }
    
    // Generate package.json
    const packagePath = path.join(directory, '../package.json')
    const packageContent = generatePackageJson(name, description, packageManager)
    await utils.writeFile(packagePath, packageContent)
    filesCreated.push(packagePath)
    
    // Generate tests if requested
    if (withTests) {
      const testDir = path.join(directory, '__tests__')
      await utils.ensureDir(testDir)
      
      const testPath = path.join(testDir, 'cli.test.ts')
      const testContent = generateCliTest(name, commands)
      await utils.writeFile(testPath, testContent)
      filesCreated.push(testPath)
    }
    
    // Generate README
    const readmePath = path.join(directory, '../README.md')
    const readmeContent = generateReadme(name, description, commands)
    await utils.writeFile(readmePath, readmeContent)
    filesCreated.push(readmePath)
    
    logger.success(`Created CLI tool ${name} with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created CLI tool: ${name}`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create CLI tool: ${error.message}`)
    return {
      success: false,
      message: `Failed to create CLI tool: ${error.message}`
    }
  }
}

function generateCliMain(name: string, description: string, commands: string[], withConfig: boolean): string {
  const imports = [
    `import { Command } from 'commander';`,
    `import { logger } from './utils/logger';`
  ]
  
  if (withConfig) {
    imports.push(`import { loadConfig } from './utils/config';`)
  }
  
  const commandImports = commands.map(cmd => 
    `import { ${cmd}Command } from './commands/${cmd}';`
  ).join('\n')
  
  const commandSetup = commands.map(cmd => 
    `program.addCommand(${cmd}Command);`
  ).join('\n')
  
  return `#!/usr/bin/env node
${imports.join('\n')}
${commandImports}

const program = new Command();

program
  .name('${name}')
  .description('${description}')
  .version('1.0.0');

${commandSetup}

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
`
}

function generateCommand(commandName: string, cliName: string): string {
  const capitalizedName = commandName.charAt(0).toUpperCase() + commandName.slice(1)
  
  return `import { Command } from 'commander';
import { logger } from '../utils/logger';

export const ${commandName}Command = new Command('${commandName}')
  .description('${capitalizedName} command for ${cliName}')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-d, --dry-run', 'Show what would be done without executing')
  .action(async (options) => {
    try {
      logger.info(\`Running ${commandName} command\`);
      
      if (options.verbose) {
        logger.debug('Verbose mode enabled');
      }
      
      if (options.dryRun) {
        logger.info('Dry run mode - no changes will be made');
      }
      
      // TODO: Implement ${commandName} logic here
      await execute${capitalizedName}(options);
      
      logger.success(\`${capitalizedName} completed successfully\`);
    } catch (error: any) {
      logger.error(\`${capitalizedName} failed:\`, error.message);
      process.exit(1);
    }
  });

async function execute${capitalizedName}(options: any): Promise<void> {
  // Implement your ${commandName} logic here
  logger.info(\`Executing ${commandName} with options:\`, options);
  
  // Example implementation
  if (options.dryRun) {
    logger.info('Would execute ${commandName} operations');
    return;
  }
  
  // Add your actual implementation here
  logger.info('${capitalizedName} operation completed');
}
`
}

function generateLogger(): string {
  return `import chalk from 'chalk';

export interface Logger {
  info(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green('✓'), message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red('✗'), message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }
}

export const logger = new ConsoleLogger();
`
}

function generateConfig(name: string): string {
  return `import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface Config {
  [key: string]: any;
}

const CONFIG_FILES = [
  \`\${name}.config.js\`,
  \`\${name}.config.json\`,
  \`.\${name}rc\`,
  \`.\${name}rc.json\`,
  \`.\${name}rc.js\`
];

export function loadConfig(cwd: string = process.cwd()): Config {
  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(cwd, configFile);
    
    if (fs.existsSync(configPath)) {
      try {
        logger.debug(\`Loading config from: \${configPath}\`);
        
        if (configFile.endsWith('.js')) {
          // Clear require cache to ensure fresh load
          delete require.cache[require.resolve(configPath)];
          return require(configPath);
        } else {
          const content = fs.readFileSync(configPath, 'utf-8');
          return JSON.parse(content);
        }
      } catch (error: any) {
        logger.warn(\`Failed to load config from \${configPath}: \${error.message}\`);
      }
    }
  }
  
  logger.debug('No config file found, using defaults');
  return {};
}

export function saveConfig(config: Config, cwd: string = process.cwd()): void {
  const configPath = path.join(cwd, \`\${name}.config.json\`);
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.success(\`Config saved to: \${configPath}\`);
  } catch (error: any) {
    logger.error(\`Failed to save config: \${error.message}\`);
    throw error;
  }
}
`
}

function generatePackageJson(name: string, description: string, packageManager: string): string {
  return `{
  "name": "${name}",
  "version": "1.0.0",
  "description": "${description}",
  "main": "dist/cli.js",
  "bin": {
    "${name}": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix"
  },
  "keywords": ["cli", "typescript", "commander"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "${packageManager}@latest"
}
`
}

function generateCliTest(name: string, commands: string[]): string {
  return `import { execSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.join(__dirname, '../cli.ts');

describe('${name} CLI', () => {
  it('should show help when no arguments provided', () => {
    const result = execSync(\`tsx \${CLI_PATH} --help\`, { encoding: 'utf-8' });
    expect(result).toContain('${name}');
  });

  it('should show version', () => {
    const result = execSync(\`tsx \${CLI_PATH} --version\`, { encoding: 'utf-8' });
    expect(result).toContain('1.0.0');
  });

  ${commands.map(cmd => `
  describe('${cmd} command', () => {
    it('should show help for ${cmd} command', () => {
      const result = execSync(\`tsx \${CLI_PATH} ${cmd} --help\`, { encoding: 'utf-8' });
      expect(result).toContain('${cmd}');
    });

    it('should run ${cmd} command in dry-run mode', () => {
      const result = execSync(\`tsx \${CLI_PATH} ${cmd} --dry-run\`, { encoding: 'utf-8' });
      expect(result).toContain('dry run');
    });
  });
  `).join('\n')}
});
`
}

function generateReadme(name: string, description: string, commands: string[]): string {
  return `# ${name}

${description}

## Installation

\`\`\`bash
npm install -g ${name}
\`\`\`

## Usage

\`\`\`bash
${name} [command] [options]
\`\`\`

## Commands

${commands.map(cmd => `
### \`${cmd}\`

Description of the ${cmd} command.

\`\`\`bash
${name} ${cmd} [options]
\`\`\`

Options:
- \`-v, --verbose\` - Enable verbose logging
- \`-d, --dry-run\` - Show what would be done without executing
`).join('\n')}

## Configuration

The CLI looks for configuration files in the following order:

1. \`${name}.config.js\`
2. \`${name}.config.json\`
3. \`.${name}rc\`
4. \`.${name}rc.json\`
5. \`.${name}rc.js\`

Example configuration:

\`\`\`json
{
  "verbose": true,
  "defaultCommand": "build"
}
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## License

MIT
`
}