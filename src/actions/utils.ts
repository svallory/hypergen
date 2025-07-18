/**
 * Action Utilities
 * 
 * Utilities and helpers for action implementations
 */

import fs from 'fs-extra'
import path from 'path'
import { glob } from 'glob'
import execa from 'execa'
import createDebug from 'debug'
import type { ActionUtils, ActionLogger } from './types.js'

const debug = createDebug('hypergen:v8:action:utils')

export class DefaultActionUtils implements ActionUtils {
  
  async readFile(filePath: string): Promise<string> {
    debug('Reading file: %s', filePath)
    return await fs.readFile(filePath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    debug('Writing file: %s', filePath)
    await fs.ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, content, 'utf-8')
  }

  async deleteFile(filePath: string): Promise<void> {
    debug('Deleting file: %s', filePath)
    await fs.remove(filePath)
  }

  async ensureDir(dirPath: string): Promise<void> {
    debug('Ensuring directory: %s', dirPath)
    await fs.ensureDir(dirPath)
  }

  async copyFile(src: string, dest: string): Promise<void> {
    debug('Copying file: %s -> %s', src, dest)
    await fs.ensureDir(path.dirname(dest))
    await fs.copy(src, dest)
  }

  async pathExists(checkPath: string): Promise<boolean> {
    return await fs.pathExists(checkPath)
  }

  async glob(pattern: string, options: { cwd?: string } = {}): Promise<string[]> {
    debug('Globbing pattern: %s (cwd: %s)', pattern, options.cwd || process.cwd())
    return await glob(pattern, {
      cwd: options.cwd || process.cwd(),
      absolute: false
    })
  }

  async installPackages(
    packages: string[], 
    options: { dev?: boolean } = {}
  ): Promise<void> {
    debug('Installing packages: %s (dev: %s)', packages.join(', '), options.dev || false)
    
    // Detect package manager
    const packageManager = await this.detectPackageManager()
    
    let args: string[]
    switch (packageManager) {
      case 'bun':
        args = ['add']
        if (options.dev) args.push('--dev')
        args.push(...packages)
        break
      
      case 'yarn':
        args = ['add']
        if (options.dev) args.push('--dev')
        args.push(...packages)
        break
      
      case 'pnpm':
        args = ['add']
        if (options.dev) args.push('--save-dev')
        args.push(...packages)
        break
      
      default: // npm
        args = ['install']
        if (options.dev) args.push('--save-dev')
        args.push(...packages)
        break
    }

    await this.runCommand(`${packageManager} ${args.join(' ')}`)
  }

  async runCommand(
    command: string, 
    options: { cwd?: string } = {}
  ): Promise<string> {
    debug('Running command: %s (cwd: %s)', command, options.cwd || process.cwd())
    
    try {
      const result = await execa(command, {
        shell: true,
        cwd: options.cwd || process.cwd()
      })
      
      return result.stdout
    } catch (error: any) {
      throw new Error(`Command failed: ${command}\n${error.message}`)
    }
  }

  private async detectPackageManager(): Promise<string> {
    const cwd = process.cwd()
    
    // Check for lock files to determine package manager
    if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) {
      return 'bun'
    }
    
    if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) {
      return 'yarn'
    }
    
    if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
      return 'pnpm'
    }
    
    return 'npm'
  }
}

export class ConsoleActionLogger implements ActionLogger {
  
  success(message: string): void {
    console.log(`✅ ${message}`)
  }

  info(message: string): void {
    console.log(`ℹ️  ${message}`)
  }

  warn(message: string): void {
    console.warn(`⚠️  ${message}`)
  }

  error(message: string): void {
    console.error(`❌ ${message}`)
  }
}

/**
 * Silent logger for testing or when output should be suppressed
 */
export class SilentActionLogger implements ActionLogger {
  success(message: string): void {
    // Silent
  }

  info(message: string): void {
    // Silent
  }

  warn(message: string): void {
    // Silent
  }

  error(message: string): void {
    // Silent
  }
}