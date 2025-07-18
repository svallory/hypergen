/**
 * Test Suite Generator Actions
 * 
 * Demonstrates test suite generation with various testing frameworks
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

@action({
  name: 'create-test-suite',
  description: 'Generate comprehensive test suites with various frameworks',
  category: 'testing',
  tags: ['testing', 'jest', 'vitest', 'cypress', 'playwright'],
  parameters: [
    {
      name: 'framework',
      type: 'enum',
      values: ['jest', 'vitest', 'cypress', 'playwright', 'mocha'],
      required: true,
      description: 'Testing framework to use'
    },
    {
      name: 'testType',
      type: 'enum',
      values: ['unit', 'integration', 'e2e', 'all'],
      default: 'unit',
      description: 'Type of tests to generate'
    },
    {
      name: 'targetFile',
      type: 'string',
      description: 'Target file to test (optional)'
    },
    {
      name: 'withCoverage',
      type: 'boolean',
      default: true,
      description: 'Include coverage configuration'
    },
    {
      name: 'withMocks',
      type: 'boolean',
      default: true,
      description: 'Include mock examples'
    },
    {
      name: 'withFixtures',
      type: 'boolean',
      default: true,
      description: 'Generate test fixtures'
    },
    {
      name: 'directory',
      type: 'string',
      default: 'tests',
      description: 'Test directory'
    },
    {
      name: 'language',
      type: 'enum',
      values: ['javascript', 'typescript'],
      default: 'typescript',
      description: 'Language for test files'
    }
  ],
  examples: [
    {
      title: 'Jest unit tests',
      description: 'Generate Jest unit tests with mocks and coverage',
      parameters: {
        framework: 'jest',
        testType: 'unit',
        withCoverage: true,
        withMocks: true,
        language: 'typescript'
      }
    },
    {
      title: 'Cypress E2E tests',
      description: 'Generate Cypress end-to-end tests',
      parameters: {
        framework: 'cypress',
        testType: 'e2e',
        withFixtures: true,
        language: 'typescript'
      }
    },
    {
      title: 'Complete test suite',
      description: 'Generate all types of tests with multiple frameworks',
      parameters: {
        framework: 'jest',
        testType: 'all',
        withCoverage: true,
        withMocks: true,
        withFixtures: true
      }
    }
  ]
})
export async function createTestSuite(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { framework, testType, targetFile, withCoverage, withMocks, withFixtures, directory, language } = variables
  
  logger.info(`Creating ${framework} test suite (${testType} tests)`)
  
  const filesCreated: string[] = []
  const extension = language === 'typescript' ? 'ts' : 'js'
  
  try {
    // Ensure test directory exists
    await utils.ensureDir(directory)
    
    // Generate test configuration
    const configPath = path.join(directory, `../jest.config.${extension}`)
    const configContent = generateTestConfig(framework, withCoverage, language)
    await utils.writeFile(configPath, configContent)
    filesCreated.push(configPath)
    
    // Generate setup file
    const setupPath = path.join(directory, `setup.${extension}`)
    const setupContent = generateSetupFile(framework, language)
    await utils.writeFile(setupPath, setupContent)
    filesCreated.push(setupPath)
    
    // Generate test utilities
    const utilsDir = path.join(directory, 'utils')
    await utils.ensureDir(utilsDir)
    
    const utilsPath = path.join(utilsDir, `testUtils.${extension}`)
    const utilsContent = generateTestUtils(framework, language)
    await utils.writeFile(utilsPath, utilsContent)
    filesCreated.push(utilsPath)
    
    // Generate fixtures if requested
    if (withFixtures) {
      const fixturesDir = path.join(directory, 'fixtures')
      await utils.ensureDir(fixturesDir)
      
      const fixturesPath = path.join(fixturesDir, `sampleData.${extension}`)
      const fixturesContent = generateFixtures(language)
      await utils.writeFile(fixturesPath, fixturesContent)
      filesCreated.push(fixturesPath)
    }
    
    // Generate mocks if requested
    if (withMocks) {
      const mocksDir = path.join(directory, '__mocks__')
      await utils.ensureDir(mocksDir)
      
      const mocksPath = path.join(mocksDir, `exampleMock.${extension}`)
      const mocksContent = generateMocks(framework, language)
      await utils.writeFile(mocksPath, mocksContent)
      filesCreated.push(mocksPath)
    }
    
    // Generate test files based on test type
    if (testType === 'unit' || testType === 'all') {
      const unitTestPath = path.join(directory, 'unit', `example.unit.test.${extension}`)
      await utils.ensureDir(path.dirname(unitTestPath))
      const unitTestContent = generateUnitTest(framework, targetFile, language)
      await utils.writeFile(unitTestPath, unitTestContent)
      filesCreated.push(unitTestPath)
    }
    
    if (testType === 'integration' || testType === 'all') {
      const integrationTestPath = path.join(directory, 'integration', `example.integration.test.${extension}`)
      await utils.ensureDir(path.dirname(integrationTestPath))
      const integrationTestContent = generateIntegrationTest(framework, language)
      await utils.writeFile(integrationTestPath, integrationTestContent)
      filesCreated.push(integrationTestPath)
    }
    
    if (testType === 'e2e' || testType === 'all') {
      const e2eTestPath = path.join(directory, 'e2e', `example.e2e.test.${extension}`)
      await utils.ensureDir(path.dirname(e2eTestPath))
      const e2eTestContent = generateE2ETest(framework, language)
      await utils.writeFile(e2eTestPath, e2eTestContent)
      filesCreated.push(e2eTestPath)
    }
    
    // Generate package.json scripts
    const packageScriptsPath = path.join(directory, '../package-scripts.json')
    const packageScriptsContent = generatePackageScripts(framework, testType, withCoverage)
    await utils.writeFile(packageScriptsPath, packageScriptsContent)
    filesCreated.push(packageScriptsPath)
    
    logger.success(`Created ${framework} test suite with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created ${framework} test suite`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create test suite: ${error.message}`)
    return {
      success: false,
      message: `Failed to create test suite: ${error.message}`
    }
  }
}

function generateTestConfig(framework: string, withCoverage: boolean, language: string): string {
  if (framework === 'jest') {
    const config = {
      preset: language === 'typescript' ? 'ts-jest' : undefined,
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: ['**/__tests__/**/*.test.{js,ts}', '**/?(*.)+(spec|test).{js,ts}'],
      transform: language === 'typescript' ? {
        '^.+\\.ts$': 'ts-jest'
      } : undefined,
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      collectCoverageFrom: withCoverage ? [
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!src/index.ts'
      ] : undefined,
      coverageDirectory: withCoverage ? 'coverage' : undefined,
      coverageReporters: withCoverage ? ['text', 'lcov', 'html'] : undefined,
      coverageThreshold: withCoverage ? {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      } : undefined
    }
    
    return `module.exports = ${JSON.stringify(config, null, 2)};`
  }
  
  if (framework === 'vitest') {
    return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}'
      ]
    }
  }
});`
  }
  
  return `// ${framework} configuration\nmodule.exports = {};`
}

function generateSetupFile(framework: string, language: string): string {
  if (framework === 'jest') {
    return `${language === 'typescript' ? "import '@testing-library/jest-dom';" : "require('@testing-library/jest-dom');"}

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test environment
process.env.NODE_ENV = 'test';
`
  }
  
  return `// ${framework} setup file
// Add global setup code here
`
}

function generateTestUtils(framework: string, language: string): string {
  const tsTypes = language === 'typescript' ? `
export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export interface TestConfig {
  apiUrl: string;
  timeout: number;
}
` : ''
  
  return `${tsTypes}
// Test utilities and helpers
export const createTestUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

export const delay = (ms${language === 'typescript' ? ': number' : ''}) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data${language === 'typescript' ? ': any' : ''}, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

export const expectToHaveBeenCalledOnce = (mockFn${language === 'typescript' ? ': jest.Mock' : ''}) => {
  expect(mockFn).toHaveBeenCalledTimes(1);
};

export const expectToHaveBeenCalledWith = (mockFn${language === 'typescript' ? ': jest.Mock' : ''}, ...args${language === 'typescript' ? ': any[]' : ''}) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

// Common test data
export const testData = {
  users: [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
  ],
  config: {
    apiUrl: 'http://localhost:3000',
    timeout: 5000
  }
};
`
}

function generateFixtures(language: string): string {
  const tsTypes = language === 'typescript' ? `
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}
` : ''
  
  return `${tsTypes}
// Test fixtures and sample data
export const sampleUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    createdAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
    createdAt: '2023-01-02T00:00:00Z'
  }
];

export const sampleProducts = [
  {
    id: '1',
    name: 'Widget A',
    price: 29.99,
    category: 'Electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Widget B',
    price: 39.99,
    category: 'Electronics',
    inStock: false
  }
];

export const sampleApiResponses = {
  success: {
    status: 200,
    data: { message: 'Success' }
  },
  error: {
    status: 500,
    error: { message: 'Internal Server Error' }
  },
  notFound: {
    status: 404,
    error: { message: 'Resource not found' }
  }
};
`
}

function generateMocks(framework: string, language: string): string {
  return `// Mock implementations for external dependencies

// Mock API client
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
};

// Mock database
export const mockDatabase = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// Mock logger
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock file system
export const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
  rmdir: jest.fn()
};

// Mock external services
export const mockEmailService = {
  sendEmail: jest.fn(),
  validateEmail: jest.fn()
};

export const mockPaymentService = {
  processPayment: jest.fn(),
  refundPayment: jest.fn(),
  validateCard: jest.fn()
};
`
}

function generateUnitTest(framework: string, targetFile: string, language: string): string {
  const imports = language === 'typescript' ? 
    `import { createTestUser, expectToHaveBeenCalledOnce } from '../utils/testUtils';` :
    `const { createTestUser, expectToHaveBeenCalledOnce } = require('../utils/testUtils');`
  
  return `${imports}
${targetFile ? `// Testing ${targetFile}` : '// Unit test example'}

describe('Unit Tests', () => {
  describe('Example Function', () => {
    beforeEach(() => {
      // Setup for each test
      jest.clearAllMocks();
    });

    it('should return correct value', () => {
      // Arrange
      const input = 'test';
      const expected = 'TEST';

      // Act
      const result = input.toUpperCase();

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle edge cases', () => {
      // Test null/undefined
      expect(() => {
        // @ts-ignore
        null.toUpperCase();
      }).toThrow();

      // Test empty string
      expect(''.toUpperCase()).toBe('');
    });

    it('should work with test utilities', () => {
      const user = createTestUser({ name: 'Test User' });
      
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Mock Testing', () => {
    it('should verify mock calls', () => {
      const mockFn = jest.fn();
      mockFn('test');
      
      expectToHaveBeenCalledOnce(mockFn);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should test async functions', async () => {
      const mockAsyncFn = jest.fn().mockResolvedValue('success');
      
      const result = await mockAsyncFn();
      
      expect(result).toBe('success');
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    });
  });
});
`
}

function generateIntegrationTest(framework: string, language: string): string {
  return `// Integration test example

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database, server, etc.
    console.log('Setting up integration test environment');
  });

  afterAll(async () => {
    // Cleanup test environment
    console.log('Cleaning up integration test environment');
  });

  describe('API Integration', () => {
    it('should handle full request/response cycle', async () => {
      // This would test actual API calls
      const response = await fetch('/api/users');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle error responses', async () => {
      const response = await fetch('/api/nonexistent');
      
      expect(response.status).toBe(404);
    });
  });

  describe('Database Integration', () => {
    it('should persist data correctly', async () => {
      // Test database operations
      const user = { name: 'Test User', email: 'test@example.com' };
      
      // Create user
      const createResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      expect(createResponse.status).toBe(201);
      const createdUser = await createResponse.json();
      
      // Verify user was created
      const getResponse = await fetch(\`/api/users/\${createdUser.id}\`);
      expect(getResponse.status).toBe(200);
      
      const retrievedUser = await getResponse.json();
      expect(retrievedUser.name).toBe(user.name);
    });
  });
});
`
}

function generateE2ETest(framework: string, language: string): string {
  if (framework === 'cypress') {
    return `// Cypress E2E test example

describe('E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display homepage', () => {
    cy.contains('Welcome');
    cy.get('[data-testid="homepage"]').should('be.visible');
  });

  it('should navigate to login page', () => {
    cy.get('[data-testid="login-link"]').click();
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
  });

  it('should login user', () => {
    cy.get('[data-testid="login-link"]').click();
    
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard').should('be.visible');
  });

  it('should handle form validation', () => {
    cy.get('[data-testid="contact-form"]').within(() => {
      cy.get('[data-testid="submit-button"]').click();
      cy.contains('Email is required').should('be.visible');
      cy.contains('Message is required').should('be.visible');
    });
  });
});
`
  }
  
  if (framework === 'playwright') {
    return `import { test, expect } from '@playwright/test';

test.describe('E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('[data-testid="homepage"]')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should login user', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should handle form validation', async ({ page }) => {
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Message is required')).toBeVisible();
  });
});
`
  }
  
  return `// E2E test example for ${framework}

describe('E2E Tests', () => {
  it('should test end-to-end functionality', async () => {
    // Add E2E test implementation here
    console.log('Running E2E test');
  });
});
`
}

function generatePackageScripts(framework: string, testType: string, withCoverage: boolean): string {
  const scripts = {
    "test": `${framework}`,
    "test:watch": `${framework} --watch`,
    "test:unit": `${framework} tests/unit`,
    "test:integration": `${framework} tests/integration`,
    "test:e2e": framework === 'cypress' ? 'cypress run' : framework === 'playwright' ? 'playwright test' : `${framework} tests/e2e`
  }
  
  if (withCoverage) {
    scripts["test:coverage"] = `${framework} --coverage`
    scripts["test:coverage:watch"] = `${framework} --coverage --watch`
  }
  
  return `{
  "scripts": ${JSON.stringify(scripts, null, 4)}
}
`
}