import { AuditAspectRegistry } from '../../../src/observability/aspects/audit-aspect.registry';
import { AuditContextMiddleware } from '../../../src/observability/middleware/audit-context.middleware';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AuditContextService } from '../../../src/observability/services/audit-context.service';
import { AuditLoggerService } from '../../../src/observability/services/audit-logger.service';
import { PinoLogger } from 'nestjs-pino';

describe('AuditContextService & AuditLoggerService', () => {
  let contextService: AuditContextService;
  let pinoMock: {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let auditLogger: AuditLoggerService;

  beforeEach(() => {
    contextService = new AuditContextService();
    pinoMock = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    auditLogger = new AuditLoggerService(
      pinoMock as unknown as PinoLogger,
      contextService,
    );
  });

  describe('AuditContextService', () => {
    it('propaga requestId y aisla metadatos entre alcances anidados y concurrentes', async () => {
      expect(contextService.obtenerRequestId()).toBeNull();
      expect(contextService.obtenerMetadatos()).toEqual({});

      // Registrar fuera de contexto no lanza error
      contextService.registrarMetadatos({ ignorado: true });
      expect(contextService.obtenerMetadatos()).toEqual({});

      await contextService.ejecutarEnContexto('req-123', async () => {
        expect(contextService.obtenerRequestId()).toBe('req-123');
        contextService.registrarMetadatos({ nivel: 'externo' });

        await contextService.ejecutarEnAlcanceOperacion(async () => {
          expect(contextService.obtenerRequestId()).toBe('req-123');
          expect(contextService.obtenerMetadatos()).toEqual({});
          contextService.registrarMetadatos({ vendedorId: 'v-1' });
          expect(contextService.obtenerMetadatos()).toEqual({
            vendedorId: 'v-1',
          });
        });

        // El alcance externo conserva sus propios metadatos sin contaminacion
        expect(contextService.obtenerMetadatos()).toEqual({ nivel: 'externo' });
      });

      // Ejecuciones concurrentes aisladas
      const [idA, idB] = await Promise.all([
        contextService.ejecutarEnContexto(
          'req-A',
          () =>
            new Promise<string | null>((resolve) =>
              setTimeout(() => resolve(contextService.obtenerRequestId()), 10),
            ),
        ),
        contextService.ejecutarEnContexto(
          'req-B',
          () =>
            new Promise<string | null>((resolve) =>
              setTimeout(() => resolve(contextService.obtenerRequestId()), 5),
            ),
        ),
      ]);

      expect(idA).toBe('req-A');
      expect(idB).toBe('req-B');
    });
  });

  describe('AuditLoggerService.registrarAuditoriaHttp', () => {
    const baseEntrada = {
      requestId: 'req-001',
      usuario: {
        autenticado: true as const,
        id: 'u-1',
        email: 'u@test.com',
        rol: 'USUARIO',
      },
      operacion: {
        metodo: 'POST',
        ruta: '/orders/buy',
        controlador: 'OrdersController.comprar',
      },
      parametros: {
        ruta: {},
        consulta: {},
        cuerpo: { contrasena: 'secret', cantidad: 2 },
      },
      tiempoEjecucion: 12.345,
    };

    it('emite info para 2xx/3xx con parametros sanitizados', () => {
      auditLogger.registrarAuditoriaHttp({ ...baseEntrada, codigoEstado: 201 });

      expect(pinoMock.info).toHaveBeenCalledTimes(1);
      const [payload, msg] = pinoMock.info.mock.calls[0];
      expect(payload).toMatchObject({
        tipoEvento: 'HTTP_AUDIT',
        requestId: 'req-001',
        codigoEstado: 201,
        tiempoEjecucion: 12.35,
        parametros: {
          ruta: {},
          consulta: {},
          cuerpo: { contrasena: '[REDACTED]', cantidad: 2 },
        },
      });
      expect(payload.error).toBeUndefined();
      expect(msg).toBe('HTTP POST /orders/buy 201');
    });

    it('emite warn para 4xx y error para 5xx con resumen de error sanitizado', () => {
      auditLogger.registrarAuditoriaHttp({
        ...baseEntrada,
        codigoEstado: 400,
        error: {
          codigoEstado: 400,
          mensaje: ['Token invalido Bearer abc.def.ghi'],
        },
      });

      expect(pinoMock.warn).toHaveBeenCalledTimes(1);
      expect(pinoMock.warn.mock.calls[0][0].error).toEqual({
        codigoEstado: 400,
        mensaje: ['Token invalido Bearer [REDACTED]'],
      });

      auditLogger.registrarAuditoriaHttp({
        ...baseEntrada,
        codigoEstado: 500,
        error: {
          codigoEstado: 500,
          mensaje: 'Fallo en http://u:p@proxy.local:8080',
        },
      });

      expect(pinoMock.error).toHaveBeenCalledTimes(1);
      expect(pinoMock.error.mock.calls[0][0].error).toEqual({
        codigoEstado: 500,
        mensaje: 'Fallo en http://[REDACTED]@proxy.local:8080',
      });
    });

    it('emite debug para rutas tecnicas y toma requestId desde AsyncLocalStorage si se omite', () => {
      contextService.ejecutarEnContexto('req-ctx-99', () => {
        auditLogger.registrarAuditoriaHttp({
          ...baseEntrada,
          requestId: '',
          codigoEstado: 200,
          esRutaTecnica: true,
        });
      });

      expect(pinoMock.debug).toHaveBeenCalledTimes(1);
      expect(pinoMock.debug.mock.calls[0][0].requestId).toBe('req-ctx-99');
    });

    it('es fail-safe si Pino lanza excepcion', () => {
      pinoMock.info.mockImplementationOnce(() => {
        throw new Error('Pino stream failure');
      });

      expect(() =>
        auditLogger.registrarAuditoriaHttp({
          ...baseEntrada,
          codigoEstado: 200,
        }),
      ).not.toThrow();
    });
  });

  describe('AuditLoggerService.registrarEventoNegocio', () => {
    it('correlaciona requestId desde AsyncLocalStorage o null fuera de HTTP y selecciona severidad correcta', () => {
      contextService.ejecutarEnContexto('req-biz-1', () => {
        auditLogger.registrarEventoNegocio({
          evento: 'TRANSACCION_TOKENS',
          origen: 'HTTP',
          usuarioId: 'user-1',
          resultado: 'EXITO',
          motivo: null,
          tiempoEjecucion: 4.5,
          datos: { mercado: 'PRIMARIO', password: 'oculto' },
        });
      });

      expect(pinoMock.info).toHaveBeenCalledTimes(1);
      expect(pinoMock.info.mock.calls[0][0]).toMatchObject({
        tipoEvento: 'BUSINESS_AUDIT',
        evento: 'TRANSACCION_TOKENS',
        requestId: 'req-biz-1',
        resultado: 'EXITO',
        datos: { mercado: 'PRIMARIO', password: '[REDACTED]' },
      });

      // Sin contexto HTTP -> requestId: null, RECHAZADO -> warn
      auditLogger.registrarEventoNegocio({
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        origen: 'PROGRAMADO',
        usuarioId: null,
        resultado: 'OMITIDO',
        motivo: 'Ya existe',
        tiempoEjecucion: 1,
        datos: { ano: 2026, semanaIso: 48, cantidadMiembros: 0 },
      });
      expect(pinoMock.warn).toHaveBeenCalledTimes(1);
      expect(pinoMock.warn.mock.calls[0][0].requestId).toBeNull();

      // FALLIDO -> error con motivo sanitizado
      auditLogger.registrarEventoNegocio({
        evento: 'SCRAPING_ESTADISTICAS',
        origen: 'STANDALONE',
        usuarioId: null,
        resultado: 'FALLIDO',
        motivo: 'Error proxy http://admin:pass@proxy.io:9000',
        tiempoEjecucion: 100,
        datos: { subtipo: 'EJECUCION_COMPLETA' },
      });
      expect(pinoMock.error).toHaveBeenCalledTimes(1);
      expect(pinoMock.error.mock.calls[0][0].motivo).toBe(
        'Error proxy http://[REDACTED]@proxy.io:9000',
      );
    });

    it('es fail-safe cuando Pino lanza excepcion al emitir evento de negocio', () => {
      pinoMock.error.mockImplementationOnce(() => {
        throw new Error('Write failure');
      });

      expect(() =>
        auditLogger.registrarEventoNegocio({
          evento: 'CALCULO_COTIZACIONES',
          origen: 'PROGRAMADO',
          usuarioId: null,
          resultado: 'FALLIDO',
          motivo: 'DB caida',
          tiempoEjecucion: 10,
          datos: {},
        }),
      ).not.toThrow();
    });
  });

  describe('ObservabilityModule lifecycle', () => {
    it('registra y limpia AuditAspectRegistry en onModuleInit/onModuleDestroy y aplica AuditContextMiddleware en configure', () => {
      const metricsMock: any = { onModuleInit: jest.fn() };
      const mod = new ObservabilityModule(
        metricsMock,
        auditLogger,
        contextService,
      );

      mod.onModuleInit();
      expect(metricsMock.onModuleInit).toHaveBeenCalled();
      expect(AuditAspectRegistry.getLogger()).toBe(auditLogger);
      expect(AuditAspectRegistry.getContext()).toBe(contextService);

      const forRoutes = jest.fn();
      const apply = jest.fn(() => ({ forRoutes }));
      mod.configure({ apply } as any);
      expect(apply).toHaveBeenCalledWith(AuditContextMiddleware);
      expect(forRoutes).toHaveBeenCalledWith('*');

      mod.onModuleDestroy();
      expect(AuditAspectRegistry.getLogger()).toBeNull();
      expect(AuditAspectRegistry.getContext()).toBeNull();
    });
  });
});
