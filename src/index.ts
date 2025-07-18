import type { RunnerConfig, RunnerResult } from './types.js'
import Logger from './logger.js'
import engine, { ShowHelpError } from './engine.js'

/**
 * V8-only config resolver
 * Simplified configuration without legacy template requirements
 */
const resolveV8Config = async (config: RunnerConfig) => {
  return {
    ...config,
    templates: [],
    logger: config.logger || new Logger(console.log.bind(console)),
    cwd: config.cwd || process.cwd(),
    debug: config.debug || false
  }
}

const runner = async (
  argv: string[],
  config: RunnerConfig,
): Promise<RunnerResult> => {
  const resolvedConfig = await resolveV8Config(config)
  const { logger } = resolvedConfig
  
  try {
    const actions = await engine(argv, resolvedConfig)
    console.debug('V8 engine returned actions:', actions)
    return { success: true, actions, time: 0 }
  } catch (err: any) {
    logger.log(err.toString())
    if (resolvedConfig.debug) {
      logger.log('details -----------')
      logger.log(err.stack)
      logger.log('-------------------')
    }
    if (err instanceof ShowHelpError) {
      // Help was already displayed in engine
      return { success: true, actions: [], time: 0 }
    }
    return { success: false, actions: [], time: 0 }
  }
}

export { runner, engine, resolveV8Config as resolve, Logger }
