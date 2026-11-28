import { HttpException } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';
import { AuditContextService } from '../services/audit-context.service';
import { AuditLoggerService } from '../services/audit-logger.service';
import {
  NombreEventoNegocio,
  OpcionesAspectoAuditoria,
  OrigenEventoNegocio,
  ResultadoAuditoriaNegocio,
} from '../types/audit-log.types';
import { sanitizarTexto } from '../utils/audit-sanitizer.util';
import { AuditAspectRegistry } from './audit-aspect.registry';

const AUDIT_EVENTOS_ERROR_SYMBOL = Symbol('AUDIT_EVENTOS_ERROR');

function fueErrorAuditadoParaEvento(
  error: unknown,
  evento: NombreEventoNegocio,
): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const eventos = (error as Record<symbol, unknown>)[
    AUDIT_EVENTOS_ERROR_SYMBOL
  ];
  return eventos instanceof Set && eventos.has(evento);
}

function marcarErrorAuditadoParaEvento(
  error: unknown,
  evento: NombreEventoNegocio,
): void {
  if (!error || typeof error !== 'object') {
    return;
  }
  const registro = error as Record<symbol, unknown>;
  let eventos = registro[AUDIT_EVENTOS_ERROR_SYMBOL];
  if (!(eventos instanceof Set)) {
    eventos = new Set<NombreEventoNegocio>();
    try {
      Object.defineProperty(error, AUDIT_EVENTOS_ERROR_SYMBOL, {
        value: eventos,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    } catch {
      return;
    }
  }
  (eventos as Set<NombreEventoNegocio>).add(evento);
}

function resolverOrigen(
  opciones: OpcionesAspectoAuditoria,
  args: unknown[],
  metadatos: Record<string, unknown>,
): OrigenEventoNegocio {
  if (typeof opciones.origen === 'function') {
    return opciones.origen(args, metadatos);
  }
  return opciones.origen;
}

function clasificarError(error: unknown): {
  resultado: ResultadoAuditoriaNegocio;
  motivo: string;
} {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const resultado: ResultadoAuditoriaNegocio =
      status >= 400 && status < 500 ? 'RECHAZADO' : 'FALLIDO';
    const respuesta = error.getResponse();
    let mensaje = error.message;
    if (typeof respuesta === 'string') {
      mensaje = respuesta;
    } else if (
      typeof respuesta === 'object' &&
      respuesta !== null &&
      'message' in respuesta
    ) {
      const msg = (respuesta as { message?: unknown }).message;
      mensaje = Array.isArray(msg)
        ? msg.map(String).join('; ')
        : String(msg ?? error.message);
    }
    return { resultado, motivo: sanitizarTexto(mensaje) };
  }

  if (error instanceof ReglaDeNegocioException) {
    return {
      resultado: 'RECHAZADO',
      motivo: sanitizarTexto(error.message),
    };
  }

  if (error instanceof Error) {
    return {
      resultado: 'FALLIDO',
      motivo: sanitizarTexto(error.message),
    };
  }

  return {
    resultado: 'FALLIDO',
    motivo: sanitizarTexto(String(error)),
  };
}

function emitirExito(
  logger: AuditLoggerService,
  context: AuditContextService | null,
  opciones: OpcionesAspectoAuditoria,
  resultadoMetodo: unknown,
  args: unknown[],
  inicio: number,
): void {
  try {
    const metadatos = context ? context.obtenerMetadatos() : {};
    if (
      opciones.debeEmitir &&
      !opciones.debeEmitir(resultadoMetodo, args, metadatos)
    ) {
      return;
    }

    const tiempoEjecucion = Math.max(
      0,
      Number((performance.now() - inicio).toFixed(2)),
    );
    const origen = resolverOrigen(opciones, args, metadatos);
    const usuarioId = opciones.extraerUsuarioId
      ? opciones.extraerUsuarioId(args, metadatos)
      : null;
    const extraido = opciones.extraerResultadoExito(
      resultadoMetodo,
      args,
      metadatos,
    );

    logger.registrarEventoNegocio({
      evento: opciones.evento,
      origen,
      usuarioId: usuarioId ?? null,
      resultado: extraido.resultado,
      motivo: extraido.motivo ?? null,
      tiempoEjecucion,
      datos: extraido.datos,
    });
  } catch {
    // Aislamiento fail-safe (FR-011)
  }
}

function emitirError(
  logger: AuditLoggerService,
  context: AuditContextService | null,
  opciones: OpcionesAspectoAuditoria,
  error: unknown,
  args: unknown[],
  inicio: number,
): void {
  try {
    if (fueErrorAuditadoParaEvento(error, opciones.evento)) {
      return;
    }

    const metadatos = context ? context.obtenerMetadatos() : {};
    if (
      opciones.debeEmitirError &&
      !opciones.debeEmitirError(error, args, metadatos)
    ) {
      return;
    }

    const tiempoEjecucion = Math.max(
      0,
      Number((performance.now() - inicio).toFixed(2)),
    );
    const origen = resolverOrigen(opciones, args, metadatos);
    const usuarioId = opciones.extraerUsuarioId
      ? opciones.extraerUsuarioId(args, metadatos)
      : null;
    const { resultado, motivo } = clasificarError(error);
    const datos = opciones.extraerDatosError
      ? opciones.extraerDatosError(error, args, metadatos)
      : {};

    marcarErrorAuditadoParaEvento(error, opciones.evento);

    logger.registrarEventoNegocio({
      evento: opciones.evento,
      origen,
      usuarioId: usuarioId ?? null,
      resultado,
      motivo,
      tiempoEjecucion,
      datos,
    });
  } catch {
    // Aislamiento fail-safe (FR-011)
  }
}

export function AuditarOperacion<
  TResultado = any,
  TArgs extends unknown[] = any[],
>(opciones: OpcionesAspectoAuditoria<TResultado, TArgs>): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    const wrapper = function (this: unknown, ...args: unknown[]) {
      const self = this as {
        auditLogger?: AuditLoggerService;
        auditContext?: AuditContextService;
      };
      const logger = self?.auditLogger ?? AuditAspectRegistry.getLogger();
      if (!logger) {
        return originalMethod.apply(this, args);
      }

      const context = self?.auditContext ?? AuditAspectRegistry.getContext();
      const ejecutar = () => {
        const inicio = performance.now();
        try {
          const retorno = originalMethod.apply(this, args);
          if (retorno && typeof (retorno as Promise<unknown>).then === 'function') {
            return (retorno as Promise<unknown>).then(
              (res) => {
                emitirExito(logger, context, opciones, res, args, inicio);
                return res;
              },
              (err) => {
                emitirError(logger, context, opciones, err, args, inicio);
                throw err;
              },
            );
          }
          emitirExito(logger, context, opciones, retorno, args, inicio);
          return retorno;
        } catch (err) {
          emitirError(logger, context, opciones, err, args, inicio);
          throw err;
        }
      };

      return context ? context.ejecutarEnAlcanceOperacion(ejecutar) : ejecutar();
    };

    for (const key of Reflect.getMetadataKeys(originalMethod)) {
      const metadata = Reflect.getMetadata(key, originalMethod);
      Reflect.defineMetadata(key, metadata, wrapper);
    }

    descriptor.value = wrapper;
    return descriptor;
  };
}
