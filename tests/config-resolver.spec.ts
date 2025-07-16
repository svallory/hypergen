import { describe, it, expect, beforeEach, spyOn } from 'bun:test'
import path from 'node:path'
import fs from 'fs-extra'
import templateResolver from '~/config-resolver.js'
import Logger from '~/logger.js'
import { templateFixture } from './util/fixtures.js'

const templateParams = (
  cwd,
  templates,
  templatesOverride,
) => {
  return {
    cwd,
    templates,
    templatesOverride,
    exec: () => { },
    logger: new Logger(console.log), // eslint-disable-line no-console
    debug: false,
    helpers: {},
    createPrompter: () => require('enquirer'),
  }
}
describe('resolve', () => {
  let spies
  beforeEach(() => {
    spies = {
      existsSync: spyOn(fs, 'existsSync'),
      console: spyOn(console, 'warn')
    }

    spies.console.mockImplementation(() => { })
  })


  it('template overrides takes over all', async () => {
    spies.existsSync.mockReturnValue(true)

    const resolvedTemplates = (
      await templateResolver(
        templateParams(
          '/1',
          templateFixture('app'),
          templateFixture('app-custom/other-templates'),
        ),
      )
    ).templates

    expect(resolvedTemplates).toHaveLength(1)
    expect(resolvedTemplates[0].path).toEqual(
      templateFixture('app-custom/other-templates'),
    )
  })

  it('templates explicitly given via config, so take it if it exists', async () => {
    spies.existsSync.mockImplementation((path) => {
      // Return true for the expected template path
      if (path === templateFixture('app-custom/other-templates')) {
        return true
      }
      // Return false for default _templates path
      if (path === '/1/_templates') {
        return false
      }
      return false
    })
    const templates = (
      await templateResolver(
        templateParams(
          '/1',
          templateFixture('app-custom/other-templates'),
          undefined,
        ),
      )
    ).templates
    expect(templates[0].path).toEqual(
      templateFixture('app-custom/other-templates'),
    )
  })

  it('when templates exist', async () => {
    spies.existsSync.mockReturnValue(true)

    const templates = (
      await templateResolver(templateParams(templateFixture('app'), '2'))
    ).templates
    expect(templates[0].path).toEqual(
      path.resolve(templateFixture('app'), '_templates'),
    )
  })

  it('take templates from HYPERGEN_TMPLS env when it exists', async () => {
    spies.existsSync.mockReturnValue(true)

    process.env.HYPERGEN_TMPLS = templateFixture('app-custom/other-templates')
    const templates = (
      await templateResolver(
        templateParams(templateFixture('app-custom'), '2'),
      )
    ).templates
    expect(templates[0].path).toEqual(
      templateFixture('app-custom/other-templates'),
    )
    process.env.HYPERGEN_TMPLS = undefined
  })
})