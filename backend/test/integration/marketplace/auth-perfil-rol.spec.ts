import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { AppModule } from '../../../src/app.module';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

describe('Auth Perfil con Rol y Saldo (Integration con PostgreSQL 16 Testcontainers)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_auth_perfil_rol_013';
    process.env.ADMIN_CORREO = 'admin@marketplace.com';
    process.env.ADMIN_CONTRASENA = 'Admin1234!';
    process.env.ADMIN_NOMBRE = 'Administrador Marketplace';

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
    await MarketplaceTestDatabaseHelper.stop();
  });

  it('POST /auth/register (201): debe retornar PerfilUsuarioDto enriquecido con rol USUARIO y saldo inicial >= 0', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nombre: 'Inversor Registro',
        correo: 'inversor.rol@marketplace.com',
        contrasena: 'Password123!',
      })
      .expect(201);

    expect(res.body.tokenDeAcceso).toEqual(expect.any(String));
    expect(res.body.tipo).toBe('Bearer');
    expect(Object.keys(res.body.usuario).sort()).toEqual(
      ['activo', 'correo', 'creadoEn', 'id', 'nombre', 'rol', 'saldo'].sort(),
    );
    expect(res.body.usuario.nombre).toBe('Inversor Registro');
    expect(res.body.usuario.correo).toBe('inversor.rol@marketplace.com');
    expect(res.body.usuario.activo).toBe(true);
    expect(res.body.usuario.rol).toBe('USUARIO');
    expect(typeof res.body.usuario.saldo).toBe('number');
    expect(res.body.usuario.saldo).toBe(1000);
  });

  it('POST /auth/register (409): debe rechazar correo duplicado con formato ErrorRespuestaDto', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nombre: 'Duplicado',
        correo: 'inversor.rol@marketplace.com',
        contrasena: 'Password123!',
      })
      .expect(409);

    expect(res.body).toEqual(
      expect.objectContaining({
        codigoEstado: 409,
        mensaje: expect.any(String),
        marcaDeTiempo: expect.any(String),
      }),
    );
  });

  it('POST /auth/login (200) y GET /auth/me (200): debe proyectar rol USUARIO y saldo numerico', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: 'inversor.rol@marketplace.com',
        contrasena: 'Password123!',
      })
      .expect(200);

    expect(loginRes.body.tipo).toBe('Bearer');
    expect(loginRes.body.usuario.rol).toBe('USUARIO');
    expect(loginRes.body.usuario.saldo).toBe(1000);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.tokenDeAcceso}`)
      .expect(200);

    expect(Object.keys(meRes.body).sort()).toEqual(
      ['activo', 'correo', 'creadoEn', 'id', 'nombre', 'rol', 'saldo'].sort(),
    );
    expect(meRes.body.rol).toBe('USUARIO');
    expect(meRes.body.saldo).toBe(1000);
  });

  it('POST /auth/login (200) y GET /auth/me (200): debe proyectar rol ADMIN y saldo numerico para el superusuario', async () => {
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: 'admin@marketplace.com',
        contrasena: 'Admin1234!',
      })
      .expect(200);

    expect(loginAdmin.body.usuario.rol).toBe('ADMIN');
    expect(typeof loginAdmin.body.usuario.saldo).toBe('number');
    expect(loginAdmin.body.usuario.saldo).toBeGreaterThanOrEqual(0);

    const meAdmin = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginAdmin.body.tokenDeAcceso}`)
      .expect(200);

    expect(meAdmin.body.rol).toBe('ADMIN');
    expect(typeof meAdmin.body.saldo).toBe('number');
    expect(meAdmin.body.saldo).toBeGreaterThanOrEqual(0);
  });

  it('POST /auth/login (401) y GET /auth/me (401): debe rechazar credenciales invalidas y peticiones sin token o con token invalido', async () => {
    const badLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: 'inversor.rol@marketplace.com',
        contrasena: 'Incorrecta999!',
      })
      .expect(401);

    expect(badLogin.body).toEqual(
      expect.objectContaining({
        codigoEstado: 401,
        mensaje: expect.any(String),
        marcaDeTiempo: expect.any(String),
      }),
    );

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer token.invalido.firma')
      .expect(401);
  });
});

