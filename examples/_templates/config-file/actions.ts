/**
 * Configuration File Generator Actions
 * 
 * Demonstrates configuration file generation for various formats and tools
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

@action({
  name: 'create-config-file',
  description: 'Generate configuration files for development tools',
  category: 'config',
  tags: ['config', 'development', 'tools'],
  parameters: [
    {
      name: 'type',
      type: 'enum',
      values: ['eslint', 'prettier', 'typescript', 'jest', 'webpack', 'vite', 'tailwind', 'package'],
      required: true,
      description: 'Type of configuration file to generate'
    },
    {
      name: 'format',
      type: 'enum',
      values: ['json', 'js', 'ts', 'yaml'],
      default: 'json',
      description: 'Configuration file format'
    },
    {
      name: 'preset',
      type: 'enum',
      values: ['basic', 'react', 'vue', 'node', 'library'],
      default: 'basic',
      description: 'Configuration preset'
    },
    {
      name: 'withComments',
      type: 'boolean',
      default: true,
      description: 'Include explanatory comments'
    },
    {
      name: 'directory',
      type: 'string',
      default: '.',
      description: 'Output directory'
    },
    {
      name: 'overwrite',
      type: 'boolean',
      default: false,
      description: 'Overwrite existing files'
    }
  ],
  examples: [
    {
      title: 'ESLint config for React',
      description: 'Generate ESLint configuration for React projects',
      parameters: {
        type: 'eslint',
        format: 'js',
        preset: 'react',
        withComments: true
      }
    },
    {
      title: 'TypeScript config for Node.js',
      description: 'Generate TypeScript configuration for Node.js projects',
      parameters: {
        type: 'typescript',
        format: 'json',
        preset: 'node',
        withComments: true
      }
    },
    {
      title: 'Complete development setup',
      description: 'Generate multiple config files for a complete setup',
      parameters: {
        type: 'package',
        preset: 'react',
        withComments: true
      }
    }
  ]
})
export async function createConfigFile(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { type, format, preset, withComments, directory, overwrite } = variables
  
  logger.info(`Creating ${type} configuration (${format}, ${preset} preset)`)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure output directory exists
    await utils.ensureDir(directory)
    
    if (type === 'package') {
      // Generate multiple configuration files
      const configTypes = ['eslint', 'prettier', 'typescript', 'jest']
      
      for (const configType of configTypes) {
        const configContent = generateConfig(configType, format, preset, withComments)
        const fileName = getConfigFileName(configType, format)
        const filePath = path.join(directory, fileName)
        
        if (!overwrite && await utils.fileExists(filePath)) {
          logger.warn(`Skipping ${fileName} - file already exists`)
          continue
        }
        
        await utils.writeFile(filePath, configContent)
        filesCreated.push(filePath)
      }
    } else {
      // Generate single configuration file
      const configContent = generateConfig(type, format, preset, withComments)
      const fileName = getConfigFileName(type, format)
      const filePath = path.join(directory, fileName)
      
      if (!overwrite && await utils.fileExists(filePath)) {
        logger.warn(`File ${fileName} already exists. Use --overwrite to replace it.`)
        return {
          success: false,
          message: `File ${fileName} already exists`
        }
      }
      
      await utils.writeFile(filePath, configContent)
      filesCreated.push(filePath)
    }
    
    logger.success(`Created ${filesCreated.length} configuration file(s)`)
    
    return {
      success: true,
      message: `Successfully created ${type} configuration`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create configuration: ${error.message}`)
    return {
      success: false,
      message: `Failed to create configuration: ${error.message}`
    }
  }
}

function getConfigFileName(type: string, format: string): string {
  const extensions = {
    json: '.json',
    js: '.js',
    ts: '.ts',
    yaml: '.yml'
  }
  
  const names = {
    eslint: '.eslintrc',
    prettier: '.prettierrc',
    typescript: 'tsconfig',
    jest: 'jest.config',
    webpack: 'webpack.config',
    vite: 'vite.config',
    tailwind: 'tailwind.config'
  }
  
  const baseName = names[type] || type
  const extension = extensions[format] || '.json'
  
  return `${baseName}${extension}`
}

function generateConfig(type: string, format: string, preset: string, withComments: boolean): string {
  const configs = {
    eslint: generateEslintConfig(format, preset, withComments),
    prettier: generatePrettierConfig(format, preset, withComments),
    typescript: generateTypescriptConfig(format, preset, withComments),
    jest: generateJestConfig(format, preset, withComments),
    webpack: generateWebpackConfig(format, preset, withComments),
    vite: generateViteConfig(format, preset, withComments),
    tailwind: generateTailwindConfig(format, preset, withComments)
  }
  
  return configs[type] || generateGenericConfig(type, format, preset, withComments)
}

function generateEslintConfig(format: string, preset: string, withComments: boolean): string {
  const baseConfig = {
    env: {
      es2021: true,
      node: true
    },
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: ['@typescript-eslint'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
  
  if (preset === 'react') {
    baseConfig.env.browser = true
    baseConfig.extends.push('plugin:react/recommended', 'plugin:react-hooks/recommended')
    baseConfig.plugins.push('react', 'react-hooks')
    baseConfig.parserOptions.ecmaFeatures = { jsx: true }
  }
  
  if (format === 'js') {
    const comments = withComments ? [
      '// ESLint configuration',
      '// See https://eslint.org/docs/user-guide/configuring',
      ''
    ].join('\n') : ''
    
    return `${comments}module.exports = ${JSON.stringify(baseConfig, null, 2)};`
  }
  
  return JSON.stringify(baseConfig, null, 2)
}

function generatePrettierConfig(format: string, preset: string, withComments: boolean): string {
  const baseConfig = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false
  }
  
  if (preset === 'react') {
    baseConfig.jsxSingleQuote = true
    baseConfig.bracketSpacing = true
  }
  
  if (format === 'js') {
    const comments = withComments ? [
      '// Prettier configuration',
      '// See https://prettier.io/docs/en/configuration.html',
      ''
    ].join('\n') : ''
    
    return `${comments}module.exports = ${JSON.stringify(baseConfig, null, 2)};`
  }
  
  return JSON.stringify(baseConfig, null, 2)
}

function generateTypescriptConfig(format: string, preset: string, withComments: boolean): string {
  const baseConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'node',
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      outDir: 'dist',
      rootDir: 'src'
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  }
  
  if (preset === 'react') {
    baseConfig.compilerOptions.jsx = 'react-jsx'
    baseConfig.compilerOptions.lib = ['DOM', 'DOM.Iterable', 'ES6']
  } else if (preset === 'node') {
    baseConfig.compilerOptions.types = ['node']
    baseConfig.compilerOptions.lib = ['ES2020']
  }
  
  if (withComments) {
    const comments = [
      '// TypeScript configuration file',
      '// See https://www.typescriptlang.org/tsconfig',
      ''
    ].join('\n')
    
    return `${comments}${JSON.stringify(baseConfig, null, 2)}`
  }
  
  return JSON.stringify(baseConfig, null, 2)
}

function generateJestConfig(format: string, preset: string, withComments: boolean): string {
  const baseConfig = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html']
  }
  
  if (preset === 'react') {
    baseConfig.testEnvironment = 'jsdom'
    baseConfig.setupFilesAfterEnv = ['<rootDir>/src/setupTests.ts']
    baseConfig.testMatch = ['**/__tests__/**/*.test.{ts,tsx}']
    baseConfig.transform['^.+\\.tsx?$'] = 'ts-jest'
  }
  
  if (format === 'js') {
    const comments = withComments ? [
      '// Jest configuration',
      '// See https://jestjs.io/docs/configuration',
      ''
    ].join('\n') : ''
    
    return `${comments}module.exports = ${JSON.stringify(baseConfig, null, 2)};`
  }
  
  return JSON.stringify(baseConfig, null, 2)
}

function generateWebpackConfig(format: string, preset: string, withComments: boolean): string {
  const config = `const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  mode: 'development',
  devtool: 'source-map'
};`
  
  const comments = withComments ? [
    '// Webpack configuration',
    '// See https://webpack.js.org/configuration/',
    ''
  ].join('\n') : ''
  
  return `${comments}${config}`
}

function generateViteConfig(format: string, preset: string, withComments: boolean): string {
  const imports = preset === 'react' ? "import react from '@vitejs/plugin-react';" : ''
  const plugins = preset === 'react' ? 'plugins: [react()],' : 'plugins: [],'
  
  const config = `${imports}
import { defineConfig } from 'vite';

export default defineConfig({
  ${plugins}
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000
  }
});`
  
  const comments = withComments ? [
    '// Vite configuration',
    '// See https://vitejs.dev/config/',
    ''
  ].join('\n') : ''
  
  return `${comments}${config}`
}

function generateTailwindConfig(format: string, preset: string, withComments: boolean): string {
  const config = `module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};`
  
  const comments = withComments ? [
    '// Tailwind CSS configuration',
    '// See https://tailwindcss.com/docs/configuration',
    ''
  ].join('\n') : ''
  
  return `${comments}${config}`
}

function generateGenericConfig(type: string, format: string, preset: string, withComments: boolean): string {
  const config = {
    type: type,
    preset: preset,
    version: '1.0.0'
  }
  
  if (format === 'js') {
    const comments = withComments ? `// ${type} configuration\n` : ''
    return `${comments}module.exports = ${JSON.stringify(config, null, 2)};`
  }
  
  return JSON.stringify(config, null, 2)
}