import { BaseIndexedStore } from './IndexedStore';
import { hashKeyParts } from './util';

export class HashIndexedStore<
  ItemType extends object | Function,
  KeyParts extends Array<keyof ItemType>,
  ExtraIndexes extends Array<keyof ItemType> = KeyParts
> extends BaseIndexedStore<ItemType, KeyParts, ExtraIndexes, string, (...args: any[]) => string> {

  constructor(
    protected readonly keyParts: KeyParts,
    extraIndexes: ExtraIndexes = [] as ExtraIndexes
  ) {
    super(
      (item: ItemType) => hashKeyParts(...keyParts.map(k => item[k])),
      (...args: any[]) => hashKeyParts(...args),
      keyParts,
      extraIndexes
    );
  }
}
