import { describe, it, expect, beforeEach } from 'bun:test'
import { HypergenCLI } from '../src/cli/cli'

describe('CLI Flag Parsing', () => {
  let cli: HypergenCLI

  beforeEach(() => {
    cli = new HypergenCLI({
      cwd: process.cwd(),
      templates: ['_templates']
    })
  })

  describe('Flag Parsing', () => {
    it('should parse simple flags correctly', () => {
      const args = ['--defaults', '--dryRun', '--force']
      const flags = cli['parseFlags'](args)
      
      expect(flags.has('defaults')).toBe(true)
      expect(flags.has('dryRun')).toBe(true)
      expect(flags.has('force')).toBe(true)
    })

    it('should parse flags with values correctly', () => {
      const args = ['--defaults', '--timeout=5000', '--force']
      const flags = cli['parseFlags'](args)
      
      expect(flags.has('defaults')).toBe(true)
      expect(flags.has('timeout')).toBe(true)
      expect(flags.has('force')).toBe(true)
    })

    it('should ignore non-flag arguments', () => {
      const args = ['action-name', 'param1', '--defaults', 'param2', '--force']
      const flags = cli['parseFlags'](args)
      
      expect(flags.has('defaults')).toBe(true)
      expect(flags.has('force')).toBe(true)
      expect(flags.has('action-name')).toBe(false)
      expect(flags.has('param1')).toBe(false)
      expect(flags.has('param2')).toBe(false)
    })

    it('should handle empty args', () => {
      const args: string[] = []
      const flags = cli['parseFlags'](args)
      
      expect(flags.size).toBe(0)
    })
  })

  describe('Parameter Parsing', () => {
    it('should parse key=value parameters correctly', () => {
      const args = ['--name=TestComponent', '--port=8080', '--enabled=true']
      const params = cli['parseParameters'](args)
      
      expect(params.name).toBe('TestComponent')
      expect(params.port).toBe(8080)
      expect(params.enabled).toBe(true)
    })

    it('should parse JSON values correctly', () => {
      const args = ['--tags=["web","app"]', '--config={"key":"value"}']
      const params = cli['parseParameters'](args)
      
      expect(params.tags).toEqual(['web', 'app'])
      expect(params.config).toEqual({ key: 'value' })
    })

    it('should handle values with equals signs', () => {
      const args = ['--url=https://example.com/path?param=value']
      const params = cli['parseParameters'](args)
      
      expect(params.url).toBe('https://example.com/path?param=value')
    })

    it('should ignore flags without values', () => {
      const args = ['--defaults', '--name=TestComponent', '--force']
      const params = cli['parseParameters'](args)
      
      expect(params.name).toBe('TestComponent')
      expect(params.defaults).toBeUndefined()
      expect(params.force).toBeUndefined()
    })

    it('should handle empty parameter values', () => {
      const args = ['--name=', '--description=']
      const params = cli['parseParameters'](args)
      
      expect(params.name).toBe('')
      expect(params.description).toBe('')
    })

    it('should handle malformed JSON gracefully', () => {
      const args = ['--config={invalid json}']
      const params = cli['parseParameters'](args)
      
      expect(params.config).toBe('{invalid json}')
    })
  })

  describe('Combined Flag and Parameter Parsing', () => {
    it('should handle mixed flags and parameters', () => {
      const args = [
        'action-name',
        '--defaults',
        '--name=TestComponent',
        '--dryRun',
        '--port=8080',
        '--force',
        'extra-param'
      ]
      
      const flags = cli['parseFlags'](args)
      const params = cli['parseParameters'](args)
      
      // Flags
      expect(flags.has('defaults')).toBe(true)
      expect(flags.has('dryRun')).toBe(true)
      expect(flags.has('force')).toBe(true)
      expect(flags.has('name')).toBe(true) // Has value, so also appears in flags
      expect(flags.has('port')).toBe(true)
      
      // Parameters
      expect(params.name).toBe('TestComponent')
      expect(params.port).toBe(8080)
      expect(params.defaults).toBeUndefined()
      expect(params.dryRun).toBeUndefined()
      expect(params.force).toBeUndefined()
    })

    it('should filter out flags when getting clean parameters', () => {
      const args = [
        'action-name',
        '--defaults',
        '--name=TestComponent',
        '--dryRun',
        'param1',
        '--force'
      ]
      
      const cleanArgs = args.filter(arg => !arg.startsWith('--'))
      expect(cleanArgs).toEqual(['action-name', 'param1'])
    })
  })

  describe('Real-world Usage Examples', () => {
    it('should handle typical component generation command', () => {
      const args = [
        'component',
        '--name=UserProfile',
        '--framework=react',
        '--defaults',
        '--dryRun'
      ]
      
      const flags = cli['parseFlags'](args)
      const params = cli['parseParameters'](args)
      const cleanArgs = args.filter(arg => !arg.startsWith('--'))
      
      expect(cleanArgs).toEqual(['component'])
      expect(flags.has('defaults')).toBe(true)
      expect(flags.has('dryRun')).toBe(true)
      expect(params.name).toBe('UserProfile')
      expect(params.framework).toBe('react')
    })

    it('should handle API generation with complex parameters', () => {
      const args = [
        'api',
        '--name=UserService',
        '--methods=["GET","POST","PUT","DELETE"]',
        '--config={"auth":true,"validation":true}',
        '--force',
        '--defaults'
      ]
      
      const flags = cli['parseFlags'](args)
      const params = cli['parseParameters'](args)
      
      expect(flags.has('force')).toBe(true)
      expect(flags.has('defaults')).toBe(true)
      expect(params.name).toBe('UserService')
      expect(params.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE'])
      expect(params.config).toEqual({ auth: true, validation: true })
    })

    it('should handle database generation with dry run', () => {
      const args = [
        'database',
        '--name=users',
        '--fields=["id","name","email","created_at"]',
        '--dryRun',
        '--defaults'
      ]
      
      const flags = cli['parseFlags'](args)
      const params = cli['parseParameters'](args)
      
      expect(flags.has('dryRun')).toBe(true)
      expect(flags.has('defaults')).toBe(true)
      expect(params.name).toBe('users')
      expect(params.fields).toEqual(['id', 'name', 'email', 'created_at'])
    })
  })

  describe('Edge Cases', () => {
    it('should handle flags with dashes in names', () => {
      const args = ['--dry-run', '--use-defaults', '--force-overwrite']
      const flags = cli['parseFlags'](args)
      
      expect(flags.has('dry-run')).toBe(true)
      expect(flags.has('use-defaults')).toBe(true)
      expect(flags.has('force-overwrite')).toBe(true)
    })

    it('should handle parameters with special characters', () => {
      const args = ['--name=Test@Component', '--path=/usr/local/bin']
      const params = cli['parseParameters'](args)
      
      expect(params.name).toBe('Test@Component')
      expect(params.path).toBe('/usr/local/bin')
    })

    it('should handle unicode characters', () => {
      const args = ['--name=用户组件', '--description=This is a test 🚀']
      const params = cli['parseParameters'](args)
      
      expect(params.name).toBe('用户组件')
      expect(params.description).toBe('This is a test 🚀')
    })

    it('should handle very long parameter values', () => {
      const longValue = 'a'.repeat(1000)
      const args = [`--description=${longValue}`]
      const params = cli['parseParameters'](args)
      
      expect(params.description).toBe(longValue)
    })
  })
})