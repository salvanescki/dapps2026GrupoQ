import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';

describe('Scraping Upsert & Idempotence (Integration Test)', () => {
  let dataSource: DataSource;
  let repository: EstadisticaJugadorTypeOrmRepository;
  const testLigaId = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const testEquipoId = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const testJugadorId = '33333333-cccc-4ccc-8ccc-cccccccccccc';

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
      externalId: 65,
      nombre: 'Manchester City FC',
      codigo: 'MCI',
      ligaId: testLigaId,
      activo: true,
    });

    const jugadorRepo = dataSource.getRepository(JugadorOrmEntity);
    await jugadorRepo.save({
      id: testJugadorId,
      externalId: 2001,
      nombre: 'Erling Haaland',
      posicion: 'Delantero',
      equipoId: testEquipoId,
      ligaId: testLigaId,
      activo: true,
    });
  });

  it('debe realizar un upsert idempotente sin generar registros duplicados para la misma temporada', async () => {
    const fechaInicial = new Date('2026-10-01T10:00:00.000Z');
    const corrida1 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 5,
      minutosJugados: 450,
      goles: 7,
      asistencias: 1,
      rating: 8.1,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      fechaActualizacion: fechaInicial,
    });

    await repository.guardar(corrida1);

    const totalInicial = await dataSource
      .getRepository(EstadisticaJugadorOrmEntity)
      .count();
    expect(totalInicial).toBe(1);

    // Corrida 2 (siguiente semana): 3 partidos más, 3 goles más, nueva fecha
    const fechaActualizada = new Date('2026-10-08T10:00:00.000Z');
    const corrida2 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 8,
      minutosJugados: 720,
      goles: 10,
      asistencias: 2,
      rating: 8.25,
      tarjetasAmarillas: 1,
      tarjetasRojas: 0,
      fechaActualizacion: fechaActualizada,
    });

    await repository.guardar(corrida2);

    const totalFinal = await dataSource
      .getRepository(EstadisticaJugadorOrmEntity)
      .count();
    expect(totalFinal).toBe(1); // Idempotencia garantizada: NO se duplica

    const actualizado = await repository.buscarPorJugadorYTemporada(
      testJugadorId,
      '2025/2026',
    );
    expect(actualizado).not.toBeNull();
    expect(actualizado!.partidosJugados).toBe(8);
    expect(actualizado!.goles).toBe(10);
    expect(actualizado!.asistencias).toBe(2);
    expect(actualizado!.rating).toBe(8.25);
    expect(actualizado!.tarjetasAmarillas).toBe(1);
    expect(actualizado!.fechaActualizacion.toISOString()).toBe(
      fechaActualizada.toISOString(),
    );
  });

  it('debe tolerar múltiples registros del mismo jugador en el mismo lote sin lanzar error ON CONFLICT DO UPDATE', async () => {
    const e1 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 5,
      minutosJugados: 400,
      goles: 2,
    });

    const e2 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 8,
      minutosJugados: 700,
      goles: 5,
    });

    // Enviar ambos en el mismo array batch
    await expect(repository.guardarMuchos([e1, e2])).resolves.not.toThrow();

    const resultado = await repository.buscarPorJugadorYTemporada(
      testJugadorId,
      '2025/2026',
    );
    expect(resultado).not.toBeNull();
    expect(resultado!.minutosJugados).toBe(700);
    expect(resultado!.goles).toBe(5);
  });
});
