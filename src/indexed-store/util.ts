import { createHash } from "node:crypto"

export function hashKeyParts(...args: any[]): string {
  // Utilizing SHA-256 for hashing
  return createHash('sha256').update(args.join('::')).digest('hex');
}

export function joinParts(item: any, keys: any[], glue: string) {
  return keys.map(k => item[k]).join(glue);
}

export function isNotPrimitive(value: any): boolean {
  return typeof value === 'object' && value !== null || typeof value === 'function';
}

export function isPrimitive(value: any): boolean {
  return !(isNotPrimitive(value));
}