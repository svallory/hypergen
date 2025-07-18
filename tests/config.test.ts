import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { HypergenConfigLoader, createConfigFile, getConfigInfo } from '../src/config/hypergen-config'

describe('Hypergen Configuration System', () => {
  let tempDir: string
  let configPath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'hypergen-config-test-'))
    configPath = path.join(tempDir, 'hypergen.config.js')
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('HypergenConfigLoader', () => {
    it('should load default configuration when no config file exists', async () => {
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir, 'development')
      
      expect(config).toBeDefined()
      expect(config.templates).toEqual([path.resolve(tempDir, '_templates')])
      expect(config.configPath).toBe('default')
      expect(config.projectRoot).toBe(tempDir)
      expect(config.environment).toBe('development')
    })

    it('should load JSON configuration file', async () => {
      const testConfig = {
        templates: ['custom-templates'],
        engine: { type: 'ejs' },
        cache: { enabled: false }
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir)
      
      expect(config.templates).toEqual([path.resolve(tempDir, 'custom-templates')])
      expect(config.cache.enabled).toBe(false)
    })

    it('should load JavaScript configuration file', async () => {
      const configContent = `
        export default {
          templates: ['js-templates'],
          engine: { type: 'ejs' },
          cache: { enabled: true, ttl: 5000 }
        }
      `
      
      fs.writeFileSync(configPath, configContent)
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir)
      
      expect(config.templates).toEqual([path.resolve(tempDir, 'js-templates')])
      expect(config.cache.enabled).toBe(true)
      expect(config.cache.ttl).toBe(5000)
    })

    it('should apply environment-specific configuration', async () => {
      const testConfig = {
        templates: ['base-templates'],
        cache: { enabled: true },
        environments: {
          test: {
            cache: { enabled: false },
            validation: { strict: false }
          }
        }
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir, 'test')
      
      expect(config.cache.enabled).toBe(false)
      expect(config.validation.strict).toBe(false)
      expect(config.environment).toBe('test')
    })

    it('should resolve relative template paths', async () => {
      const testConfig = {
        templates: ['./templates', '../shared-templates']
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir)
      
      expect(config.templates).toEqual([
        path.resolve(tempDir, './templates'),
        path.resolve(tempDir, '../shared-templates')
      ])
    })

    it('should handle missing configuration file gracefully', async () => {
      // This should throw an error when explicitly specifying a non-existent file
      await expect(HypergenConfigLoader.loadConfig(
        '/non/existent/config.js',
        tempDir
      )).rejects.toThrow('Configuration file not found')
    })
  })

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        templates: ['_templates'],
        discovery: { sources: ['local', 'npm'] },
        engine: { type: 'ejs' },
        output: { conflictStrategy: 'fail' }
      }
      
      const result = HypergenConfigLoader.validateConfig(validConfig)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid discovery sources', () => {
      const invalidConfig = {
        discovery: { sources: ['invalid-source'] }
      }
      
      const result = HypergenConfigLoader.validateConfig(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid discovery sources: invalid-source')
    })

    it('should detect invalid engine type', () => {
      const invalidConfig = {
        engine: { type: 'invalid-engine' }
      }
      
      const result = HypergenConfigLoader.validateConfig(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid engine type: invalid-engine')
    })

    it('should detect invalid conflict strategy', () => {
      const invalidConfig = {
        output: { conflictStrategy: 'invalid-strategy' }
      }
      
      const result = HypergenConfigLoader.validateConfig(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid conflict strategy: invalid-strategy')
    })

    it('should detect invalid templates format', () => {
      const invalidConfig = {
        templates: 'not-an-array'
      }
      
      const result = HypergenConfigLoader.validateConfig(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('templates must be an array of strings')
    })

    it('should detect invalid plugins format', () => {
      const invalidConfig = {
        plugins: 'not-an-array'
      }
      
      const result = HypergenConfigLoader.validateConfig(invalidConfig)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('plugins must be an array of strings')
    })
  })

  describe('Configuration File Creation', () => {
    it('should create JavaScript configuration file', async () => {
      const createdPath = await createConfigFile(tempDir, 'js')
      
      expect(createdPath).toBe(path.join(tempDir, 'hypergen.config.js'))
      expect(fs.existsSync(createdPath)).toBe(true)
      
      const content = fs.readFileSync(createdPath, 'utf-8')
      expect(content).toContain('export default {')
      expect(content).toContain('templates: [\'_templates\']')
    })

    it('should create JSON configuration file', async () => {
      const createdPath = await createConfigFile(tempDir, 'json')
      
      expect(createdPath).toBe(path.join(tempDir, 'hypergen.config.json'))
      expect(fs.existsSync(createdPath)).toBe(true)
      
      const content = fs.readFileSync(createdPath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.templates).toEqual(['_templates'])
    })

    it('should throw error if config file already exists', async () => {
      // Create file first
      fs.writeFileSync(configPath, 'existing content')
      
      await expect(createConfigFile(tempDir, 'js')).rejects.toThrow('already exists')
    })
  })

  describe('Configuration Information', () => {
    it('should provide configuration information', async () => {
      const testConfig = {
        templates: ['template1', 'template2'],
        plugins: ['plugin1', 'plugin2']
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir, 'development')
      const info = getConfigInfo(config)
      
      expect(info.templates).toHaveLength(2)
      expect(info.environment).toBe('development')
      expect(info.cacheEnabled).toBe(true)
      expect(info.pluginCount).toBe(2)
      expect(info.source).toContain('hypergen.config.json')
    })
  })

  describe('Configuration Merging', () => {
    it('should replace templates arrays', async () => {
      const testConfig = {
        templates: ['custom-templates']
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir)
      
      // Should replace default templates, not merge
      expect(config.templates).toEqual([path.resolve(tempDir, 'custom-templates')])
    })

    it('should merge nested objects', async () => {
      const testConfig = {
        cache: {
          enabled: false
        },
        discovery: {
          sources: ['local']
        }
      }
      
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, tempDir)
      
      expect(config.cache.enabled).toBe(false)
      expect(config.cache.ttl).toBe(3600000) // Should keep default
      expect(config.discovery.sources).toEqual(['local'])
      expect(config.discovery.directories).toEqual(['_templates', 'templates', 'generators']) // Should keep defaults
    })
  })

  describe('Error Handling', () => {
    it('should handle syntax errors in JSON config', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        '{ invalid json'
      )
      
      await expect(HypergenConfigLoader.loadConfig(undefined, tempDir)).rejects.toThrow('Failed to load configuration')
    })

    it('should handle missing config file when explicitly specified', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.config.js')
      
      await expect(HypergenConfigLoader.loadConfig(nonExistentPath, tempDir)).rejects.toThrow('Configuration file not found')
    })
  })

  describe('Configuration File Search', () => {
    it('should find config in parent directories', async () => {
      const subDir = path.join(tempDir, 'subdir')
      fs.mkdirSync(subDir)
      
      const testConfig = { templates: ['parent-templates'] }
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(testConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, subDir)
      
      expect(config.templates).toEqual([path.resolve(subDir, 'parent-templates')])
    })

    it('should prefer project-level config over parent config', async () => {
      const subDir = path.join(tempDir, 'subdir')
      fs.mkdirSync(subDir)
      
      // Parent config
      const parentConfig = { templates: ['parent-templates'] }
      fs.writeFileSync(
        path.join(tempDir, 'hypergen.config.json'),
        JSON.stringify(parentConfig, null, 2)
      )
      
      // Project config
      const projectConfig = { templates: ['project-templates'] }
      fs.writeFileSync(
        path.join(subDir, 'hypergen.config.json'),
        JSON.stringify(projectConfig, null, 2)
      )
      
      const config = await HypergenConfigLoader.loadConfig(undefined, subDir)
      
      expect(config.templates).toEqual([path.resolve(subDir, 'project-templates')])
    })
  })
})