#!/usr/bin/env bun
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { command } from 'execa'
import Logger from './logger.js'
import { runner } from './index.js'
import Enquirer from 'enquirer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// todo: should we always include this?
// It would mean poorer error reporting of bad config
const defaultTemplates = path.join(__dirname, '../src/templates')
runner(process.argv.slice(2), {
  templates: defaultTemplates,
  cwd: process.cwd(),
  logger: new Logger(console.log.bind(console)), // eslint-disable-line no-console
  debug: !!process.env.DEBUG,
  exec: (action, body) => {
    const opts = body && body.length > 0 ? { input: body } : {}
    return command(action, { ...opts, shell: true }) // eslint-disable-line @typescript-eslint/no-var-requires
  },
  createPrompter: () => new Enquirer() as any,
}).then(({ success }) => process.exit(success ? 0 : 1))
