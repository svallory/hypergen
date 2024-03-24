// In __tests__/SimpleIndexedStore.test.ts
import { SimpleIndexedStore, TestItem } from './indexed-store.helpers';

describe('SimpleIndexedStore', () => {
  let store: SimpleIndexedStore;
  const item: TestItem = { id: '1', name: 'Test Name', age: 30 };

  beforeEach(() => {
    store = new SimpleIndexedStore();
  });

  describe('add()', () => {
    it('should add an item successfully', () => {
      expect(() => store.add(item)).not.toThrow();
      expect(store.exists(item.id)).toBe(true);
    });

    it('should throw an error when adding an item with a duplicate key', () => {
      store.add(item);
      expect(() => store.add({ ...item })).toThrow();
    });
  });

  describe('exists()', () => {
    beforeEach(() => {
      store.add(item);
    });

    it('should return true for an existing item by item', () => {
      expect(store.exists(item)).toBe(true);
    });

    it('should return true for an existing item by key', () => {
      expect(store.exists(item.id)).toBe(true);
    });

    it('should return false for a non-existing item', () => {
      expect(store.exists('non-existing')).toBe(false);
    });
  });

  describe('find()', () => {
    beforeEach(() => {
      store.add(item);
    });

    it('should find an item by key', () => {
      expect(store.find(item.id)).toEqual(item);
    });

    it('should return undefined for a non-existing key', () => {
      expect(store.find('non-existing')).toBeUndefined();
    });
  });

  describe('findBy()', () => {
    beforeEach(() => {
      store.add(item);
    });

    it('should find items by indexed property', () => {
      const results = store.findBy('name', item.name);
      expect(results).toContainEqual(item);
    });

    it('should throw an error for a non-indexed property', () => {
      expect(() => store.findBy('nonIndexedProperty' as keyof TestItem, 'value')).toThrow();
    });
  });

  describe('listAll()', () => {
    it('should list all items', () => {
      store.add(item);
      expect(store.listAll()).toEqual([item]);
    });
  });

  describe('remove()', () => {
    beforeEach(() => {
      store.add(item);
    });

    it('should remove an item by key', () => {
      expect(store.remove(item.id)).toEqual(item);
      expect(store.exists(item.id)).toBe(false);
    });

    it('should return undefined when removing a non-existing item', () => {
      expect(store.remove('non-existing')).toBeUndefined();
    });
  });

  // Additional tests should cover `exec()` and protected methods as needed, possibly by extending the SimpleIndexedStore to expose them for testing.
});
