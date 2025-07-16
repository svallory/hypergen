import { describe, it, expect } from 'bun:test'
import fs from 'fs-extra'
import path from 'node:path'
import add from '~/ops/add.js'
import Logger from '~/logger.js'
import MockEnquirer from './util/enquirer.js'

describe('add', () => {
  const logger = new Logger(console.log)

  it('should add a new file', async () => {
    const CWD = '/tmp/add-new-file'
    fs.removeSync(CWD)
    const to = path.join(CWD, 'app/hello.js')

    const result = await add(
      {
        attributes: { to: 'app/hello.js' },
        body: 'hello',
      },
      {},
      {
        logger,
        cwd: CWD,
        debug: false,
        helpers: {},
        createPrompter: () => new MockEnquirer(),
      },
    )

    expect(result).toMatchSnapshot({ timing: expect.any(Number) })
    expect(fs.existsSync(to)).toBe(true)
    expect(fs.readFileSync(to).toString()).toBe('hello')
    fs.removeSync(CWD)
  })

  it('should overwrite an existing file when confirmed', async () => {
    const CWD = '/tmp/overwrite-existing-file'
    fs.removeSync(CWD)
    const to = path.join(CWD, 'app/hello.js')
    fs.ensureDirSync(path.dirname(to))
    fs.writeFileSync(to, 'original content')

    const result = await add(
      {
        attributes: { to: 'app/hello.js' },
        body: 'new content',
      },
      {},
      {
        logger,
        cwd: CWD,
        debug: false,
        helpers: {},
        createPrompter: () => new MockEnquirer(),
      },
    )

    expect(result).toMatchSnapshot({ timing: expect.any(Number) })
    expect(fs.readFileSync(to).toString()).toBe('new content')
    fs.removeSync(CWD)
  })
})
