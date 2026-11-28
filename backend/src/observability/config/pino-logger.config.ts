import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import {
  esRutaTecnicaExcluida,
  REGEX_REQUEST_ID_VALIDO,
  SERVICIO_AUDITORIA,
  TIPO_EVENTO_AUDITORIA,
  VALOR_REDACTADO,
} from '../constants/audit-events.constant';
import { ActorAuditoriaHttp, ResumenErrorHttp } from '../types/audit-log.types';
import {
  sanitizarParametrosHttp,
  sanitizarTexto,
} from '../utils/audit-sanitizer.util';

export interface RequestConAuditoria extends IncomingMessage {
  originalUrl?: string;
  baseUrl?: string;
  route?: { path?: string };
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: Record<string, unknown>;
  __httpAuditLogged?: boolean;
}

export interface ResponseConAuditoria extends ServerResponse {
  locals?: Record<string, unknown> & {
    auditError?: ResumenErrorHttp;
  };
}

const REGEX_CARACTERES_REQUEST_ID = /^[a-zA-Z0-9._:-]+$/;

export function resolverRequestId(
  req: Partial<RequestConAuditoria>,
  res?: Partial<ResponseConAuditoria>,
): string {
  const rawHeader = req.headers?.['x-request-id'];
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  let requestId: string | null = null;
  if (typeof headerValue === 'string') {
    const trimmed = headerValue.trim();
    if (trimmed.length > 0 && REGEX_CARACTERES_REQUEST_ID.test(trimmed)) {
      const truncated = trimmed.slice(0, 128);
      if (REGEX_REQUEST_ID_VALIDO.test(truncated)) {
        requestId = truncated;
      }
    }
  }

  const finalId = requestId ?? randomUUID();

  if (
    res &&
    typeof res.setHeader === 'function' &&
    !(res as ServerResponse).headersSent
  ) {
    try {
      res.setHeader('x-request-id', finalId);
    } catch {
      // fail-safe
    }
  }

  return finalId;
}

export function extraerActorHttp(
  user?: Record<string, unknown> | null,
): ActorAuditoriaHttp {
  const idRaw = user?.id ?? user?.sub;
  if (user && idRaw !== undefined && idRaw !== null && String(idRaw).trim()) {
    const emailRaw = user.email ?? user.correo;
    const rolRaw = user.rol ?? user.role;
    return {
      autenticado: true,
      id: String(idRaw),
      email:
        emailRaw !== undefined && emailRaw !== null ? String(emailRaw) : null,
      rol: rolRaw !== undefined && rolRaw !== null ? String(rolRaw) : null,
    };
  }

  return {
    autenticado: false,
    tipo: 'ANONIMO',
    id: null,
    email: null,
    rol: null,
  };
}

export function extraerRutaHttp(req: Partial<RequestConAuditoria>): string {
  if (req.route?.path) {
    const base = req.baseUrl || '';
    return `${base}${req.route.path}`;
  }
  const urlCruda = req.originalUrl || req.url || '/';
  return urlCruda.split('?')[0] || '/';
}

export function resolverNivelLog(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const nivelExplicito = env.LOG_LEVEL?.trim();
  if (nivelExplicito) {
    return nivelExplicito;
  }
  const entorno = env.NODE_ENV || 'development';
  return entorno === 'test' ? 'silent' : 'info';
}

export function createPinoLoggerConfig(
  env: NodeJS.ProcessEnv = process.env,
  stream?: DestinationStream,
): Params {
  const entorno = env.NODE_ENV || 'development';
  const level = resolverNivelLog(env);
  const usarPretty =
    entorno === 'development' && env.LOG_PRETTY !== 'false' && !stream;

  const pinoHttpOptions: Record<string, unknown> = {
    level,
    base: {
      servicio: SERVICIO_AUDITORIA,
      entorno,
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.headers["x-auth-token"]',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.contrasena',
        'req.body.contraseña',
        'req.body.token',
        'req.query.token',
        'req.query.password',
        'req.query.contrasena',
      ],
      censor: VALOR_REDACTADO,
    },
    quietReqLogger: true,
    quietResLogger: true,
    wrapSerializers: false,
    serializers: {
      req: () => undefined,
      res: () => undefined,
      err: () => undefined,
    },
    customAttributeKeys: {
      responseTime: 'tiempoEjecucion',
      reqId: 'requestId',
    },
    genReqId: (req: RequestConAuditoria, res: ResponseConAuditoria) =>
      resolverRequestId(req, res),
    autoLogging: {
      ignore: (req: RequestConAuditoria) => {
        if (req?.__httpAuditLogged === true) {
          return true;
        }
        const ruta = extraerRutaHttp(req);
        return esRutaTecnicaExcluida(ruta) && level !== 'debug';
      },
    },
    customLogLevel: (
      req: RequestConAuditoria,
      res: ResponseConAuditoria,
      err?: Error,
    ) => {
      if (req?.__httpAuditLogged === true) {
        return 'silent';
      }
      const ruta = extraerRutaHttp(req);
      if (esRutaTecnicaExcluida(ruta)) {
        return level === 'debug' ? 'debug' : 'silent';
      }
      const status = res?.statusCode ?? (err ? 500 : 200);
      if (err || status >= 500) {
        return 'error';
      }
      if (status >= 400) {
        return 'warn';
      }
      return 'info';
    },
    customSuccessMessage: (
      req: RequestConAuditoria,
      res: ResponseConAuditoria,
    ) => {
      const metodo = (req?.method || 'UNKNOWN').toUpperCase();
      const ruta = extraerRutaHttp(req);
      return `HTTP ${metodo} ${ruta} ${res?.statusCode ?? 200}`;
    },
    customErrorMessage: (
      req: RequestConAuditoria,
      res: ResponseConAuditoria,
    ) => {
      const metodo = (req?.method || 'UNKNOWN').toUpperCase();
      const ruta = extraerRutaHttp(req);
      return `HTTP ${metodo} ${ruta} ${res?.statusCode ?? 500}`;
    },
    customSuccessObject: (
      _req: RequestConAuditoria,
      _res: ResponseConAuditoria,
      val: Record<string, unknown>,
    ) => ({
      tiempoEjecucion: Math.max(0, Number(val?.tiempoEjecucion ?? 0)),
    }),
    customErrorObject: (
      _req: RequestConAuditoria,
      _res: ResponseConAuditoria,
      _err: Error,
      val: Record<string, unknown>,
    ) => ({
      tiempoEjecucion: Math.max(0, Number(val?.tiempoEjecucion ?? 0)),
    }),
    customProps: (req: RequestConAuditoria, res: ResponseConAuditoria) => {
      try {
        const codigoEstado = res?.statusCode ?? 200;
        const metodo = (req?.method || 'UNKNOWN').toUpperCase();
        const ruta = extraerRutaHttp(req);
        const props: Record<string, unknown> = {
          tipoEvento: TIPO_EVENTO_AUDITORIA.HTTP,
          usuario: extraerActorHttp(req?.user),
          operacion: {
            metodo,
            ruta,
            controlador: null,
          },
          parametros: sanitizarParametrosHttp(
            req?.params,
            req?.query,
            req?.body,
          ),
          codigoEstado,
        };

        if (codigoEstado >= 400) {
          const auditError = res?.locals?.auditError;
          if (auditError) {
            props.error = {
              codigoEstado: auditError.codigoEstado ?? codigoEstado,
              mensaje: Array.isArray(auditError.mensaje)
                ? auditError.mensaje.map((m) => sanitizarTexto(String(m)))
                : sanitizarTexto(String(auditError.mensaje)),
            };
          } else {
            props.error = {
              codigoEstado,
              mensaje: sanitizarTexto(
                res?.statusMessage || `HTTP ${codigoEstado}`,
              ),
            };
          }
        }

        return props;
      } catch {
        return {
          tipoEvento: TIPO_EVENTO_AUDITORIA.HTTP,
        };
      }
    },
  };

  if (usarPretty) {
    pinoHttpOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: false,
        translateTime: 'SYS:standard',
      },
    };
  }

  if (stream) {
    pinoHttpOptions.stream = stream;
  }

  return {
    pinoHttp: pinoHttpOptions as Params['pinoHttp'],
  };
}
