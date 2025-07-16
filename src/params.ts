import yargs from 'yargs-parser'
import type { ParamsResult, ResolvedRunnerConfig } from './types.js'

import prompt from './prompt.js'
import { loadGenerators } from './generators.js'
import { ShowHelpError } from './engine.js'
import { type ActionStore } from './TemplateStore.js'
import { DEFAULT_ACTION } from './constants.js'

const resolvePositionalArgs = async (actions: ActionStore, args: (string | number)[]) => {
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
  const [generator, action, name] = args.map(String)

  if (generator && action && actions.exists(generator, action)) {
    return [generator, action, name]
  }

  if (generator && actions.exists(generator, DEFAULT_ACTION)) {
    const [gen, act] = args.map(String)
    return [gen, DEFAULT_ACTION, act]
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

  const { actions, generators } = loadGenerators(
    templates,
    conflictResolutionStrategy,
  )

  const [generator, action, name] = await resolvePositionalArgs(
    actions,
    argv._,
  )

  if (!generator || !action) {
    return { generator, action, templates }
  }

  const targetAction = actions.find(generator, action)

  if (!targetAction) {
    const existingGenerators = generators.findByName(generator)
    const existingActions = existingGenerators.reduce(
      (actionsArr: string[], curr) => {
        actionsArr.push(...curr.actions.map((a) => a.name))
        return actionsArr
      },
      [] as string[],
    )

    throw new ShowHelpError(`
The action "${action}" does not exist in the ${generator} generator.

Existing actions:
${existingActions.map((a) => `  - ${a}`).join('\n')}

Generator paths:
${existingGenerators.map((g) => `  - ${g.path}`).join('\n')}
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
