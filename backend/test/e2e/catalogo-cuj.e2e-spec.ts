import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from '../integration/test-database.helper';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';

describe('E2E Critical User Journey - Catálogo (CUJ-03)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jugadorGuardadoId: string;

  beforeAll(async () => {
    const started = await TestDatabaseHelper.start();
    dataSource = started.dataSource;

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_for_catalogo_e2e';

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

    // Poblar datos iniciales para el catálogo
    const ligaRepo = new LigaTypeOrmRepository(dataSource.getRepository(LigaOrmEntity));
    const equipoRepo = new EquipoTypeOrmRepository(
      dataSource.getRepository(EquipoOrmEntity),
    );
    const jugadorRepo = new JugadorTypeOrmRepository(
      dataSource.getRepository(JugadorOrmEntity),
    );

    const liga = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
        emblemaUrl: 'https://crests.football-data.org/PL.png',
      }),
    );

    const equipo = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 65,
        nombre: 'Manchester City FC',
        nombreCorto: 'Man City',
        tla: 'MCI',
        escudoUrl: 'https://crests.football-data.org/65.png',
        ligaId: liga.id,
      }),
    );

    const jugador = await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 38101,
        nombre: 'Erling Haaland',
        posicionOriginal: 'Centre-Forward',
        fechaNacimiento: '2000-07-21',
        nacionalidad: 'Norway',
        dorsal: 9,
        equipoId: equipo.id,
        ligaId: liga.id,
      }),
    );

    jugadorGuardadoId = jugador.id;
  });

  describe('CUJ-03: Consulta y Filtrado de Catálogo de Jugadores', () => {
    it('debería consultar catálogo inicial, opciones de filtros, aplicar filtros combinados y obtener ficha completa con código 200', async () => {
      // 1. Carga inicial de catálogo (GET /players) -> 200
      const catalogoRes = await request(app.getHttpServer()).get('/players');
      expect(catalogoRes.status).toBe(200);
      expect(catalogoRes.body).toHaveProperty('items');
      expect(Array.isArray(catalogoRes.body.items)).toBe(true);
      expect(catalogoRes.body.items.length).toBeGreaterThanOrEqual(1);

      // 2. Consulta de filtros disponibles (GET /players/filters) -> 200
      const filtrosRes = await request(app.getHttpServer()).get('/players/filters');
      expect(filtrosRes.status).toBe(200);
      expect(filtrosRes.body).toHaveProperty('ligas');
      expect(filtrosRes.body).toHaveProperty('equipos');
      expect(filtrosRes.body).toHaveProperty('posiciones');
      expect(filtrosRes.body.ligas.some((l: any) => l.codigo === 'PL')).toBe(true);

      // 3. Aplicación de filtros combinados (GET /players?position=Delantero&search=Erling) -> 200 con lista no vacía
      const filtradoRes = await request(app.getHttpServer())
        .get('/players')
        .query({ position: 'Delantero', search: 'Erling' });

      expect(filtradoRes.status).toBe(200);
      expect(filtradoRes.body.items.length).toBe(1);
      expect(filtradoRes.body.items[0].nombre).toBe('Erling Haaland');
      expect(filtradoRes.body.items[0].posicion).toBe('Delantero');

      // 4. Consulta de ficha detallada por ID (GET /players/:id) -> 200 con atributos completos
      const detalleRes = await request(app.getHttpServer()).get(
        `/players/${jugadorGuardadoId}`,
      );

      expect(detalleRes.status).toBe(200);
      expect(detalleRes.body.id).toBe(jugadorGuardadoId);
      expect(detalleRes.body.nombre).toBe('Erling Haaland');
      expect(detalleRes.body.posicion).toBe('Delantero');
      expect(detalleRes.body.posicionOriginal).toBe('Centre-Forward');
      expect(detalleRes.body.nacionalidad).toBe('Norway');
      expect(detalleRes.body.dorsal).toBe(9);
      expect(detalleRes.body.equipo).toBeDefined();
      expect(detalleRes.body.equipo.nombre).toBe('Manchester City FC');
      expect(detalleRes.body.liga).toBeDefined();
      expect(detalleRes.body.liga.codigo).toBe('PL');
    });
  });
});
