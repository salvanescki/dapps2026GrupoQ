import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';
import { AuditLoggingInterceptor } from '../../../src/observability/interceptors/audit-logging.interceptor';
import { AuditContextMiddleware } from '../../../src/observability/middleware/audit-context.middleware';
import { AuditContextService } from '../../../src/observability/services/audit-context.service';
import { AuditLoggerService } from '../../../src/observability/services/audit-logger.service';

describe('AuditLoggingInterceptor & AuditContextMiddleware', () => {
  let auditContext: AuditContextService;
  let registrarAuditoriaHttp: jest.Mock;
  let interceptor: AuditLoggingInterceptor;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production', LOG_LEVEL: 'info' };
    auditContext = new AuditContextService();
    registrarAuditoriaHttp = jest.fn();
    interceptor = new AuditLoggingInterceptor(
      { registrarAuditoriaHttp } as unknown as AuditLoggerService,
      auditContext,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function crearContextoHttp(
    req: Record<string, any>,
    res: Record<string, any> = { statusCode: 200 },
    type = 'http',
  ): ExecutionContext {
    class OrdersController {
      comprar() {}
    }
    return {
      getType: () => type,
      getClass: () => OrdersController,
      getHandler: () => OrdersController.prototype.comprar,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  }

  describe('AuditContextMiddleware', () => {
    it('propaga x-request-id existente o genera uno nuevo y establece el header de respuesta', () => {
      const middleware = new AuditContextMiddleware(auditContext);
      const req: any = { headers: { 'x-request-id': 'req-middleware-01' } };
      const res: any = { setHeader: jest.fn(), headersSent: false };

      let capturedId: string | null = null;
      middleware.use(req, res, () => {
        capturedId = auditContext.obtenerRequestId();
      });

      expect(capturedId).toBe('req-middleware-01');
      expect(req.id).toBe('req-middleware-01');
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-request-id',
        'req-middleware-01',
      );
    });

    it('reutiliza req.id si pino-http ya lo asigno', () => {
      const middleware = new AuditContextMiddleware(auditContext);
      const req: any = { id: 'existing-pino-id', headers: {} };
      const res: any = { setHeader: jest.fn(), headersSent: false };

      let capturedId: string | null = null;
      middleware.use(req, res, () => {
        capturedId = auditContext.obtenerRequestId();
      });

      expect(capturedId).toBe('existing-pino-id');
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-request-id',
        'existing-pino-id',
      );
    });
  });

  describe('AuditLoggingInterceptor', () => {
    it('ignora contextos que no son HTTP', async () => {
      const ctx = crearContextoHttp({}, {}, 'rpc');
      const res = await lastValueFrom(
        interceptor.intercept(ctx, { handle: () => of('ok') }),
      );
      expect(res).toBe('ok');
      expect(registrarAuditoriaHttp).not.toHaveBeenCalled();
    });

    it('emite HTTP_AUDIT para 2xx autenticado, sanitiza parametros y marca req.__httpAuditLogged', async () => {
      const req: any = {
        method: 'POST',
        baseUrl: '/orders',
        route: { path: '/buy' },
        params: { id: 'p1' },
        query: { modo: 'rapido' },
        body: { jugadorId: 'j1', contrasena: 'secret' },
        user: { id: 'user-1', correo: 'user@test.com', rol: 'USUARIO' },
        headers: {},
      };
      const ctx = crearContextoHttp(req, { statusCode: 201 });

      const resultado = await auditContext.ejecutarEnContexto(
        'req-http-1',
        () =>
          lastValueFrom(
            interceptor.intercept(ctx, { handle: () => of({ ok: true }) }),
          ),
      );

      expect(resultado).toEqual({ ok: true });
      expect(req.__httpAuditLogged).toBe(true);
      expect(registrarAuditoriaHttp).toHaveBeenCalledTimes(1);
      expect(registrarAuditoriaHttp.mock.calls[0][0]).toMatchObject({
        requestId: 'req-http-1',
        usuario: {
          autenticado: true,
          id: 'user-1',
          email: 'user@test.com',
          rol: 'USUARIO',
        },
        operacion: {
          metodo: 'POST',
          ruta: '/orders/buy',
          controlador: 'OrdersController.comprar',
        },
        parametros: {
          ruta: { id: 'p1' },
          consulta: { modo: 'rapido' },
          cuerpo: { jugadorId: 'j1', contrasena: '[REDACTED]' },
        },
        codigoEstado: 201,
        esRutaTecnica: false,
      });
      expect(
        registrarAuditoriaHttp.mock.calls[0][0].tiempoEjecucion,
      ).toBeGreaterThanOrEqual(0);
    });

    it('registra errores 4xx (HttpException y ReglaDeNegocioException) y 5xx re-lanzandolos intactos', async () => {
      const req400: any = {
        method: 'POST',
        originalUrl: '/orders/buy',
        headers: {},
      };
      const err400 = new BadRequestException(['Campo invalido']);
      await expect(
        lastValueFrom(
          interceptor.intercept(crearContextoHttp(req400), {
            handle: () => throwError(() => err400),
          }),
        ),
      ).rejects.toBe(err400);

      expect(req400.__httpAuditLogged).toBe(true);
      expect(registrarAuditoriaHttp.mock.calls[0][0]).toMatchObject({
        usuario: { autenticado: false, tipo: 'ANONIMO', id: null },
        codigoEstado: 400,
        error: { codigoEstado: 400, mensaje: ['Campo invalido'] },
      });

      const reqRegla: any = {
        method: 'POST',
        originalUrl: '/orders/buy',
        headers: {},
      };
      const errRegla = new ReglaDeNegocioException('Saldo insuficiente');
      await expect(
        lastValueFrom(
          interceptor.intercept(crearContextoHttp(reqRegla), {
            handle: () => throwError(() => errRegla),
          }),
        ),
      ).rejects.toBe(errRegla);
      expect(registrarAuditoriaHttp.mock.calls[1][0]).toMatchObject({
        codigoEstado: 400,
        error: { codigoEstado: 400, mensaje: 'Saldo insuficiente' },
      });

      const req500: any = {
        method: 'GET',
        originalUrl: '/players',
        headers: {},
      };
      const err500 = new InternalServerErrorException('Fallo inesperado');
      await expect(
        lastValueFrom(
          interceptor.intercept(crearContextoHttp(req500), {
            handle: () => throwError(() => err500),
          }),
        ),
      ).rejects.toBe(err500);
      expect(registrarAuditoriaHttp.mock.calls[2][0]).toMatchObject({
        codigoEstado: 500,
        error: { codigoEstado: 500, mensaje: 'Fallo inesperado' },
      });
    });

    it('excluye rutas tecnicas en LOG_LEVEL=info y las emite en LOG_LEVEL=debug', async () => {
      const reqHealth: any = {
        method: 'GET',
        originalUrl: '/health/live',
        headers: {},
      };
      await lastValueFrom(
        interceptor.intercept(crearContextoHttp(reqHealth), {
          handle: () => of({ status: 'ok' }),
        }),
      );
      expect(reqHealth.__httpAuditLogged).toBe(true);
      expect(registrarAuditoriaHttp).not.toHaveBeenCalled();

      process.env.LOG_LEVEL = 'debug';
      const reqMetrics: any = {
        method: 'GET',
        originalUrl: '/metrics',
        headers: {},
      };
      await lastValueFrom(
        interceptor.intercept(crearContextoHttp(reqMetrics), {
          handle: () => of('metrics'),
        }),
      );
      expect(registrarAuditoriaHttp).toHaveBeenCalledTimes(1);
      expect(registrarAuditoriaHttp.mock.calls[0][0].esRutaTecnica).toBe(true);
    });

    it('es fail-safe si AuditLoggerService lanza excepcion', async () => {
      registrarAuditoriaHttp.mockImplementationOnce(() => {
        throw new Error('Logger roto');
      });
      const req: any = {
        method: 'GET',
        originalUrl: '/players',
        headers: {},
      };

      const res = await lastValueFrom(
        interceptor.intercept(crearContextoHttp(req), {
          handle: () => of({ items: [] }),
        }),
      );
      expect(res).toEqual({ items: [] });
      expect(req.__httpAuditLogged).toBe(true);
    });

    it('cubre variantes de HttpException (string, objeto sin message, message null), errores primitivos, req.id y fail-safe en catchError', async () => {
      const reqStr: any = { id: 'req-from-pino', headers: {} };
      const errStr = new HttpException('Error string plano', 422);
      await expect(
        lastValueFrom(
          interceptor.intercept(crearContextoHttp(reqStr, {}), {
            handle: () => throwError(() => errStr),
          }),
        ),
      ).rejects.toBe(errStr);
      expect(registrarAuditoriaHttp.mock.calls[0][0]).toMatchObject({
        requestId: 'req-from-pino',
        operacion: { metodo: 'UNKNOWN' },
        codigoEstado: 422,
        error: { codigoEstado: 422, mensaje: 'Error string plano' },
      });

      const errObjSinMsg = new HttpException({ detalle: 'sin-msg' }, 409);
      await expect(
        lastValueFrom(
          interceptor.intercept(
            crearContextoHttp({ method: 'PUT', originalUrl: '/x', headers: {} }),
            { handle: () => throwError(() => errObjSinMsg) },
          ),
        ),
      ).rejects.toBe(errObjSinMsg);
      expect(registrarAuditoriaHttp.mock.calls[1][0].codigoEstado).toBe(409);

      const errMsgNull = new HttpException({ message: null }, 400);
      await expect(
        lastValueFrom(
          interceptor.intercept(
            crearContextoHttp({ method: 'POST', originalUrl: '/y', headers: {} }),
            { handle: () => throwError(() => errMsgNull) },
          ),
        ),
      ).rejects.toBe(errMsgNull);
      expect(registrarAuditoriaHttp.mock.calls[2][0].codigoEstado).toBe(400);

      await expect(
        lastValueFrom(
          interceptor.intercept(
            crearContextoHttp({ method: 'GET', originalUrl: '/z', headers: {} }),
            { handle: () => throwError(() => 'fallo-primitivo') },
          ),
        ),
      ).rejects.toBe('fallo-primitivo');
      expect(registrarAuditoriaHttp.mock.calls[3][0]).toMatchObject({
        codigoEstado: 500,
        error: { codigoEstado: 500, mensaje: 'fallo-primitivo' },
      });

      // Fail-safe en catchError cuando auditLogger falla
      registrarAuditoriaHttp.mockImplementationOnce(() => {
        throw new Error('Logger caido en catch');
      });
      const reqFail: any = { method: 'GET', originalUrl: '/fail', headers: {} };
      const errOrig = new Error('Error original');
      await expect(
        lastValueFrom(
          interceptor.intercept(crearContextoHttp(reqFail), {
            handle: () => throwError(() => errOrig),
          }),
        ),
      ).rejects.toBe(errOrig);
      expect(reqFail.__httpAuditLogged).toBe(true);
    });
  });
});
