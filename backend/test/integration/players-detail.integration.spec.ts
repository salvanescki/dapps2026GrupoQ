import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping/scraping-test-database.helper';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';
import { EstadisticaJugadorOrmEntity } from '../../src/scraping/data-access/estadistica-jugador.orm-entity';

describe('Players Detail Integration Tests (GET /players/:id with Testcontainers)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const started = await ScrapingTestDatabaseHelper.start();
    dataSource = started.dataSource;

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();

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
    await ScrapingTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await ScrapingTestDatabaseHelper.cleanDatabase();
  });

  it('debe obtener la ficha del jugador con estadísticas cuando existen datos de WhoScored (200 OK)', async () => {
    const ligaRepo = dataSource.getRepository(LigaOrmEntity);
    const equipoRepo = dataSource.getRepository(EquipoOrmEntity);
    const jugadorRepo = dataSource.getRepository(JugadorOrmEntity);
    const estadisticaRepo = dataSource.getRepository(EstadisticaJugadorOrmEntity);

    const liga = await ligaRepo.save({
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
      emblemaUrl: 'https://crests.football-data.org/PL.png',
    });

    const equipo = await equipoRepo.save({
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      externalId: 57,
      nombre: 'Arsenal FC',
      nombreCorto: 'Arsenal',
      tla: 'ARS',
      escudoUrl: 'https://crests.football-data.org/57.png',
      ligaId: liga.id,
    });

    const jugador = await jugadorRepo.save({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      externalId: 3189,
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      posicionOriginal: 'Right Winger',
      fechaNacimiento: '2001-09-05',
      nacionalidad: 'England',
      dorsal: 7,
      equipoId: equipo.id,
      ligaId: liga.id,
      activo: true,
    });

    await estadisticaRepo.save({
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      jugadorId: jugador.id,
      temporada: '2024/2025',
      liga: 'PL',
      fuente: 'whoscored',
      partidosJugados: 35,
      minutosJugados: 2980,
      goles: 14,
      asistencias: 10,
      tarjetasAmarillas: 3,
      tarjetasRojas: 0,
      rating: 7.45,
      tirosPorPartido: 2.3,
      precisionPase: 82.1,
      duelosAereosGanadosPorPartido: 1.5,
      regatesCompletadosPorPartido: 1.8,
      pasesClavePorPartido: 1.2,
      xgPorPartido: 0.41,
      xaPorPartido: 0.29,
      grandesOcasionesPorPartido: 0.5,
      entradasPorPartido: 1.1,
      intercepccionesPorPartido: 0.8,
      despejesPorPartido: 0.6,
      pasesPorPartido: 35.2,
      centrosPorPartido: 1.4,
      atajadas: null,
      golesRecibidos: null,
      porcentajeAtajadas: null,
      erroresQueGeneraronGol: null,
      autogoles: 0,
      fechaActualizacion: new Date(),
    });

    const response = await request(app.getHttpServer())
      .get(`/players/${jugador.id}`)
      .expect(200);

    const body = response.body;
    expect(body.id).toBe(jugador.id);
    expect(body.nombre).toBe('Bukayo Saka');
    expect(body.posicion).toBe('Delantero');
    expect(body.equipo.nombre).toBe('Arsenal FC');
    expect(body.liga.codigo).toBe('PL');

    expect(body.estadisticas).toBeDefined();
    expect(body.estadisticas.temporada).toBe('2024/2025');
    expect(body.estadisticas.liga).toBe('PL');
    expect(body.estadisticas.partidosJugados).toBe(35);
    expect(body.estadisticas.minutosJugados).toBe(2980);
    expect(body.estadisticas.goles).toBe(14);
    expect(body.estadisticas.asistencias).toBe(10);
    expect(body.estadisticas.tarjetasAmarillas).toBe(3);
    expect(body.estadisticas.tarjetasRojas).toBe(0);
    expect(body.estadisticas.rating).toBe(7.45);
    expect(body.estadisticas.tirosPorPartido).toBe(2.3);
    expect(body.estadisticas.precisionPase).toBe(82.1);
    expect(body.estadisticas.regatesCompletadosPorPartido).toBe(1.8);
    // Campos en null no deben estar presentes en el JSON serializado
    expect(body.estadisticas.atajadas).toBeUndefined();
    expect(body.estadisticas.golesRecibidos).toBeUndefined();
  });

  it('debe obtener la ficha del jugador con estadisticas: null cuando no tiene WhoScored (200 OK)', async () => {
    const ligaRepo = dataSource.getRepository(LigaOrmEntity);
    const equipoRepo = dataSource.getRepository(EquipoOrmEntity);
    const jugadorRepo = dataSource.getRepository(JugadorOrmEntity);

    const liga = await ligaRepo.save({
      id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
    });

    const equipo = await equipoRepo.save({
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      externalId: 58,
      nombre: 'Aston Villa FC',
      ligaId: liga.id,
    });

    const jugador = await jugadorRepo.save({
      id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      externalId: 3190,
      nombre: 'Ollie Watkins',
      posicion: 'Delantero',
      posicionOriginal: 'Centre-Forward',
      nacionalidad: 'England',
      equipoId: equipo.id,
      ligaId: liga.id,
      activo: true,
    });

    const response = await request(app.getHttpServer())
      .get(`/players/${jugador.id}`)
      .expect(200);

    expect(response.body.id).toBe(jugador.id);
    expect(response.body.nombre).toBe('Ollie Watkins');
    expect(response.body.estadisticas).toBeNull();
  });

  it('debe responder 400 Bad Request cuando el UUID es inválido', async () => {
    const response = await request(app.getHttpServer())
      .get('/players/id-invalido-no-uuid')
      .expect(400);

    expect(response.body.codigoEstado).toBe(400);
  });

  it('debe responder 404 Not Found cuando el jugador no existe', async () => {
    const idInexistente = '99999999-9999-4999-8999-999999999999';

    const response = await request(app.getHttpServer())
      .get(`/players/${idInexistente}`)
      .expect(404);

    expect(response.body.codigoEstado).toBe(404);
  });
});
