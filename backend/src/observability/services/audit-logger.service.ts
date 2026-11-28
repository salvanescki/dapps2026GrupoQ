import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TIPO_EVENTO_AUDITORIA } from '../constants/audit-events.constant';
import {
  EntradaAuditoriaHttp,
  EntradaEventoNegocio,
  ResumenErrorHttp,
} from '../types/audit-log.types';
import {
  sanitizarParametrosHttp,
  sanitizarTexto,
  sanitizarValor,
} from '../utils/audit-sanitizer.util';
import { AuditContextService } from './audit-context.service';

@Injectable()
export class AuditLoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly auditContext: AuditContextService,
  ) {}

  registrarAuditoriaHttp(entrada: EntradaAuditoriaHttp): void {
    try {
      const requestId =
        entrada.requestId ||
        this.auditContext.obtenerRequestId() ||
        'sin-request-id';

      const parametros = sanitizarParametrosHttp(
        entrada.parametros?.ruta,
        entrada.parametros?.consulta,
        entrada.parametros?.cuerpo,
      );

      const tiempoEjecucion = Math.max(
        0,
        Number(Number(entrada.tiempoEjecucion ?? 0).toFixed(2)),
      );

      const payload: Record<string, unknown> = {
        tipoEvento: TIPO_EVENTO_AUDITORIA.HTTP,
        requestId,
        usuario: entrada.usuario,
        operacion: {
          metodo: entrada.operacion.metodo,
          ruta: entrada.operacion.ruta,
          controlador: entrada.operacion.controlador ?? null,
        },
        parametros,
        codigoEstado: entrada.codigoEstado,
        tiempoEjecucion,
      };

      if (entrada.codigoEstado >= 400 && entrada.error) {
        payload.error = this.sanitizarErrorHttp(entrada.error);
      }

      const msg =
        entrada.msg ??
        `HTTP ${entrada.operacion.metodo} ${entrada.operacion.ruta} ${entrada.codigoEstado}`;

      if (entrada.esRutaTecnica) {
        this.logger.debug(payload, msg);
      } else if (entrada.codigoEstado >= 500) {
        this.logger.error(payload, msg);
      } else if (entrada.codigoEstado >= 400) {
        this.logger.warn(payload, msg);
      } else {
        this.logger.info(payload, msg);
      }
    } catch {
      // Aislamiento fail-safe (FR-011): un fallo de auditoria jamas interrumpe el flujo HTTP
    }
  }

  registrarEventoNegocio(entrada: EntradaEventoNegocio): void {
    try {
      const requestId =
        entrada.requestId ?? this.auditContext.obtenerRequestId();

      const datosSanitizados = sanitizarValor(entrada.datos ?? {});
      const datos =
        datosSanitizados &&
        typeof datosSanitizados === 'object' &&
        !Array.isArray(datosSanitizados)
          ? (datosSanitizados as Record<string, unknown>)
          : {};

      const motivo =
        entrada.motivo !== null && entrada.motivo !== undefined
          ? sanitizarTexto(String(entrada.motivo))
          : null;

      const tiempoEjecucion = Math.max(
        0,
        Number(Number(entrada.tiempoEjecucion ?? 0).toFixed(2)),
      );

      const payload: Record<string, unknown> = {
        tipoEvento: TIPO_EVENTO_AUDITORIA.NEGOCIO,
        evento: entrada.evento,
        requestId,
        origen: entrada.origen,
        usuarioId: entrada.usuarioId ?? null,
        resultado: entrada.resultado,
        motivo,
        tiempoEjecucion,
        datos,
      };

      const msg =
        entrada.msg ?? `BUSINESS ${entrada.evento} ${entrada.resultado}`;

      if (entrada.resultado === 'FALLIDO') {
        this.logger.error(payload, msg);
      } else if (
        entrada.resultado === 'RECHAZADO' ||
        entrada.resultado === 'OMITIDO'
      ) {
        this.logger.warn(payload, msg);
      } else {
        this.logger.info(payload, msg);
      }
    } catch {
      // Aislamiento fail-safe (FR-011): un fallo de auditoria jamas interrumpe el negocio
    }
  }

  private sanitizarErrorHttp(error: ResumenErrorHttp): ResumenErrorHttp {
    const mensaje = Array.isArray(error.mensaje)
      ? error.mensaje.map((item) => sanitizarTexto(String(item)))
      : sanitizarTexto(String(error.mensaje));

    return {
      codigoEstado: error.codigoEstado,
      mensaje,
    };
  }
}
