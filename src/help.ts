import chalk from 'chalk'
import { loadGenerators } from './generators.js'
import { HYPERGEN_VERSION, DEFAULT_ACTION } from './constants.js'
import type { Logger, RunnerConfig } from './types.js'
import { ConflictResolutionStrategy } from './types.js'

const help = (config: RunnerConfig, logger: Logger) => {
  const { generator } = (config as any).subcommand
    ? (config as any).subcommand
    : { generator: null }

  const templates = (
    Array.isArray(config.templates) ? config.templates : [config.templates]
  ).map((t) =>
    typeof t === 'string' ? { path: t, pathChecked: false } : { ...t, pathChecked: false },
  )
  const { actions, generators } = loadGenerators(
    templates,
    config.conflictResolutionStrategy || ConflictResolutionStrategy.FAIL,
  )
  if (generator) {
    const actionsByGenerator = actions.listAll().reduce((acc, action) => {
      acc[action.generatorName] = acc[action.generatorName] || []
      acc[action.generatorName].push(action.name)
      return acc
    }, {})

    for (const [generator, actions] of Object.entries(actionsByGenerator)) {
      logger.log(
        `${chalk.bold(generator)}: ${(actions as any[]).find((name) => name === DEFAULT_ACTION)
          ? `${generator}${(actions as any[]).length > 1 ? ',' : ''} `
          : ''
        }${(actions as any[])
          .filter((name) => name !== DEFAULT_ACTION)
          .join(', ')}`,
      )
    }
    if (actionsByGenerator[generator]) {
      const actions = actionsByGenerator[generator]
      logger.log(
        `${(actions as any[]).length > 0
          ? `\nActions:\n${(actions as any[]).join(', ')}`
          : chalk.bold('\nNo actions defined for this generator.')
        }`,
      )
    } else {
      logger.log(`\nCan't find generator '${generator}'`)
    }
  } else {
    const allGenerators = generators.listAll()
    logger.log(`Hypergen v${HYPERGEN_VERSION}`)
    logger.log('Loaded templates: ')
    for (const template of templates) {
      logger.log(typeof template === 'string' ? template : template.path)
    }

    if (!allGenerators || allGenerators.length === 0) {
      logger.log(
        chalk.bold('\nNo generators or actions available at this path...'),
      )
    } else {
      logger.log('\nAvailable generators:')
      for (const g of allGenerators) {
        logger.log(
          `  ${chalk.bold(g.name)}:\n    ${g.actions.length > 0 ? g.actions.join(', ') : 'No actions defined.'
          }`,
        )
      }

      logger.log(chalk.bold('\nfor more details visit https://hypergen.io'))
    }
  }
}

export default help