import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';

describe('EstadisticaJugadorTypeOrmRepository (Integration Test)', () => {
  let dataSource: DataSource;
  let repository: EstadisticaJugadorTypeOrmRepository;
  const testLigaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const testEquipoId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const testJugadorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeAll(async () => {
    const started = await ScrapingTestDatabaseHelper.start();
    dataSource = started.dataSource;
    repository = new EstadisticaJugadorTypeOrmRepository(
      dataSource.getRepository(EstadisticaJugadorOrmEntity),
    );
  }, 90000);

  afterAll(async () => {
    await ScrapingTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await ScrapingTestDatabaseHelper.cleanDatabase();

    // Crear entidades padre para la FK
    const ligaRepo = dataSource.getRepository(LigaOrmEntity);
    await ligaRepo.save({
      id: testLigaId,
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'England',
      activo: true,
    });

    const equipoRepo = dataSource.getRepository(EquipoOrmEntity);
    await equipoRepo.save({
      id: testEquipoId,
      externalId: 64,
      nombre: 'Liverpool FC',
      codigo: 'LIV',
      ligaId: testLigaId,
      activo: true,
    });

    const jugadorRepo = dataSource.getRepository(JugadorOrmEntity);
    await jugadorRepo.save({
      id: testJugadorId,
      externalId: 1001,
      nombre: 'Mohamed Salah',
      posicion: 'Delantero',
      equipoId: testEquipoId,
      ligaId: testLigaId,
      activo: true,
    });
  });

  it('debe guardar y recuperar estadísticas por jugadorId y temporada', async () => {
    const stats = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 12,
      minutosJugados: 1080,
      goles: 8,
      asistencias: 5,
      tirosPorPartido: 3.2,
      precisionPase: 82.5,
      rating: 7.68,
      tarjetasAmarillas: 1,
      tarjetasRojas: 0,
    });

    const guardado = await repository.guardar(stats);
    expect(guardado.id).toBeDefined();
    expect(guardado.jugadorId).toBe(testJugadorId);
    expect(guardado.goles).toBe(8);

    const recuperado = await repository.buscarPorJugadorYTemporada(
      testJugadorId,
      '2025/2026',
    );
    expect(recuperado).not.toBeNull();
    expect(recuperado!.goles).toBe(8);
    expect(recuperado!.asistencias).toBe(5);
    expect(recuperado!.rating).toBe(7.68);
    expect(recuperado!.precisionPase).toBe(82.5);
  });

  it('debe retornar null cuando no existen estadísticas para la combinación jugador/temporada', async () => {
    const inexistente = await repository.buscarPorJugadorYTemporada(
      testJugadorId,
      '2020/2021',
    );
    expect(inexistente).toBeNull();
  });

  it('debe guardar y listar múltiples registros por lotes (guardarMuchos)', async () => {
    const stats1 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2024/2025',
      liga: 'PL',
      partidosJugados: 30,
      minutosJugados: 2600,
      goles: 18,
      asistencias: 10,
      rating: 7.8,
      tarjetasAmarillas: 2,
      tarjetasRojas: 0,
    });

    const stats2 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 10,
      minutosJugados: 850,
      goles: 6,
      asistencias: 4,
      rating: 7.5,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
    });

    await repository.guardarMuchos([stats1, stats2]);

    const todas = await repository.buscarPorJugador(testJugadorId);
    expect(todas).toHaveLength(2);
  });
});
