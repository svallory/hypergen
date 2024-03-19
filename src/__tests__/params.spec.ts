import path from 'path'
import params from '../params'

const fixture = (...segments) =>
  path.join(__dirname, 'fixtures', 'templates', ...segments)

describe('params', () => {
  process.env.HYPERGEN_TS = '1337'

  beforeEach(() => {
    process.env.HYPERGEN_TMPLS = ''
  })

  // todo: figure out the intention and re-enable this test
  it('dont take template folder in template', async () => {
    const args = await params(
      {
        templates: [
          {
            path: fixture('template-folder-in-templates', '_templates'),
            prefix: '',
            pathChecked: false,
          },
        ],
      },
      ['dont-take-this', 'foo', 'bar', 'baz'],
    )
    expect(args).toEqual({
      _: ['dont-take-this', 'foo', 'bar', 'baz'],
      action: 'foo',
      name: 'bar',
      subAction: undefined,
      actionFolder: fixture(
        'template-folder-in-templates',
        '_templates',
        'dont-take-this',
        'foo',
      ),
      generator: 'dont-take-this',
      templates: [
        {
          path: fixture('template-folder-in-templates', '_templates'),
          pathChecked: false,
          prefix: '',
        },
      ],
      ts: '1337',
    })
  })

  // todo: figure out the intention and re-enable this test
  it('env var overrides local templates but still take explicitly given templates', async () => {
    process.env.HYPERGEN_TMPLS = fixture('templates-override', 'tmpls')
    const args = await params(
      {
        templates: [
          {
            path: fixture('templates-override', '_templates'),
            prefix: '',
            pathChecked: false,
          },
        ],
      },
      ['dont-take-this', 'foo', 'bar', 'baz'],
    )
    expect(args).toEqual({
      _: ['dont-take-this', 'foo', 'bar', 'baz'],
      action: 'foo',
      name: 'bar',
      subAction: undefined,
      generator: 'dont-take-this',
      actionFolder: fixture(
        'templates-override',
        '_templates',
        'dont-take-this',
        'foo',
      ),
      templates: [
        {
          path: fixture('templates-override', '_templates'),
          pathChecked: false,
          prefix: '',
        },
      ],
      ts: '1337',
    })
  })
})