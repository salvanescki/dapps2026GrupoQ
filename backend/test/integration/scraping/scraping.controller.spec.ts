import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { AppModule } from '../../../src/app.module';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { JwtService } from '@nestjs/jwt';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { IEjecucionScrapingRepository, I_EJECUCION_SCRAPING_REPOSITORY } from '../../../src/scraping/domain/ejecucion-scraping.repository.interface';
import { EjecucionScraping } from '../../../src/scraping/domain/ejecucion-scraping.entity';

describe('ScrapingController - API Contract & Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let mockScrapingService: Partial<ScrapingService>;
  let ejecucionRepo: IEjecucionScrapingRepository;

  beforeAll(async () => {
    const started = await ScrapingTestDatabaseHelper.start();
    dataSource = started.dataSource;

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_for_scraping_controller_spec';

    const jwtService = new JwtService({ secret: process.env.JWT_SECRET });
    jwtToken = jwtService.sign({ sub: '99999999-9999-4999-8999-999999999999', email: 'admin@unq.edu.ar' });

    mockScrapingService = {
      ejecutarPipeline: jest.fn().mockImplementation(async () => {
        const ej = EjecucionScraping.iniciar();
        ej.incrementarJugadoresProcesados(10);
        ej.finalizarExitoso();
        return ej;
      }),
      obtenerEstadisticasJugador: jest.fn().mockResolvedValue({
        jugador: {
          id: '11111111-1111-4111-8111-111111111111',
          nombre: 'Test Player',
          posicion: 'Delantero',
          dorsal: 9,
        },
        temporada: '2025/2026',
        liga: 'PL',
        rol: 'jugador_campo',
        estadisticas: { goles: 5, asistencias: 2 },
        fechaActualizacion: new Date(),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ScrapingService)
      .useValue(mockScrapingService)
      .compile();

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

    ejecucionRepo = moduleFixture.get<IEjecucionScrapingRepository>(
      I_EJECUCION_SCRAPING_REPOSITORY,
    );
  }, 90000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await ScrapingTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await ScrapingTestDatabaseHelper.cleanDatabase();
  });

  describe('POST /scraping/ejecutar', () => {
    it('debe responder 401 si no se provee token Bearer', async () => {
      await request(app.getHttpServer())
        .post('/scraping/ejecutar')
        .expect(401);
    });

    it('debe responder 202 Accepted e iniciar el scraping con Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post('/scraping/ejecutar')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(202);

      expect(res.body).toHaveProperty('ejecucionId');
      expect(res.body).toHaveProperty('mensaje');
      expect(res.body).toHaveProperty('inicio');
    });
  });

  describe('GET /scraping/ejecuciones', () => {
    it('debe responder 401 sin autenticación', async () => {
      await request(app.getHttpServer())
        .get('/scraping/ejecuciones')
        .expect(401);
    });

    it('debe listar ejecuciones paginadas según contrato OpenAPI', async () => {
      const e1 = EjecucionScraping.reconstituir({
        id: '11111111-1111-4111-8111-111111111111',
        inicio: new Date(),
        fin: new Date(),
        estado: 'exitoso',
        jugadoresProcesados: 50,
        errores: 0,
        detalle: [],
      });
      await ejecucionRepo.guardar(e1);

      const res = await request(app.getHttpServer())
        .get('/scraping/ejecuciones?pagina=1&limite=10')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('datos');
      expect(res.body).toHaveProperty('total', 1);
      expect(res.body).toHaveProperty('pagina', 1);
      expect(res.body).toHaveProperty('limite', 10);
      expect(res.body.datos).toHaveLength(1);
      expect(res.body.datos[0].id).toBe(e1.id);
    });
  });

  describe('GET /scraping/ejecuciones/:id', () => {
    it('debe responder 404 para una ejecución inexistente', async () => {
      await request(app.getHttpServer())
        .get('/scraping/ejecuciones/ffffffff-ffff-4fff-8fff-ffffffffffff')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });

    it('debe retornar el detalle completo de la ejecución', async () => {
      const e1 = EjecucionScraping.reconstituir({
        id: '22222222-2222-4222-8222-222222222222',
        inicio: new Date(),
        fin: new Date(),
        estado: 'exitoso',
        jugadoresProcesados: 25,
        errores: 1,
        detalle: [
          {
            liga: 'PL',
            jugadorNombre: 'Sample Player',
            mensaje: 'Sample Error',
            timestamp: new Date(),
          },
        ],
      });
      await ejecucionRepo.guardar(e1);

      const res = await request(app.getHttpServer())
        .get(`/scraping/ejecuciones/${e1.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body.id).toBe(e1.id);
      expect(res.body.jugadoresProcesados).toBe(25);
      expect(res.body.errores).toBe(1);
      expect(res.body.detalle).toHaveLength(1);
      expect(res.body.detalle[0].jugadorNombre).toBe('Sample Player');
    });
  });

  describe('GET /scraping/jugadores/:id/estadisticas', () => {
    it('debe retornar estadísticas del jugador delegando en ScrapingService', async () => {
      const res = await request(app.getHttpServer())
        .get('/scraping/jugadores/11111111-1111-4111-8111-111111111111/estadisticas')
        .expect(200);

      expect(res.body).toHaveProperty('rol', 'jugador_campo');
      expect(res.body.estadisticas).toHaveProperty('goles', 5);
    });
  });
});
