import { describe, it, expect } from 'bun:test'
import { metaverse } from './util/metaverse.helper.js'

describe('metaverse', () => {
  it('should run the conditional tests', async () => {
    const { results, dirComparison } = await metaverse('hygen-templates-unix', [['shell', 'new', '--name', 'foo']], {
      overwrite: true,
    })
    results.forEach(({ cmd, res }) => {
      expect(res).toMatchSnapshot(cmd)
    })
    if (dirComparison) {
      expect(dirComparison.same).toEqual(true)
    }
  })

  it('should run the defaults tests', async () => {
    const { results, dirComparison } = await metaverse('hygen-defaults', [['use-defaults']], {
      overwrite: true,
    })
    results.forEach(({ cmd, res }) => {
      expect(res).toMatchSnapshot(cmd)
    })
    if (dirComparison) {
      expect(dirComparison.same).toEqual(true)
    }
  })

  it('should run the extensions tests', async () => {
    const { results, dirComparison } = await metaverse('hygen-extension', [['hygen-js', 'new']], {
      message: 'hello',
    })
    results.forEach(({ cmd, res }) => {
      expect(res).toMatchSnapshot(cmd)
    })
    if (dirComparison) {
      expect(dirComparison.same).toEqual(true)
    }
  })

  it('should run the templates tests', async () => {
    const { results, dirComparison } = await metaverse(
      'hygen-templates',
      [
        ['init', 'self'],
        ['mailer', 'new', 'foo'],
        ['worker', 'new', 'foo'],
        ['worker', 'init'],
        [
          '--name',
          'from-params-and-prompt',
          'mailer',
          'new',
          { message: 'OK' },
        ],
        ['--name', 'from-params', 'mailer', 'new'],
        ['sample', 'new', '--name', 'message'],
        ['setup-new-project', 'new', 'test1'],
        [
          'inflection',
          'new',
          '--name',
          'person',
          '--plural',
          'people',
          '--singular',
          'person',
        ],
        ['inflection-in-params', 'new', '--name', 'apple'],
        ['inflection-in-prompt', 'new', { name: 'dog' }],
        ['attrs-in-body', 'new', '--name', 'foo-bar'],
        ['add-unless-exists', 'new', '--name', 'foo'],
        ['add-unless-exists', 'new', '--name', 'foo', '--overwrite'],
        ['overwrite-yes', 'new', '--name', 'foo'],
        ['overwrite-no', 'new', '--name', 'foo'],
        ['conditional-rendering', 'new', '--name', 'foo', '--should-fire'],
        ['conditional-rendering', 'new', '--name', 'foo'],
        ['existing-params', 'new', '--name', 'foo'],
        ['existing-params', 'new-params-alias', '--name', 'foo'],
        ['index-js-existing-params', 'new', '--name', 'foo'],
        ['index-js-existing-params', 'new-params-alias', '--name', 'foo'],
        [
          'cli-prefill-prompt-vars',
          'new',
          '--message',
          'hello',
          { email: 'test@test.com' },
        ],
        [
          'cli-prefill-prompt-vars',
          'name-is-special',
          '--name',
          'cased',
          { email: 'test@test.com' },
        ],
        [
          'cli-prefill-prompt-vars',
          'falsy-values-are-ok',
          '--message',
          'false',
          { email: 'test@test.com' },
        ],
        ['positional-name', 'new', 'acmecorp'],
        ['recursive-prompt', 'new', { name: 'foo' }],
      ],
      {
        message: 'hello',
      },
    )
    results.forEach(({ cmd, res }) => {
      expect(res).toMatchSnapshot(cmd)
    })
    if (dirComparison) {
      expect(dirComparison.same).toEqual(true)
    }
  })
})