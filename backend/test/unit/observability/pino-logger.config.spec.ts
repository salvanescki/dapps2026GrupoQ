import { PassThrough } from 'stream';
import {
  createPinoLoggerConfig,
  extraerActorHttp,
  extraerRutaHttp,
  resolverNivelLog,
  resolverRequestId,
} from '../../../src/observability/config/pino-logger.config';

describe('pino-logger.config', () => {
  describe('resolverNivelLog y presets de entorno', () => {
    it('usa info en production y development, silent en test, y respeta LOG_LEVEL explicito', () => {
      expect(resolverNivelLog({ NODE_ENV: 'production' })).toBe('info');
      expect(resolverNivelLog({ NODE_ENV: 'development' })).toBe('info');
      expect(resolverNivelLog({ NODE_ENV: 'test' })).toBe('silent');
      expect(resolverNivelLog({})).toBe('info');
      expect(
        resolverNivelLog({ NODE_ENV: 'test', LOG_LEVEL: '  debug  ' }),
      ).toBe('debug');
    });

    it('restringe pino-pretty exclusivamente a development cuando LOG_PRETTY !== false y sin stream', () => {
      const devCfg = createPinoLoggerConfig({ NODE_ENV: 'development' })
        .pinoHttp as any;
      expect(devCfg.transport?.target).toBe('pino-pretty');
      expect(devCfg.base).toEqual({
        servicio: 'football-tokens-backend',
        entorno: 'development',
      });

      const devNoPretty = createPinoLoggerConfig({
        NODE_ENV: 'development',
        LOG_PRETTY: 'false',
      }).pinoHttp as any;
      expect(devNoPretty.transport).toBeUndefined();

      const prodCfg = createPinoLoggerConfig({
        NODE_ENV: 'production',
        LOG_PRETTY: 'true',
      }).pinoHttp as any;
      expect(prodCfg.transport).toBeUndefined();
      expect(prodCfg.level).toBe('info');

      const stream = new PassThrough();
      const withStream = createPinoLoggerConfig(
        { NODE_ENV: 'development' },
        stream,
      ).pinoHttp as any;
      expect(withStream.transport).toBeUndefined();
      expect(withStream.stream).toBe(stream);
    });

    it('genera timestamp ISO-8601 bajo la clave "timestamp", redact paths y customAttributeKeys', () => {
      const cfg = createPinoLoggerConfig({ NODE_ENV: 'production' })
        .pinoHttp as any;

      const tsSnippet = cfg.timestamp();
      expect(tsSnippet).toMatch(
        /^,"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"$/,
      );
      expect(cfg.customAttributeKeys).toEqual({
        responseTime: 'tiempoEjecucion',
        reqId: 'requestId',
      });
      expect(cfg.redact.censor).toBe('[REDACTED]');
      expect(cfg.redact.paths).toContain('req.headers.authorization');
      expect(cfg.redact.paths).toContain('req.headers.cookie');
      expect(cfg.redact.paths).toContain('res.headers["set-cookie"]');
      expect(cfg.serializers.req()).toBeUndefined();
      expect(cfg.serializers.res()).toBeUndefined();
      expect(cfg.serializers.err()).toBeUndefined();
    });
  });

  describe('resolverRequestId / genReqId', () => {
    it('acepta x-request-id valido, trunca a 128 chars y genera UUID v4 ante valores ausentes o invalidos', () => {
      const setHeader = jest.fn();
      const idValido = resolverRequestId(
        { headers: { 'x-request-id': '  req-demo_01:abc.2  ' } },
        { setHeader, headersSent: false },
      );
      expect(idValido).toBe('req-demo_01:abc.2');
      expect(setHeader).toHaveBeenCalledWith('x-request-id', idValido);

      const largo = 'a'.repeat(160);
      const idTruncado = resolverRequestId({
        headers: { 'x-request-id': [largo] },
      });
      expect(idTruncado).toHaveLength(128);

      const idInvalido = resolverRequestId({
        headers: { 'x-request-id': 'invalido con espacios!' },
      });
      expect(idInvalido).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      const idGenerado = resolverRequestId({ headers: {} });
      expect(idGenerado).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('extraerActorHttp y extraerRutaHttp', () => {
    it('resuelve actor autenticado (id/sub, email/correo, rol/role) o ANONIMO', () => {
      expect(
        extraerActorHttp({ id: 'u1', correo: 'a@b.com', rol: 'ADMIN' }),
      ).toEqual({
        autenticado: true,
        id: 'u1',
        email: 'a@b.com',
        rol: 'ADMIN',
      });
      expect(extraerActorHttp({ sub: 'u2', email: 'c@d.com' })).toEqual({
        autenticado: true,
        id: 'u2',
        email: 'c@d.com',
        rol: null,
      });
      expect(extraerActorHttp(undefined)).toEqual({
        autenticado: false,
        tipo: 'ANONIMO',
        id: null,
        email: null,
        rol: null,
      });
    });

    it('extrae plantilla de ruta Express o pathname limpio sin querystring', () => {
      expect(
        extraerRutaHttp({ baseUrl: '/orders', route: { path: '/:id' } }),
      ).toBe('/orders/:id');
      expect(
        extraerRutaHttp({ originalUrl: '/players?pagina=1&token=abc' }),
      ).toBe('/players');
      expect(extraerRutaHttp({})).toBe('/');
    });
  });

  describe('autoLogging, customLogLevel y customProps (fallback HTTP_AUDIT)', () => {
    it('ignora requests ya auditados por el interceptor y filtra rutas tecnicas segun LOG_LEVEL', () => {
      const cfgInfo = createPinoLoggerConfig({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      }).pinoHttp as any;

      expect(
        cfgInfo.autoLogging.ignore({
          __httpAuditLogged: true,
          url: '/players',
        }),
      ).toBe(true);
      expect(cfgInfo.autoLogging.ignore({ url: '/health/live' })).toBe(true);
      expect(cfgInfo.autoLogging.ignore({ url: '/metrics' })).toBe(true);
      expect(cfgInfo.autoLogging.ignore({ url: '/api/docs-json' })).toBe(true);
      expect(cfgInfo.autoLogging.ignore({ url: '/players' })).toBe(false);

      expect(
        cfgInfo.customLogLevel(
          { __httpAuditLogged: true, url: '/players' },
          { statusCode: 200 },
        ),
      ).toBe('silent');
      expect(
        cfgInfo.customLogLevel({ url: '/health/live' }, { statusCode: 200 }),
      ).toBe('silent');
      expect(
        cfgInfo.customLogLevel({ url: '/players' }, { statusCode: 200 }),
      ).toBe('info');
      expect(
        cfgInfo.customLogLevel({ url: '/missing' }, { statusCode: 404 }),
      ).toBe('warn');
      expect(
        cfgInfo.customLogLevel({ url: '/boom' }, { statusCode: 500 }),
      ).toBe('error');

      const cfgDebug = createPinoLoggerConfig({
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
      }).pinoHttp as any;
      expect(cfgDebug.autoLogging.ignore({ url: '/health/live' })).toBe(false);
      expect(
        cfgDebug.customLogLevel({ url: '/health/live' }, { statusCode: 200 }),
      ).toBe('debug');
    });

    it('genera customProps conformes al esquema HTTP_AUDIT incluyendo error y sanitizacion', () => {
      const cfg = createPinoLoggerConfig({ NODE_ENV: 'production' })
        .pinoHttp as any;

      const props401 = cfg.customProps(
        {
          method: 'GET',
          originalUrl: '/auth/me?token=secreto',
          params: {},
          query: { token: 'secreto' },
          body: null,
        },
        {
          statusCode: 401,
          locals: {
            auditError: {
              codigoEstado: 401,
              mensaje: 'Unauthorized Bearer token123',
            },
          },
        },
      );

      expect(props401).toMatchObject({
        tipoEvento: 'HTTP_AUDIT',
        usuario: { autenticado: false, tipo: 'ANONIMO', id: null },
        operacion: { metodo: 'GET', ruta: '/auth/me', controlador: null },
        parametros: {
          ruta: {},
          consulta: { token: '[REDACTED]' },
          cuerpo: null,
        },
        codigoEstado: 401,
        error: {
          codigoEstado: 401,
          mensaje: 'Unauthorized Bearer [REDACTED]',
        },
      });

      const props404SinLocals = cfg.customProps(
        { method: 'GET', originalUrl: '/no-existe' },
        { statusCode: 404, statusMessage: 'Not Found' },
      );
      expect(props404SinLocals.error).toEqual({
        codigoEstado: 404,
        mensaje: 'Not Found',
      });

      expect(
        cfg.customSuccessMessage(
          { method: 'get', originalUrl: '/players' },
          { statusCode: 200 },
        ),
      ).toBe('HTTP GET /players 200');
      expect(
        cfg.customErrorMessage(
          { method: 'post', originalUrl: '/orders/buy' },
          { statusCode: 500 },
        ),
      ).toBe('HTTP POST /orders/buy 500');
      expect(
        cfg.customSuccessObject({}, {}, { tiempoEjecucion: 12 }),
      ).toEqual({ tiempoEjecucion: 12 });
      expect(
        cfg.customErrorObject({}, {}, new Error('x'), { tiempoEjecucion: -1 }),
      ).toEqual({ tiempoEjecucion: 0 });
    });
  });
});
