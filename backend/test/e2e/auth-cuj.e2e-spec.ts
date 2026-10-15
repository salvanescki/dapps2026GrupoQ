import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestDatabaseHelper } from '../integration/test-database.helper';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('E2E Critical User Journey - Auth (CUJ-01 & CUJ-02)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const started = await TestDatabaseHelper.start();

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_for_e2e_cuj';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  }, 90000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanDatabase();
  });

  describe('CUJ-01: Registro y Acceso a Sesión', () => {
    it('debería retornar código 201 en registro y token válido en respuesta', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Enzo Fernandez',
          correo: 'enzo@chelsea.com',
          contrasena: 'MidfieldPass2026',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('tokenDeAcceso');
      expect(typeof response.body.tokenDeAcceso).toBe('string');
      expect(response.body.tokenDeAcceso.length).toBeGreaterThan(20);
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.correo).toBe('enzo@chelsea.com');
      expect(response.body.usuario.nombre).toBe('Enzo Fernandez');
    });
  });

  describe('CUJ-02: Acceso a Perfil Protegido y Logout', () => {
    it('debería retornar código 200 en /auth/me, 200 en /auth/logout, y 401 si se consulta sin token', async () => {
      // 1. Acceso sin token -> 401
      const sinTokenRes = await request(app.getHttpServer()).get('/auth/me');
      expect(sinTokenRes.status).toBe(401);

      // 2. Registro de usuario para obtener token
      const registroRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Alexis Mac Allister',
          correo: 'alexis@liverpool.com',
          contrasena: 'AnfieldRoad2026',
        });

      expect(registroRes.status).toBe(201);
      const token = registroRes.body.tokenDeAcceso;
      expect(token).toBeDefined();

      // 3. Consulta /auth/me con token válido -> 200
      const perfilRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(perfilRes.status).toBe(200);
      expect(perfilRes.body.correo).toBe('alexis@liverpool.com');
      expect(perfilRes.body.nombre).toBe('Alexis Mac Allister');

      // 4. Logout con token válido -> 200
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.mensaje).toBe('Sesión cerrada exitosamente.');

      // 5. Consulta sin token posterior -> 401
      const consultaPosterior = await request(app.getHttpServer()).get('/auth/me');
      expect(consultaPosterior.status).toBe(401);
    });
  });
});
