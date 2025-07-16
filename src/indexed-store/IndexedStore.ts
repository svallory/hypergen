import { IndexedStoreItemType, PrimitiveType, ToTuple } from './types.js'
import { isNotPrimitive } from './util.js'

/**
 * BaseIndexedStore is an abstract base class for implementing indexed data stores.
 *
 * It provides a generic interface for adding, retrieving and removing items
 * from a store based on a key. It also supports indexing items by additional
 * properties to enable efficient queries.
 *
 * Subclasses should implement key generation and storage.
*/
export abstract class BaseIndexedStore<
  ItemType extends IndexedStoreItemType,
  KeyParts extends Array<keyof ItemType>,
  ExtraIndices extends Array<keyof ItemType> = KeyParts,
  KeyType extends PrimitiveType = string,
  KeyFunction extends (...args: PrimitiveType[]) => KeyType = (...args: ToTuple<ItemType, KeyParts> & PrimitiveType[]) => KeyType,
> {

  protected items: Map<KeyType, ItemType> = new Map();

  protected indices: Map<keyof ItemType, Map<ItemType[keyof ItemType], ItemType[]>> = new Map();

  constructor(
    public readonly keyFor: ((item: ItemType) => KeyType),
    public readonly makeKey: KeyFunction,
    public readonly keyProps: (keyof ItemType)[],
    extraIndices: ExtraIndices = [] as ExtraIndices
  ) {
    for (const prop of extraIndices) {
      this.createIndex(prop)
    }
  }

  protected createIndex(prop: keyof ItemType): void {
    if (!this.indices.has(prop)) {
      const newIndex = new Map<any, ItemType[]>()

      for (const item of this.items.values()) {
        this.indexItem(item, prop, newIndex)
      }

      this.indices.set(prop, newIndex);
    }
  }

  protected indexItem(item: ItemType, propName: keyof ItemType, index: Map<any, ItemType[]>) {
    const propValue = item[propName as keyof ItemType];

    if (propValue !== undefined) {
      const indexValue = index.get(propValue) || []
      indexValue.push(item)
      index.set(propValue, indexValue);
    }
  }

  add(item: ItemType): void {
    const key = this.keyFor(item);
    const existingItem = this.items.get(key)

    if (existingItem && existingItem !== item) {
      throw new Error(`
Error in IndexedStore.add():
    The item you are trying to add has the same key as an existing item

    key: ${JSON.stringify(key)} (${typeof key})

    Existing item -----------------------------------
    ${JSON.stringify(existingItem, null, 4).split('\n').join('\n    ')}

    New item ----------------------------------------
    ${JSON.stringify(item, null, 4).split('\n').join('\n    ')}
`)
    }

    this.items.set(key, item);

    // Ensure all indices are in sync
    for (const [propName, index] of this.indices) {
      this.indexItem(item, propName, index)
    }
  }

  exec(callerName: keyof BaseIndexedStore<ItemType, KeyParts, ExtraIndices, KeyType, KeyFunction>, fn: (key: KeyType) => any, ...itemOrKeyOrParts: any[]): any {
    if (!itemOrKeyOrParts?.[0]) {
      throw new Error(`Invalid parameter (${JSON.stringify(itemOrKeyOrParts[0])} receive in IndexedStore.${callerName}`)
    }

    // only key parts will take more than one argument
    if (itemOrKeyOrParts.length > 1) {
      return fn(this.makeKey(...itemOrKeyOrParts));
    }

    // items are never primitive
    if (isNotPrimitive(itemOrKeyOrParts[0])) {
      return fn(this.keyFor(itemOrKeyOrParts[0]));
    }

    // a single, primitive type argument is always a key
    return fn(itemOrKeyOrParts[0]);
  }

  exists(item: ItemType): boolean;
  exists(key: KeyType): boolean;
  exists(...keyParts: ToTuple<ItemType, KeyParts>): boolean;
  exists(...args: any[]): boolean {
    return this.exec('exists', this.items.has.bind(this.items), ...args)
  }

  find(item: ItemType): ItemType | undefined;
  find(key: KeyType): ItemType | undefined;
  find(...keyParts: ToTuple<ItemType, KeyParts>): ItemType | undefined;
  find(...args: any[]): ItemType | undefined {
    return this.exec('find', this.items.get.bind(this.items), ...args)
  }

  findBy<Prop extends KeyParts[number] | ExtraIndices[number]>(indexedProperty: Prop, value: ItemType[Prop]) {
    const index = this.indices.get(indexedProperty)
    if (!index) {
      throw new Error(`
The property "${String(indexedProperty)}" is not indexed in this store.
To index it, add it the \`extraIndices\` constructor parameter

Current indices: [${Array.from(this.indices.keys()).join(', ')}]
`)
    }

    return index.get(value)
  }

  listAll(): ItemType[] {
    return Array.from(this.items.values());
  }

  remove(item: ItemType): ItemType | undefined;
  remove(key: KeyType): ItemType | undefined;
  remove(...keyParts: ToTuple<ItemType, KeyParts>): ItemType | undefined;
  remove(...args: any[]): ItemType | undefined {
    return this.exec('remove', this.removeByKey.bind(this), ...args)
  }

  private removeByKey(key: KeyType): ItemType | undefined {
    const item = this.items.get(key);
    if (!item) return undefined;

    this.items.delete(key);

    // Remove item from all indices
    for (const [propName, index] of this.indices) {
      const itemsAtIndex = index.get(item[propName])

      itemsAtIndex.filter


      Object.keys(item).forEach(prop => {
        if (this.indices[prop]) {
          const value = item[prop];
          this.indices[prop]?.delete(value);
        }
      });

      return item;
    }
  }
}