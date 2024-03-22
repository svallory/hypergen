import { HashIndexedStore } from './indexed-store';
import { PropertyIndexedStore } from './indexed-store/PropertyIndexedStore';
import type { Action, Generator } from './types';

class IndexedFolderStore<
    ItemType extends { name: string, path: string },
    KeyParts extends (keyof ItemType)[]>
    extends HashIndexedStore<ItemType, KeyParts, ['name', 'path']> {

  constructor(keyParts: KeyParts) {
    super(keyParts, ['name', 'path'])
  }

  findByName(name: string): ItemType[] {
    return this.findBy('name', name);
  }

  findByPath(path: string): ItemType[] {
    return this.findBy('path', path);
  }
}

export class GeneratorStore extends IndexedFolderStore<Generator, [name: 'name']> {
  constructor() {
    super(['name'])
  }
}

export class ActionStore extends IndexedFolderStore<Action, [generator: 'generatorName', name: 'name']> {
  constructor() {
    super(['generatorName', 'name'])
  }

  // find(action: Action): Action | undefined;
  // find(generatorName: string, name: string): Action | undefined;
  // find(actionOrGeneratorName: string | Action, name?: string) {
  //   if (typeof actionOrGeneratorName === "string") {
  //     return this.findByKeyParts(actionOrGeneratorName, name)
  //   }

  //   return super.findByKeyParts(actionOrGeneratorName.generatorName, actionOrGeneratorName.name)
  // }
}

/**
 * The goal of this class is to encapsulate all the variables that are
 * necessary for optimizing finding, comparing and Generators and Actions
 *
 * It achieves it by creating indices for the loaded {@link Generator generators}
 * and {@link Action actions} based on their `name` and `path`
 */
export class TemplateStore {
  public readonly actions: ActionStore;
  public readonly generators: GeneratorStore;
  constructor() {
    this.actions = new ActionStore()
    this.generators = new GeneratorStore()
  }
}
