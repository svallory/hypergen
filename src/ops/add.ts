import path from 'node:path'
import fs from 'fs-extra'
import chalk from 'chalk'
import type { ActionResult, RenderedAction, RunnerConfig } from '../types.js'
import createResult from './result.js'

const add = async (
  action: RenderedAction,
  args: Record<string, any>,
  { logger, cwd, createPrompter }: RunnerConfig,
): Promise<ActionResult> => {
  const {
    attributes: { to, inject, unless_exists, force, from, skip_if },
  } = action
  const result = createResult('add', to)
  const prompter = createPrompter()
  if (!to || inject) {
    return result('ignored')
  }
  if (!to) {
    return result('missing "to" attribute')
  }

  const absTo = path.resolve(cwd, to)
  const shouldNotOverwrite =
    !force && unless_exists !== undefined && unless_exists === true
  const fileExists = await fs.pathExists(absTo)

  if (shouldNotOverwrite && fileExists) {
    logger.warn(`     skipped: ${to}`)
    return result('skipped')
  }
  if (!process.env.HYPERGEN_OVERWRITE && fileExists && !force) {
    if (
      !(await prompter
        .prompt({
          prefix: '',
          type: 'confirm',
          name: 'overwrite',
          message: chalk.red(`     exists: ${to}. Overwrite? (y/N): `),
        })
        .then(({ overwrite }) => overwrite))
    ) {
      logger.warn(`     skipped: ${to}`)
      return result('skipped')
    }
  }

  const shouldSkip = skip_if === 'true'

  if (shouldSkip) {
    return result('skipped')
  }

  if (from) {
    const from_path = path.join(args.templates, from)
    const file = fs.readFileSync(from_path).toString()
    action.body = file
  }

  if (!args.dry) {
    await fs.ensureDir(path.dirname(absTo))
    await fs.writeFile(absTo, action.body)
  }
  const pathToLog = process.env.HYPERGEN_OUTPUT_ABS_PATH ? absTo : to
  logger.ok(`       ${force ? 'FORCED' : 'added'}: ${pathToLog}`)

  return result('added')
}

export default add
