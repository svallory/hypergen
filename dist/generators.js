"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGenerators = exports.actionKeyFor = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const types_1 = require("./types");
const removeExtension = (file) => file.replace(/\.[cm]?[jt]s[x]?$/, '');
const actionKeyFor = (generator, action) => `${generator}::${removeExtension(action)}`;
exports.actionKeyFor = actionKeyFor;
const generators = new Map();
const actionsMap = new Map();
const registerAction = (generatorName, name, path) => actionsMap.set((0, exports.actionKeyFor)(generatorName, name), {
    name,
    path,
    generatorName,
});
function resolveActionConflicts(generator, conflictStrategy) {
    for (const action of generator.actions) {
        const key = (0, exports.actionKeyFor)(generator.name, action.name);
        // console.debug('action map:', action.name, ' - ', key)
        if (actionsMap.has(key)) {
            switch (conflictStrategy) {
                case types_1.ConflictResolutionStrategy.FAIL:
                    throw new Error(`
Action conflict: "${key}" defined by ${generator.path} was already
defined by ${actionsMap.get(action.name).path}.

You are seeing this error because the 'conflictResolutionMode' is set to 'fail'.
Update that value in your hypergen config to

- "override" if you want to keep the action is defined last
- "skip" to keep the action that appears first
        `);
                case types_1.ConflictResolutionStrategy.SKIP:
                    continue;
                case types_1.ConflictResolutionStrategy.OVERRIDE:
                    registerAction(generator.name, action.name, action.path);
            }
        }
        else {
            registerAction(generator.name, action.name, action.path);
        }
    }
}
/**
 * Pushes the generators of the template at {@link templateFolder}
 * into the module private variable {@link generators} while resolving
 * action conflicts
 */
const loadGeneratorsForTemplate = (templatesFolder, conflictStrategy) => {
    const tplGenerators = (0, fs_1.readdirSync)(templatesFolder.path).filter((_) => (0, fs_1.lstatSync)((0, path_1.join)(templatesFolder.path, _)).isDirectory());
    for (const name of tplGenerators) {
        const path = (0, path_1.join)(templatesFolder.path, name);
        const actions = (0, fs_1.readdirSync)(path);
        const info = {
            name,
            path,
            actions: actions.map((action) => ({
                name: action,
                path: (0, path_1.join)(path, removeExtension(action)),
                generatorName: name,
            })),
        };
        resolveActionConflicts(info, conflictStrategy);
        generators.set(name, info);
    }
};
function loadGenerators(templates, conflictStrategy) {
    if (generators.size)
        return { generators, actionsMap };
    for (const templateFolder of templates) {
        loadGeneratorsForTemplate(templateFolder, conflictStrategy);
    }
    return {
        generators,
        actionsMap,
    };
}
exports.loadGenerators = loadGenerators;
