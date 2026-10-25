import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000 } from '../../../src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness';

describe('EstadisticaJugador Contexto & Migración (Integration Test)', () => {
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

    const queryRunner = dataSource.createQueryRunner();
    const migration = new AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000();
    await migration.up(queryRunner);
    await queryRunner.release();

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
      whoScoredTeamId: '26',
      nombre: 'Liverpool FC',
      ligaId: testLigaId,
    });

    const jugadorRepo = dataSource.getRepository(JugadorOrmEntity);
    await jugadorRepo.save({
      id: testJugadorId,
      externalId: 1001,
      whoScoredPlayerId: '10884',
      nombre: 'Mohamed Salah',
      posicion: 'Delantero',
      equipoId: testEquipoId,
      ligaId: testLigaId,
      activo: true,
    });
  });

  it('debe haber aplicado la migración creando el índice funcional uq_estadistica_jugador_contexto', async () => {
    const result = await dataSource.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE indexname = 'uq_estadistica_jugador_contexto';
    `);

    expect(result.length).toBe(1);
    expect(result[0].indexdef).toContain('COALESCE(fuente');
    expect(result[0].indexdef).toContain('COALESCE(competencia');
    expect(result[0].indexdef).toContain('COALESCE(etapa');
  });

  it('debe abortar con RAISE EXCEPTION si existen duplicados contextuales antes de aplicar el índice funcional', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Temporalmente eliminamos el índice único funcional para poder simular duplicados
    await queryRunner.query('DROP INDEX IF EXISTS uq_estadistica_jugador_contexto;');

    // Insertamos dos registros idénticos en contexto para el mismo jugador
    const id1 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
    const id2 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';

    await queryRunner.query(`
      INSERT INTO estadisticas_jugadores (
        id, jugador_id, temporada, liga, competencia, etapa, fuente, fecha_actualizacion, partidos_jugados, minutos_jugados, goles, asistencias
      ) VALUES 
      ('${id1}', '${testJugadorId}', '2025/2026', 'PL', 'Premier League', 'Stage 1', 'whoscored', NOW(), 5, 450, 2, 1),
      ('${id2}', '${testJugadorId}', '2025/2026', 'PL', 'Premier League', 'Stage 1', 'whoscored', NOW(), 5, 450, 2, 1);
    `);

    const migration = new AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000();
    await expect(migration.up(queryRunner)).rejects.toThrow(
      /Migración abortada: se detectaron \d+ grupos de registros duplicados/,
    );

    await queryRunner.release();
  });

  it('debe persistir con guardarMuchos usando ON CONFLICT funcional sin duplicar filas', async () => {
    const stat1 = EstadisticaJugador.crear({
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 8,
      asistencias: 4,
      rating: 7.8,
    });

    await repository.guardarMuchos([stat1]);

    const conteoInicial = await dataSource.query(
      `SELECT COUNT(*) FROM estadisticas_jugadores WHERE jugador_id = '${testJugadorId}';`,
    );
    expect(Number(conteoInicial[0].count)).toBe(1);

    // Re-guardar con actualización de goles para el mismo contexto
    const statActualizada = EstadisticaJugador.crear({
      id: stat1.id,
      jugadorId: testJugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 11,
      minutosJugados: 990,
      goles: 9,
      asistencias: 5,
      rating: 7.9,
    });

    await repository.guardarMuchos([statActualizada]);

    const conteoFinal = await dataSource.query(
      `SELECT COUNT(*), goles, minutos_jugados FROM estadisticas_jugadores WHERE jugador_id = '${testJugadorId}' GROUP BY goles, minutos_jugados;`,
    );
    expect(conteoFinal.length).toBe(1);
    expect(conteoFinal[0].goles).toBe(9);
    expect(conteoFinal[0].minutos_jugados).toBe(990);
  });
});
