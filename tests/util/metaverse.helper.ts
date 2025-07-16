import { describe, it, expect, mock } from 'bun:test'
import path from 'node:path'
import execa from 'execa'
import * as dirCompare from 'dir-compare'
import fs from 'fs-extra'
import Enquirer from 'enquirer'
import { runner } from '~/index.js'
import Logger from '~/logger.js'
import { fixture } from './fixtures.js'

mock.module('enquirer', () => import('./enquirer.js'))

const opts = { compareContent: true }

const logger = new Logger(console.log)

const createConfig = (metaDir) => ({
  templates: '_templates',
  cwd: metaDir,

  exec: (action, body) => {
    const execOpts = body && body.length > 0 ? { input: body } : {}
    return execa.command(action, { ...execOpts, shell: true, cwd: metaDir })
  },
  logger,
  createPrompter: () => new Enquirer(),
})

const dir = (m) => fixture(m, { base: 'metaverse' })

export const metaverse = async (folder, cmds, promptResponse: any = null) => {
  const metaDir = dir(folder)
  console.log('=====> metaverse test in:', metaDir)
  const config = createConfig(metaDir)

  console.log('=====> MetaDir files:', fs.readdirSync(metaDir))
  const results = []
  
  for (let cmd of cmds) {
    console.log('=====> Testing command:', cmd)
    if (process.env.TEST_FOCUS && process.env.TEST_FOCUS !== cmd[0]) {
      console.log('=====> skipping (focus):', cmd)
      continue
    }

    console.log('=====> testing', cmd)

    if (promptResponse) {
      const last = cmd[cmd.length - 1]
      if (typeof last === 'object') {
        cmd = cmd.slice(0, cmd.length - 1)
        mock.module('enquirer', () => ({
          prompt: () => Promise.resolve({ ...promptResponse, ...last }),
        }))
      } else {
        mock.module('enquirer', () => ({
          prompt: () => Promise.resolve(promptResponse),
        }))
      }
    }

    const res = await runner(cmd, config)
    res.actions.forEach((a) => {
      a.timing = -1
      a.subject = a.subject.replace(/\\/g, '/').replace(/.*hygen\/src/, '')
      if (a.payload?.name) {
        a.payload.name = a.payload.name
          .replace(/\\/g, '/')
          .replace(/.*hygen\/src/, '')
      }
      if (a.payload?.to) {
        a.payload.to = a.payload.to
          .replace(/\\/g, '/')
          .replace(/.*hygen\/src/, '')
      }
    })

    results.push({ cmd: cmd.join(' '), res })
  }

  let dirComparison = null
  if (!process.env.TEST_FOCUS) {
    const givenDir = path.join(metaDir, 'given')
    const expectedDir = path.join(metaDir, 'expected')

    console.log('=====> after', {
      [givenDir]: fs.readdirSync(givenDir),
      [expectedDir]: fs.readdirSync(expectedDir),
    })

    const res = dirCompare.compareSync(givenDir, expectedDir, opts)
    res.diffSet = res.diffSet.filter((d) => d.state !== 'equal')

    if (!res.same) {
      console.log('=====> res:', res)
    }
    dirComparison = res
  }
  
  return { results, dirComparison }
}