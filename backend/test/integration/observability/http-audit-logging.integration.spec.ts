import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  Logger as NestLogger,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Logger, LoggerModule } from 'nestjs-pino';
import { __resetOutOfContextForTests } from 'nestjs-pino/PinoLogger';
import { PassThrough } from 'stream';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { createPinoLoggerConfig } from '../../../src/observability/config/pino-logger.config';
import { AuditLoggingInterceptor } from '../../../src/observability/interceptors/audit-logging.interceptor';
import { AuditContextMiddleware } from '../../../src/observability/middleware/audit-context.middleware';
import { AuditContextService } from '../../../src/observability/services/audit-context.service';
import { AuditLoggerService } from '../../../src/observability/services/audit-logger.service';

class LoginDemoDto {
  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;
}

@Injectable()
class DemoAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || !String(auth).startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }
    if (auth === 'Bearer token-usuario') {
      req.user = { id: 'usr-123', email: 'usr@test.com', rol: 'USUARIO' };
      return true;
    }
    if (auth === 'Bearer token-admin') {
      req.user = { id: 'adm-999', email: 'adm@test.com', rol: 'ADMIN' };
      return true;
    }
    throw new UnauthorizedException('Token invalido');
  }
}

@Injectable()
class DemoAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.rol !== 'ADMIN') {
      throw new ForbiddenException('Se requiere rol ADMIN');
    }
    return true;
  }
}

@Controller()
class DemoAuditController {
  private readonly nestLogger = new NestLogger('DemoAuditController');

  @Post('demo/login')
  login(@Body() dto: LoginDemoDto) {
    this.nestLogger.log(`Inicio de sesion para ${dto.correo}`);
    return { autenticado: true, correo: dto.correo };
  }

  @Get('demo/private')
  @UseGuards(DemoAuthGuard)
  privateEndpoint() {
    return { secreto: 'solo-autenticados' };
  }

  @Post('demo/admin')
  @UseGuards(DemoAuthGuard, DemoAdminGuard)
  adminEndpoint() {
    return { ok: true };
  }

  @Get('demo/boom')
  boom() {
    throw new Error('Error interno con Bearer secreto-boom-token');
  }

  @Get('health/live')
  healthLive() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  healthReady() {
    return { status: 'ok' };
  }

  @Get('metrics')
  metrics() {
    return 'app_up 1';
  }

  @Get('api/docs-json')
  docsJson() {
    return { openapi: '3.0.0' };
  }
}

const ISO_8601_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertConformsToHttpAuditSchema(entry: Record<string, any>) {
  expect([10, 20, 30, 40, 50, 60]).toContain(entry.level);
  expect(typeof entry.timestamp).toBe('string');
  expect(entry.timestamp).toMatch(ISO_8601_UTC_REGEX);
  expect(entry.servicio).toBe('football-tokens-backend');
  expect(typeof entry.entorno).toBe('string');
  expect(entry.tipoEvento).toBe('HTTP_AUDIT');
  expect(typeof entry.requestId).toBe('string');
  expect(entry.requestId.length).toBeGreaterThanOrEqual(1);
  expect(entry.requestId.length).toBeLessThanOrEqual(128);

  expect(entry.usuario).toBeDefined();
  expect(typeof entry.usuario.autenticado).toBe('boolean');
  expect('id' in entry.usuario).toBe(true);
  expect('email' in entry.usuario).toBe(true);
  expect('rol' in entry.usuario).toBe(true);
  if (!entry.usuario.autenticado) {
    expect(entry.usuario.tipo).toBe('ANONIMO');
  }

  expect(entry.operacion).toBeDefined();
  expect(typeof entry.operacion.metodo).toBe('string');
  expect(typeof entry.operacion.ruta).toBe('string');
  expect('controlador' in entry.operacion).toBe(true);

  expect(entry.parametros).toBeDefined();
  expect(typeof entry.parametros.ruta).toBe('object');
  expect(typeof entry.parametros.consulta).toBe('object');
  expect('cuerpo' in entry.parametros).toBe(true);

  expect(Number.isInteger(entry.codigoEstado)).toBe(true);
  expect(entry.codigoEstado).toBeGreaterThanOrEqual(100);
  expect(entry.codigoEstado).toBeLessThanOrEqual(599);

  expect(typeof entry.tiempoEjecucion).toBe('number');
  expect(entry.tiempoEjecucion).toBeGreaterThanOrEqual(0);
  expect(typeof entry.msg).toBe('string');

  if (entry.codigoEstado >= 400) {
    expect(entry.error).toBeDefined();
    expect(typeof entry.error.codigoEstado).toBe('number');
    expect(
      typeof entry.error.mensaje === 'string' ||
        Array.isArray(entry.error.mensaje),
    ).toBe(true);
  }
}

async function createAuditTestApp(logLevel: 'info' | 'debug') {
  __resetOutOfContextForTests();
  const capturedLines: string[] = [];
  const captureStream = new PassThrough();
  captureStream.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) {
        capturedLines.push(trimmed);
      }
    }
  });

  process.env.NODE_ENV = 'production';
  process.env.LOG_LEVEL = logLevel;

  @Module({
    imports: [
      LoggerModule.forRootAsync({
        useFactory: () =>
          createPinoLoggerConfig(
            { NODE_ENV: 'production', LOG_LEVEL: logLevel },
            captureStream,
          ),
      }),
    ],
    controllers: [DemoAuditController],
    providers: [
      AuditContextService,
      AuditLoggerService,
      DemoAuthGuard,
      DemoAdminGuard,
      {
        provide: APP_INTERCEPTOR,
        useClass: AuditLoggingInterceptor,
      },
    ],
  })
  class TestAuditAppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(AuditContextMiddleware).forRoutes('*');
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [TestAuditAppModule],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication({
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const parseLogs = () =>
    capturedLines.map((line) => JSON.parse(line) as Record<string, any>);
  const clearLogs = () => {
    capturedLines.length = 0;
  };

  return { app, capturedLines, parseLogs, clearLogs };
}

describe('HTTP Audit Logging (Integration)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetOutOfContextForTests();
  });

  it('emite exactamente 1 registro HTTP_AUDIT por solicitud (2xx, 400, 401, 403, 404, 500), redacta secretos y enruta NestJS Logger a JSON (FR-009)', async () => {
    const { app, capturedLines, parseLogs, clearLogs } =
      await createAuditTestApp('info');

    try {
      clearLogs();

      // 1. 2xx publico con x-request-id explicito + redaccion de contrasena y Cookie + NestJS Logger (FR-009)
      const resLogin = await request(app.getHttpServer())
        .post('/demo/login')
        .set('x-request-id', 'req-demo-001')
        .set('Cookie', 'session=super-cookie-secret')
        .send({
          correo: 'admin@marketplace.com',
          contrasena: 'MiPasswordSecreta123',
        })
        .expect(201);

      expect(resLogin.headers['x-request-id']).toBe('req-demo-001');

      const loginLogs = parseLogs();
      const loginAudits = loginLogs.filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(loginAudits).toHaveLength(1);
      assertConformsToHttpAuditSchema(loginAudits[0]);
      expect(loginAudits[0]).toMatchObject({
        level: 30,
        requestId: 'req-demo-001',
        usuario: { autenticado: false, tipo: 'ANONIMO', id: null },
        operacion: {
          metodo: 'POST',
          ruta: '/demo/login',
          controlador: 'DemoAuditController.login',
        },
        parametros: {
          cuerpo: {
            correo: 'admin@marketplace.com',
            contrasena: '[REDACTED]',
          },
        },
        codigoEstado: 201,
      });

      // Verificar FR-009: NestJS Logger preexistente enrutado a JSON estructurado
      const nestOperationalLogs = loginLogs.filter(
        (l) =>
          l.context === 'DemoAuditController' &&
          l.msg === 'Inicio de sesion para admin@marketplace.com',
      );
      expect(nestOperationalLogs).toHaveLength(1);
      expect(nestOperationalLogs[0].servicio).toBe('football-tokens-backend');
      expect(nestOperationalLogs[0].timestamp).toMatch(ISO_8601_UTC_REGEX);

      // Cero fugas de secretos
      const rawLoginOutput = capturedLines.join('\n');
      expect(rawLoginOutput).not.toContain('MiPasswordSecreta123');
      expect(rawLoginOutput).not.toContain('super-cookie-secret');

      // 2. 200 autenticado con UUID generado + redaccion Authorization
      clearLogs();
      const resPriv = await request(app.getHttpServer())
        .get('/demo/private')
        .set('Authorization', 'Bearer token-usuario')
        .expect(200);

      expect(resPriv.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      const privAudits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(privAudits).toHaveLength(1);
      assertConformsToHttpAuditSchema(privAudits[0]);
      expect(privAudits[0].usuario).toEqual({
        autenticado: true,
        id: 'usr-123',
        email: 'usr@test.com',
        rol: 'USUARIO',
      });
      expect(capturedLines.join('\n')).not.toContain('token-usuario');

      // 3. 400 ValidationPipe
      clearLogs();
      await request(app.getHttpServer())
        .post('/demo/login')
        .send({ correo: 'invalido', contrasena: '123' })
        .expect(400);
      const err400Audits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(err400Audits).toHaveLength(1);
      assertConformsToHttpAuditSchema(err400Audits[0]);
      expect(err400Audits[0].level).toBe(40);
      expect(err400Audits[0].codigoEstado).toBe(400);

      // 4. 401 Guard (fallback pino-http pre-interceptor)
      clearLogs();
      await request(app.getHttpServer()).get('/demo/private').expect(401);
      const err401Audits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(err401Audits).toHaveLength(1);
      assertConformsToHttpAuditSchema(err401Audits[0]);
      expect(err401Audits[0].level).toBe(40);
      expect(err401Audits[0].codigoEstado).toBe(401);
      expect(err401Audits[0].usuario.autenticado).toBe(false);

      // 5. 403 RolesGuard (fallback pino-http pre-interceptor)
      clearLogs();
      await request(app.getHttpServer())
        .post('/demo/admin')
        .set('Authorization', 'Bearer token-usuario')
        .expect(403);
      const err403Audits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(err403Audits).toHaveLength(1);
      assertConformsToHttpAuditSchema(err403Audits[0]);
      expect(err403Audits[0].level).toBe(40);
      expect(err403Audits[0].codigoEstado).toBe(403);
      expect(err403Audits[0].usuario.autenticado).toBe(true);
      expect(err403Audits[0].usuario.id).toBe('usr-123');

      // 6. 404 ruta inexistente (fallback pino-http)
      clearLogs();
      await request(app.getHttpServer())
        .get('/ruta-que-no-existe-404')
        .expect(404);
      const err404Audits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(err404Audits).toHaveLength(1);
      assertConformsToHttpAuditSchema(err404Audits[0]);
      expect(err404Audits[0].level).toBe(40);
      expect(err404Audits[0].codigoEstado).toBe(404);
      expect(err404Audits[0].operacion.controlador).toBeNull();

      // 7. 500 error interno con token Bearer redactado
      clearLogs();
      await request(app.getHttpServer()).get('/demo/boom').expect(500);
      const err500Audits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(err500Audits).toHaveLength(1);
      assertConformsToHttpAuditSchema(err500Audits[0]);
      expect(err500Audits[0].level).toBe(50);
      expect(err500Audits[0].codigoEstado).toBe(500);
      expect(capturedLines.join('\n')).not.toContain('secreto-boom-token');

      // 8. Rutas tecnicas excluidas en LOG_LEVEL=info -> 0 registros HTTP_AUDIT
      clearLogs();
      await request(app.getHttpServer()).get('/health/live').expect(200);
      await request(app.getHttpServer()).get('/health/ready').expect(200);
      await request(app.getHttpServer()).get('/metrics').expect(200);
      await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      const techAudits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(techAudits).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it('emite rutas tecnicas en nivel debug (20) cuando LOG_LEVEL=debug', async () => {
    const { app, parseLogs, clearLogs } = await createAuditTestApp('debug');

    try {
      clearLogs();
      await request(app.getHttpServer()).get('/health/live').expect(200);
      await request(app.getHttpServer()).get('/metrics').expect(200);

      const techAudits = parseLogs().filter(
        (l) => l.tipoEvento === 'HTTP_AUDIT',
      );
      expect(techAudits).toHaveLength(2);
      for (const audit of techAudits) {
        assertConformsToHttpAuditSchema(audit);
        expect(audit.level).toBe(20);
      }
    } finally {
      await app.close();
    }
  });
});
