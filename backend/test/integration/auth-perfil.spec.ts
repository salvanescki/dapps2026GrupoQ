import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { TestcontainersHelper } from './setup-testcontainers';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('Auth Endpoints & Protection (e2e Integration with Testcontainers)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const started = await TestcontainersHelper.start();
    dataSource = started.dataSource;

    // Set test env variables for database to match testcontainer
    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_for_protection_e2e';

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
    await TestcontainersHelper.stop();
  });

  beforeEach(async () => {
    await TestcontainersHelper.cleanDatabase();
  });

  it('debe rechazar acceso a /api/auth/me sin cabecera Authorization (HTTP 401)', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('debe registrar un usuario, obtener token JWT y consultar /api/auth/me exitosamente', async () => {
    const registroRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        nombre: 'Lautaro Martinez',
        correo: 'toro@inter.it',
        contrasena: 'Goleador2026',
      });

    expect(registroRes.status).toBe(201);
    const token = registroRes.body.tokenDeAcceso;
    expect(token).toBeDefined();

    const perfilRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(perfilRes.status).toBe(200);
    expect(perfilRes.body.nombre).toBe('Lautaro Martinez');
    expect(perfilRes.body.correo).toBe('toro@inter.it');
  });

  it('debe permitir cerrar sesión exitosamente con token válido', async () => {
    const registroRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        nombre: 'Julian Alvarez',
        correo: 'araña@atleti.es',
        contrasena: 'AranaGol2026',
      });

    const token = registroRes.body.tokenDeAcceso;

    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.mensaje).toBe('Sesión cerrada exitosamente.');
  });
});
