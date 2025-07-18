/**
 * Local File Resolver
 * 
 * Resolves local template references (relative and absolute paths)
 */

import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import createDebug from 'debug'
import type {
  TemplateURLResolver,
  ResolvedTemplate
} from '../types.js'
import { URLResolutionError } from '../types.js'

const debug = createDebug('hypergen:v8:resolver:local')

export class LocalResolver implements TemplateURLResolver {
  supports(url: string): boolean {
    // Local paths: ./relative, ../relative, /absolute, or plain relative paths
    return !url.includes(':') || url.startsWith('file://')
  }

  async resolve(url: string, basePath?: string): Promise<ResolvedTemplate> {
    debug('Resolving local template: %s from %s', url, basePath)
    
    try {
      // Handle file:// URLs
      if (url.startsWith('file://')) {
        url = url.replace('file://', '')
      }
      
      // Resolve path relative to basePath if provided
      let templatePath: string
      if (path.isAbsolute(url)) {
        templatePath = url
      } else if (basePath) {
        templatePath = path.resolve(basePath, url)
      } else {
        templatePath = path.resolve(process.cwd(), url)
      }
      
      // Ensure we're looking for template.yml
      const configPath = await this.findTemplateConfig(templatePath)
      
      if (!await fs.pathExists(configPath)) {
        throw new URLResolutionError(
          `Template configuration not found: ${configPath}`,
          url,
          'local'
        )
      }
      
      // Read template configuration
      const content = await fs.readFile(configPath, 'utf-8')
      const templateDir = path.dirname(configPath)
      
      // Calculate checksum for integrity
      const checksum = crypto.createHash('sha256').update(content).digest('hex')
      
      debug('Resolved local template at %s', configPath)
      
      return {
        content,
        basePath: templateDir,
        metadata: {
          url,
          type: 'local',
          lastFetched: new Date(),
          checksum
        }
      }
    } catch (error) {
      if (error instanceof URLResolutionError) {
        throw error
      }
      
      throw new URLResolutionError(
        `Failed to resolve local template: ${error.message}`,
        url,
        'local',
        error
      )
    }
  }

  private async findTemplateConfig(templatePath: string): Promise<string> {
    // Check if templatePath points directly to template.yml
    if (templatePath.endsWith('template.yml') || templatePath.endsWith('template.yaml')) {
      return templatePath
    }
    
    // Check if templatePath is a directory containing template.yml
    const stat = await fs.stat(templatePath).catch(() => null)
    if (stat?.isDirectory()) {
      const ymlPath = path.join(templatePath, 'template.yml')
      const yamlPath = path.join(templatePath, 'template.yaml')
      
      if (await fs.pathExists(ymlPath)) {
        return ymlPath
      } else if (await fs.pathExists(yamlPath)) {
        return yamlPath
      }
    }
    
    // Assume it's a template directory and append template.yml
    return path.join(templatePath, 'template.yml')
  }
}