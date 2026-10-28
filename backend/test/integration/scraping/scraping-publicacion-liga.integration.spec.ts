import { DataSource } from 'typeorm';
import { ScrapingTestDatabaseHelper } from './scraping-test-database.helper';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { NormalizadorJugadorService } from '../../../src/scraping/services/normalizador-jugador.service';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EjecucionScrapingTypeOrmRepository } from '../../../src/scraping/data-access/ejecucion-scraping.typeorm-repository';
import { EjecucionScrapingOrmEntity } from '../../../src/scraping/data-access/ejecucion-scraping.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { Jugador } from '../../../src/domain/jugador.entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000 } from '../../../src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness';

describe('ScrapingService - Publicación Segura e Idempotente por Liga (Integration Test)', () => {
  let dataSource: DataSource;
  let service: ScrapingService;
  let estadisticaRepo: EstadisticaJugadorTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  const testLigaPLId = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const testLigaLLId = '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const testEquipoPLId = 'bbbbbbbb-1111-4bbb-8bbb-bbbbbbbbbbbb';
  const testEquipoLLId = 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb';
  const testJugadorPLId = 'cccccccc-1111-4ccc-8ccc-cccccccccccc';
  const testJugadorLLId = 'cccccccc-2222-4ccc-8ccc-cccccccccccc';

  beforeAll(async () => {
    const started = await ScrapingTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const queryRunner = dataSource.createQueryRunner();
    const migration = new AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000();
    await migration.up(queryRunner);
    await queryRunner.release();

    estadisticaRepo = new EstadisticaJugadorTypeOrmRepository(
      dataSource.getRepository(EstadisticaJugadorOrmEntity),
    );
    jugadorRepo = new JugadorTypeOrmRepository(
      dataSource.getRepository(JugadorOrmEntity),
    );
    const ejecucionRepo = new EjecucionScrapingTypeOrmRepository(
      dataSource.getRepository(EjecucionScrapingOrmEntity),
    );

    service = new ScrapingService(
      {} as any,
      new NormalizadorJugadorService(),
      estadisticaRepo,
      ejecucionRepo,
      jugadorRepo,
      dataSource,
    );
  }, 90000);

  afterAll(async () => {
    await ScrapingTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await ScrapingTestDatabaseHelper.cleanDatabase();

    const ligaRepo = dataSource.getRepository(LigaOrmEntity);
    await ligaRepo.save([
      { id: testLigaPLId, codigo: 'PL', nombre: 'Premier League', pais: 'England', activo: true },
      { id: testLigaLLId, codigo: 'PD', nombre: 'LaLiga', pais: 'Spain', activo: true },
    ]);

    const equipoRepo = dataSource.getRepository(EquipoOrmEntity);
    await equipoRepo.save([
      { id: testEquipoPLId, externalId: 64, nombre: 'Liverpool FC', ligaId: testLigaPLId },
      { id: testEquipoLLId, externalId: 86, nombre: 'Real Madrid CF', ligaId: testLigaLLId },
    ]);

    const jRepo = dataSource.getRepository(JugadorOrmEntity);
    await jRepo.save([
      {
        id: testJugadorPLId,
        externalId: 1001,
        nombre: 'Mohamed Salah',
        posicion: 'Delantero',
        equipoId: testEquipoPLId,
        ligaId: testLigaPLId,
        activo: true,
      },
      {
        id: testJugadorLLId,
        externalId: 1002,
        nombre: 'Vinicius Junior',
        posicion: 'Delantero',
        equipoId: testEquipoLLId,
        ligaId: testLigaLLId,
        activo: true,
      },
    ]);
  });

  it('debe publicar transaccionalmente una liga enriqueciendo jugadores y persistiendo estadísticas', async () => {
    const jugadorPL = (await jugadorRepo.buscarPorId(testJugadorPLId))!;
    jugadorPL.asociarWhoScored('10884');

    const statPL = EstadisticaJugador.crear({
      jugadorId: testJugadorPLId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 8,
      asistencias: 4,
      rating: 7.9,
    });

    await service.publicarLigaTransaccional([statPL], [jugadorPL]);

    const jugadorActualizado = await jugadorRepo.buscarPorId(testJugadorPLId);
    expect(jugadorActualizado?.whoScoredPlayerId).toBe('10884');

    const statsGuardadas = await estadisticaRepo.buscarPorJugador(testJugadorPLId);
    expect(statsGuardadas.length).toBe(1);
    expect(statsGuardadas[0].goles).toBe(8);
  });

  it('debe garantizar idempotencia estricta: re-ejecutar corrida idéntica produce 0 filas duplicadas', async () => {
    const jugadorPL = (await jugadorRepo.buscarPorId(testJugadorPLId))!;
    jugadorPL.asociarWhoScored('10884');

    const statPL = EstadisticaJugador.crear({
      jugadorId: testJugadorPLId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 8,
      asistencias: 4,
      rating: 7.9,
    });

    // Primera publicación
    await service.publicarLigaTransaccional([statPL], [jugadorPL]);

    // Segunda publicación idéntica
    await service.publicarLigaTransaccional([statPL], [jugadorPL]);

    const conteo = await dataSource.query(
      `SELECT COUNT(*) FROM estadisticas_jugadores WHERE jugador_id = '${testJugadorPLId}';`,
    );
    expect(Number(conteo[0].count)).toBe(1);
  });

  it('debe aislar fallos por liga: error en una liga realiza rollback sin afectar otras ligas', async () => {
    // 1. Liga PL se publica exitosamente
    const jugadorPL = (await jugadorRepo.buscarPorId(testJugadorPLId))!;
    const statPL = EstadisticaJugador.crear({
      jugadorId: testJugadorPLId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 5,
      minutosJugados: 450,
      goles: 3,
      asistencias: 1,
    });
    await service.publicarLigaTransaccional([statPL], [jugadorPL]);

    // 2. Liga LL falla forzadamente dentro de la transacción (FK inexistente en estadística)
    const statLLInvalida = EstadisticaJugador.crear({
      jugadorId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', // Jugador no existe en BD
      temporada: '2025/2026',
      liga: 'LL',
      competencia: 'LaLiga',
      etapa: 'Regular Season',
      fuente: 'whoscored',
      partidosJugados: 5,
      minutosJugados: 450,
      goles: 2,
      asistencias: 1,
    });

    const jugadorLL = (await jugadorRepo.buscarPorId(testJugadorLLId))!;
    jugadorLL.asociarWhoScored('22222');

    await expect(
      service.publicarLigaTransaccional([statLLInvalida], [jugadorLL]),
    ).rejects.toThrow();

    // 3. Verificar aislamiento: PL se mantiene persistida, y LL fue revertida completamente
    const statsPL = await estadisticaRepo.buscarPorJugador(testJugadorPLId);
    expect(statsPL.length).toBe(1);

    const jugadorLLSinCambios = await jugadorRepo.buscarPorId(testJugadorLLId);
    expect(jugadorLLSinCambios?.whoScoredPlayerId).toBeNull(); // Rollback exitoso
  });
});
