import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import os from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIXTURES_ROOT = path.join(__dirname, '..', 'fixtures')

export interface FixtureOptions {
  /** Read the file content instead of returning the path */
  read?: boolean
  /** Parse JSON files automatically */
  json?: boolean
  /** Base directory within fixtures (e.g., 'templates', 'params') */
  base?: string
}

/**
 * Resolves a fixture path or loads fixture content
 * @param name - The fixture name or path relative to fixtures directory
 * @param options - Options for loading the fixture
 * @returns The fixture path or content
 */
export function fixture(name: string, options: FixtureOptions = {}): any {
  const { read = false, json = false, base } = options
  
  // Build the full path
  const parts = [FIXTURES_ROOT]
  if (base) {
    parts.push(base)
  }
  parts.push(...name.split('/'))
  
  const fullPath = path.join(...parts)
  
  if (!read) {
    return fullPath
  }
  
  // Read the file content
  const content = fs.readFileSync(fullPath, 'utf-8')
  
  if (json) {
    return JSON.parse(content)
  }
  
  return content
}

/**
 * Helper to get fixture path for a specific base directory
 */
export const fixtureFor = (base: string) => (name: string, options?: Omit<FixtureOptions, 'base'>) => 
  fixture(name, { ...options, base })

// Pre-configured fixture helpers for common directories
export const templateFixture = fixtureFor('templates')
export const paramsFixture = fixtureFor('params')
export const appFixture = fixtureFor('app')

/**
 * Check if a fixture exists
 */
export function fixtureExists(name: string, options: Omit<FixtureOptions, 'read' | 'json'> = {}): boolean {
  try {
    const fixturePath = fixture(name, { ...options, read: false })
    return fs.existsSync(fixturePath)
  } catch {
    return false
  }
}

/**
 * List all fixtures in a directory
 */
export function listFixtures(dir: string = '', options: Pick<FixtureOptions, 'base'> = {}): string[] {
  const fixturePath = fixture(dir, { ...options, read: false })
  if (!fs.existsSync(fixturePath) || !fs.statSync(fixturePath).isDirectory()) {
    return []
  }
  return fs.readdirSync(fixturePath)
}

/**
 * Create a temporary directory with test fixtures
 * @param setup - Function to set up the temporary fixtures
 * @returns Path to the temporary directory and cleanup function
 */
export async function withTempFixtures(
  setup: (tempDir: string) => void | Promise<void>
): Promise<{ path: string; cleanup: () => void }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hypergen-test-'))
  
  try {
    await setup(tempDir)
  } catch (error) {
    // Clean up on setup error
    await fs.remove(tempDir)
    throw error
  }
  
  return {
    path: tempDir,
    cleanup: () => fs.removeSync(tempDir)
  }
}

/**
 * Copy a fixture to a destination
 */
export async function copyFixture(
  fixtureName: string, 
  destination: string, 
  options: Omit<FixtureOptions, 'read' | 'json'> = {}
): Promise<void> {
  const source = fixture(fixtureName, { ...options, read: false })
  await fs.copy(source, destination)
}