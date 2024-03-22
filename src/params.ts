import yargs from 'yargs-parser'
import type { ActionsMap, ParamsResult, ResolvedRunnerConfig } from './types'

import prompt from './prompt'
import { loadGenerators } from './generators';
import { ShowHelpError } from './engine'
import { type ActionStore } from './TemplateStore'
export const DEFAULT_ACTION = '_default'

const resolvePositionalArgs = async (actions: ActionStore, args: string[]) => {
  /*
  we want a to create flexible resolution and allow both:

  1. [gen] [action] [NAME]
  2. [gen] [NAME] which, if NAME=action, has a conflict, so goes to the generator with
      an empty name, otherwise -- goes to the new '_default' generator, with a name of 'NAME'

  E.g.
  for a template layout of:
  init/
    repo/
    ..

  init repo (repo exists, so goes to the repo gen, this is not a default named 'repo'!)
  init repo MyName
  init MyName (default, name=MyName), default because 'repo' does not exist
  init (default, name=[empty]), default always!
  */
  let [generator, action, name] = args

  if (generator && action && actions.exists(generator, action)) {
    return [generator, action, name]
  }

  if (generator && actions.exists(generator, DEFAULT_ACTION)) {
    action = DEFAULT_ACTION
    ;[generator, name] = args
  }

  return [generator, action, name]
}

const params = async (
  resolvedConfig: ResolvedRunnerConfig,
  externalArgv: string[],
): Promise<ParamsResult> => {
  const argv = yargs(externalArgv)
  const { templates, conflictResolutionStrategy, createPrompter } =
    resolvedConfig

  const { actions, generators } = loadGenerators(templates, conflictResolutionStrategy)

  // console.debug('generators', generators)
  // console.debug(`actionsMap (items: ${actionsMap.size})`, actionsMap.entries())

  const [generator, action, name] = await resolvePositionalArgs(actions, argv._)

  if (!generator || !action) {
    return { generator, action, templates }
  }

  const targetAction = actions.find(generator, action)

  if (!targetAction) {
    const existingGenerators = generators.findByName(generator);
    const existingActions = existingGenerators.reduce(
      (actionsArr: string[], curr) => {
        actionsArr.push(...curr.actions.map(a => a.name))
        return actionsArr
      }, [] as string[])

    console.log(JSON.stringify(existingGenerators, null, 2))
    throw new ShowHelpError(`
The action "${action}" does not exist in the ${generator} generator.

Existing actions:
${ existingActions.map(a => `  - ${a}`)}

Generator paths:
${ existingGenerators.map(g => `  - ${g.path}`)}
`)
  }

  const actionFolder = targetAction.path

  const { _, ...cleanArgv } = argv
  const promptArgs = await prompt(createPrompter, actionFolder, {
    // NOTE we might also want the rest of the generator/action/etc. params here
    // but theres no use case yet
    ...(name ? { name } : {}),
    ...cleanArgv,
  })

  const [, subAction] = action.split(':')

  const args = Object.assign(
    {
      templates,
      actionFolder,
      generator,
      action,
      subAction,
    },
    // include positional args as special arg for templates to consume,
    // and a unique timestamp for this run
    { _, ts: process.env.HYPERGEN_TS || new Date().getTime() },
    cleanArgv,
    name && { name },
    promptArgs,
  )

  return args
}

export default params
