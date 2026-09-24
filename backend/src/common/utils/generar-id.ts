import { randomUUID } from 'node:crypto';

export function generarId(): string {
  return randomUUID();
}