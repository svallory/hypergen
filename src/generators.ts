import { lstatSync, readdirSync } from 'fs'
import { join as joinPath } from 'path'
import type {
  Action,
  Generator,
  ResolvedTemplatePathConfig,
} from './types'
import { ConflictResolutionStrategy } from './types'
import { ActionStore, GeneratorStore, TemplateStore } from './TemplateStore'

const removeExtension = (file: string) => file.replace(/\.[cm]?[jt]s[x]?$/, '')

function resolveActionConflicts(
  generator: Generator,
  conflictStrategy: ConflictResolutionStrategy,
  store: TemplateStore
) {
  for (const action of generator.actions) {
    const newAction: Action = {
      ...action,
      generatorName: generator.name,
      generatorPath: generator.path
    };

    const existingAction = store.actions.find(action)

    if (existingAction) {
      const conflictingGenerator = store.generators.findByName(action.generatorName)

      if (conflictingGenerator.length && conflictingGenerator[0].path === generator.path) {
        // Actions are the same, it's not a conflict
        continue;
      }

      switch (conflictStrategy) {
        case ConflictResolutionStrategy.FAIL:
          throw new Error(`
Action conflict: "${store.actions.keyFor(action)}" defined by ${generator.path} was already
defined by ${existingAction.path}.

You are seeing this error because the 'conflictResolutionMode' is set to 'fail'.
Update that value in your hygen config to

- "override" if you want to keep the action is defined last
- "skip" to keep the action that appears first
        `)

        case ConflictResolutionStrategy.SKIP:
          continue

        case ConflictResolutionStrategy.OVERRIDE:
          store.actions.add(newAction)
      }
    } else {
      store.actions.add(newAction)
    }
  }
}

/**
 * Pushes the generators of the template at {@link templateFolder}
 * into the module private variable {@link generators} while resolving
 * action conflicts
 */
const loadGeneratorsForTemplate = (
  templatesFolder: ResolvedTemplatePathConfig,
  conflictStrategy: ConflictResolutionStrategy,
  store: TemplateStore
): void => {
  const tplGenerators = readdirSync(templatesFolder.path).filter((_) =>
    lstatSync(joinPath(templatesFolder.path, _)).isDirectory(),
  )

  for (const generatorName of tplGenerators) {
    const generatorPath = joinPath(templatesFolder.path, generatorName)
    const currGeneratorActions = readdirSync(generatorPath)

    const currGenerator: Generator = {
      name: generatorName,
      path: generatorPath,
      actions: currGeneratorActions.map((action) => ({
        name: removeExtension(action),
        path: joinPath(generatorPath, removeExtension(action)),
        generatorName,
        generatorPath,
      })),
    }

    resolveActionConflicts(currGenerator, conflictStrategy, store)
    store.generators.add(currGenerator)
  }
}

export function loadGenerators(
  templates: ResolvedTemplatePathConfig[],
  conflictStrategy: ConflictResolutionStrategy,
): {
  generators: GeneratorStore
  actions: ActionStore
  } {
  // There may be many situations when we actually want to reload the generators,
  // here are 2 situations:
  //   - successive calls to the engine with different set of templates folders
  //   - in case of changes to the templates folders
  //
  // So, until this is clarified and planned for, the line below needs to remain
  // commented:
  // if (generators.size) return { generators, actions }

  const store = new TemplateStore()

  for (const templateFolder of templates) {
    loadGeneratorsForTemplate(templateFolder, conflictStrategy, store)
  }

  return store
}
