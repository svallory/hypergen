import { describe, it, expect } from 'bun:test'
import params from '~/params.js'
import Logger from '~/logger.js'
import resolve from '~/config-resolver.js'
import { paramsFixture } from './util/fixtures.js'

describe('params', () => {
  it('should return the correct params', async () => {
    const config = {
      templates: paramsFixture('templates-override/tmpls'),
      cwd: paramsFixture('templates-override'),
      logger: new Logger(console.log),
      debug: false,
      exec: () => {},
      createPrompter: () => {}
    }
    const resolvedConfig = await resolve(config)
    const result = await params(resolvedConfig, ['foo', 'bar', 'baz'])
    expect(result.generator).toBe('foo')
    expect(result.action).toBe('bar')
    expect(result.name).toBe('baz')
  })
})