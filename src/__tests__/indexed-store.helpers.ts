// In a file like __tests__/helpers/SimpleIndexedStore.ts
import { BaseIndexedStore, IndexedStoreItemType, PrimitiveType } from '../indexed-store';

type TestItem = { id: string; name: string; age: number; };
type KeyParts = ['id'];
type ExtraIndices = ['name', 'age'];

class SimpleIndexedStore extends BaseIndexedStore<TestItem, KeyParts, ExtraIndices> {
  constructor() {
    super(
      item => item.id, // keyFor
      id => id, // makeKey
      ['id'], // keyProperties
      ['name', 'age'] // extraIndices
    )
    /*

      ['name', 'age'], //
      ['name', 'age'] // extraIndices
      */
  }
}

export { TestItem, SimpleIndexedStore };
