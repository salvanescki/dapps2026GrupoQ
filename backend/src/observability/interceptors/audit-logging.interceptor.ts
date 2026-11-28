import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';
import {
  extraerActorHttp,
  extraerRutaHttp,
  RequestConAuditoria,
  resolverNivelLog,
  resolverRequestId,
  ResponseConAuditoria,
} from '../config/pino-logger.config';
import { esRutaTecnicaExcluida } from '../constants/audit-events.constant';
import { AuditContextService } from '../services/audit-context.service';
import { AuditLoggerService } from '../services/audit-logger.service';
import { ResumenErrorHttp } from '../types/audit-log.types';
import {
  convertirValorATextoSeguro,
  sanitizarParametrosHttp,
  sanitizarTexto,
} from '../utils/audit-sanitizer.util';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogger: AuditLoggerService,
    private readonly auditContext: AuditContextService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<RequestConAuditoria>();
    const res = httpCtx.getResponse<ResponseConAuditoria>();

    const rutaInicial = extraerRutaHttp(req);
    const esTecnica = esRutaTecnicaExcluida(rutaInicial);
    const nivelActual = resolverNivelLog(process.env);

    if (esTecnica && nivelActual !== 'debug') {
      req.__httpAuditLogged = true;
      return next.handle();
    }

    const inicio = performance.now();
    const metodo = (req?.method || 'UNKNOWN').toUpperCase();
    const controlador = `${context.getClass()?.name ?? 'UnknownController'}.${context.getHandler()?.name ?? 'unknownHandler'}`;
    const parametros = sanitizarParametrosHttp(
      req?.params,
      req?.query,
      req?.body,
    );

    const resolverId = (): string =>
      this.auditContext.obtenerRequestId() ||
      (typeof req?.id === 'string' && req.id.trim().length > 0
        ? req.id
        : resolverRequestId(req, res));

    return next.handle().pipe(
      tap(() => {
        try {
          const tiempoEjecucion = Math.max(
            0,
            Number((performance.now() - inicio).toFixed(2)),
          );
          const codigoEstado = res?.statusCode ?? HttpStatus.OK;
          const rutaFinal = extraerRutaHttp(req);

          this.auditLogger.registrarAuditoriaHttp({
            requestId: resolverId(),
            usuario: extraerActorHttp(req?.user),
            operacion: {
              metodo,
              ruta: rutaFinal,
              controlador,
            },
            parametros,
            codigoEstado,
            tiempoEjecucion,
            esRutaTecnica: esTecnica,
          });
        } catch {
          // Aislamiento fail-safe (FR-011)
        } finally {
          if (req) {
            req.__httpAuditLogged = true;
          }
        }
      }),
      catchError((error: unknown) => {
        try {
          const tiempoEjecucion = Math.max(
            0,
            Number((performance.now() - inicio).toFixed(2)),
          );
          const resumenError = this.extraerResumenError(error);
          const rutaFinal = extraerRutaHttp(req);

          this.auditLogger.registrarAuditoriaHttp({
            requestId: resolverId(),
            usuario: extraerActorHttp(req?.user),
            operacion: {
              metodo,
              ruta: rutaFinal,
              controlador,
            },
            parametros,
            codigoEstado: resumenError.codigoEstado,
            tiempoEjecucion,
            error: resumenError,
            esRutaTecnica: esTecnica,
          });
        } catch {
          // Aislamiento fail-safe (FR-011)
        } finally {
          if (req) {
            req.__httpAuditLogged = true;
          }
        }

        return throwError(() => error);
      }),
    );
  }

  private extraerResumenError(error: unknown): ResumenErrorHttp {
    if (error instanceof HttpException) {
      const codigoEstado = error.getStatus();
      const respuesta = error.getResponse();
      let mensaje: string | string[] = error.message;

      if (typeof respuesta === 'string') {
        mensaje = sanitizarTexto(respuesta);
      } else if (
        typeof respuesta === 'object' &&
        respuesta !== null &&
        'message' in respuesta
      ) {
        const msg = (respuesta as { message?: unknown }).message;
        if (Array.isArray(msg)) {
          mensaje = msg.map((item) => sanitizarTexto(String(item)));
        } else if (msg !== undefined && msg !== null) {
          mensaje = sanitizarTexto(convertirValorATextoSeguro(msg));
        }
      } else {
        mensaje = sanitizarTexto(error.message);
      }

      return { codigoEstado, mensaje };
    }

    if (error instanceof ReglaDeNegocioException) {
      return {
        codigoEstado: HttpStatus.BAD_REQUEST,
        mensaje: sanitizarTexto(error.message),
      };
    }

    if (error instanceof Error) {
      return {
        codigoEstado: HttpStatus.INTERNAL_SERVER_ERROR,
        mensaje: sanitizarTexto(error.message),
      };
    }

    return {
      codigoEstado: HttpStatus.INTERNAL_SERVER_ERROR,
      mensaje: sanitizarTexto(convertirValorATextoSeguro(error)),
    };
  }
}
