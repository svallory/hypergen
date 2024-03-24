export type IndexMaps<ItemType> = {
  [P in keyof ItemType]: Map<ItemType[P], ItemType>;
};

export type ToTuple<T, K extends keyof T | Array<keyof T>> = K extends any[] ? {
  [Index in keyof K]: K[Index] extends keyof T ? T[K[Index]] : never;
} : K extends keyof T ? [T[K]] : never;

export type IndexedStoreItemType = object | Function

export type PrimitiveType = string |
  number |
  boolean |
  symbol |
  bigint;