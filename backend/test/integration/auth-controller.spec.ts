import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from './test-database.helper';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('AuthController - Validation Error Handling & Status Codes (Integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const started = await TestDatabaseHelper.start();
    dataSource = started.dataSource;

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_for_auth_controller_spec';

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

  describe('POST /auth/register', () => {
    it('debe responder 400 cuando faltan campos o el formato de correo/contraseña es invalido', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'A',
          correo: 'correo-no-valido',
          contrasena: 'corta',
        });

      expect(res.status).toBe(400);
      expect(res.body.codigoEstado).toBe(400);
      expect(res.body.mensaje).toBeDefined();
    });

    it('debe responder 409 Conflict cuando el correo ya se encuentra registrado', async () => {
      const usuarioData = {
        nombre: 'Rodrigo De Paul',
        correo: 'depaul@atleti.es',
        contrasena: 'Motorcito2026',
      };

      const primerRegistro = await request(app.getHttpServer())
        .post('/auth/register')
        .send(usuarioData);
      expect(primerRegistro.status).toBe(201);

      const segundoRegistro = await request(app.getHttpServer())
        .post('/auth/register')
        .send(usuarioData);
      expect(segundoRegistro.status).toBe(409);
      expect(segundoRegistro.body.codigoEstado).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        nombre: 'Enzo Fernandez',
        correo: 'enzo@chelsea.com',
        contrasena: 'ChelseaPass2026',
      });
    });

    it('debe responder 401 cuando las credenciales son incorrectas', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        correo: 'enzo@chelsea.com',
        contrasena: 'PasswordEquivocada123',
      });

      expect(res.status).toBe(401);
      expect(res.body.codigoEstado).toBe(401);
    });

    it('debe responder 401 cuando el usuario no existe', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        correo: 'noexiste@chelsea.com',
        contrasena: 'Cualquiera123',
      });

      expect(res.status).toBe(401);
    });

    it('debe responder 200 y devolver token cuando las credenciales son correctas', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        correo: 'enzo@chelsea.com',
        contrasena: 'ChelseaPass2026',
      });

      expect(res.status).toBe(200);
      expect(res.body.tokenDeAcceso).toBeDefined();
      expect(res.body.usuario.nombre).toBe('Enzo Fernandez');
    });
  });

  describe('GET /auth/me & POST /auth/logout', () => {
    it('debe rechazar token invalido o malformado con 401', async () => {
      const resMe = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token-totalmente-invalido');
      expect(resMe.status).toBe(401);

      const resLogout = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer token-totalmente-invalido');
      expect(resLogout.status).toBe(401);
    });
  });
});
