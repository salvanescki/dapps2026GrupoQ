import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface ContextoAuditoria {
  requestId: string | null;
  metadatosOperacion: Record<string, unknown>;
}

@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<ContextoAuditoria>();

  ejecutarEnContexto<T>(requestId: string | null, fn: () => T): T {
    return this.storage.run(
      {
        requestId,
        metadatosOperacion: {},
      },
      fn,
    );
  }

  ejecutarEnAlcanceOperacion<T>(fn: () => T): T {
    const actual = this.storage.getStore();
    const nuevoContexto: ContextoAuditoria = {
      requestId: actual?.requestId ?? null,
      metadatosOperacion: {},
    };
    return this.storage.run(nuevoContexto, fn);
  }

  obtenerRequestId(): string | null {
    return this.storage.getStore()?.requestId ?? null;
  }

  registrarMetadatos(metadatos: Record<string, unknown>): void {
    const actual = this.storage.getStore();
    if (!actual || !metadatos || typeof metadatos !== 'object') {
      return;
    }
    Object.assign(actual.metadatosOperacion, metadatos);
  }

  obtenerMetadatos(): Record<string, unknown> {
    const actual = this.storage.getStore();
    return actual ? { ...actual.metadatosOperacion } : {};
  }
}
