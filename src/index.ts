import type { RunnerConfig, RunnerResult } from './types.js'
import resolve from './config-resolver.js'
import Logger from './logger.js'
import engine, { ShowHelpError } from './engine.js'
import help from './help.js'

const runner = async (
  argv: string[],
  config: RunnerConfig,
): Promise<RunnerResult> => {
  const resolvedConfig = await resolve(config)
  const { logger } = resolvedConfig
  try {
    const actions = await engine(argv, resolvedConfig)
    console.debug('engine returned actions:', actions)
    return { success: true, actions, time: 0 }
  } catch (err) {
    logger.log(err.toString() + '\n' + err.stack)
    if (resolvedConfig.debug) {
      logger.log('details -----------')
      logger.log(err.stack)
      logger.log('-------------------')
    }
    if (err instanceof ShowHelpError) {
      help(resolvedConfig, logger)
    }
    return { success: false, actions: [], time: 0 }
  }
}

export { runner, engine, resolve, help as printHelp, Logger }
