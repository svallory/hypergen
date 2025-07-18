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
  
  fileExists(filePath: string): boolean {
    debug('Checking file exists: %s', filePath)
    return fs.existsSync(filePath)
  }

  readFile(filePath: string): string {
    debug('Reading file: %s', filePath)
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeFile(filePath: string, content: string): void {
    debug('Writing file: %s', filePath)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  createDirectory(dirPath: string): void {
    debug('Creating directory: %s', dirPath)
    fs.ensureDirSync(dirPath)
  }

  copyFile(src: string, dest: string): void {
    debug('Copying file: %s -> %s', src, dest)
    fs.ensureDirSync(path.dirname(dest))
    fs.copySync(src, dest)
  }

  deleteFile(filePath: string): void {
    debug('Deleting file: %s', filePath)
    fs.removeSync(filePath)
  }

  globFiles(pattern: string, options: { cwd?: string } = {}): string[] {
    debug('Globbing pattern: %s (cwd: %s)', pattern, options.cwd || process.cwd())
    return glob.sync(pattern, {
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
  
  info(message: string): void {
    console.log(`ℹ️  ${message}`)
  }

  warn(message: string): void {
    console.warn(`⚠️  ${message}`)
  }

  error(message: string): void {
    console.error(`❌ ${message}`)
  }

  debug(message: string): void {
    console.log(`🐛 ${message}`)
  }

  trace(message: string): void {
    console.log(`🔍 ${message}`)
  }
}

/**
 * Silent logger for testing or when output should be suppressed
 */
export class SilentActionLogger implements ActionLogger {
  info(message: string): void {
    // Silent
  }

  warn(message: string): void {
    // Silent
  }

  error(message: string): void {
    // Silent
  }

  debug(message: string): void {
    // Silent
  }

  trace(message: string): void {
    // Silent
  }
}