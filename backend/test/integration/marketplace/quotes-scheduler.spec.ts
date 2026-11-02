import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { QuotesSchedulerService } from '../../../src/services/scheduler/quotes-scheduler.service';
import { QuotesService } from '../../../src/services/quotes.service';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { ConfiguracionMercadoTypeOrmRepository } from '../../../src/data-access/configuracion-mercado.typeorm-repository';
import { ConfiguracionMercadoOrmEntity } from '../../../src/data-access/configuracion-mercado.orm-entity';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { TokensService } from '../../../src/services/tokens.service';

describe('QuotesSchedulerService (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let schedulerService: QuotesSchedulerService;
  let cotizacionRepo: CotizacionTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const cotizacionOrmRepo = dataSource.getRepository(CotizacionOrmEntity);
    cotizacionRepo = new CotizacionTypeOrmRepository(cotizacionOrmRepo);

    jugadorRepo = new JugadorTypeOrmRepository(
      dataSource.getRepository(JugadorOrmEntity),
    );
    const estadisticaRepo = new EstadisticaJugadorTypeOrmRepository(
      dataSource.getRepository(EstadisticaJugadorOrmEntity),
    );
    const configRepo = new ConfiguracionMercadoTypeOrmRepository(
      dataSource.getRepository(ConfiguracionMercadoOrmEntity),
    );
    const usuarioRepo = new UsuarioTypeOrmRepository(
      dataSource.getRepository(UsuarioOrmEntity),
    );

    const mockRedisClient: any = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    const cacheService = new MarketplaceCacheService(mockRedisClient);

    const tokensService = new TokensService(
      dataSource,
      usuarioRepo,
      jugadorRepo,
      configRepo,
    );

    const quotesService = new QuotesService(
      dataSource,
      cotizacionRepo,
      jugadorRepo,
      estadisticaRepo,
      configRepo,
      usuarioRepo,
      cacheService,
      tokensService,
    );

    schedulerService = new QuotesSchedulerService(dataSource, quotesService);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();
  });

  it('debe ejecutar el handler, asignar valor 1.00 sin estadísticas e impedir ejecuciones solapadas', async () => {
    const ligaId = 'b4000000-0000-0000-0000-000000000001';
    const equipoId = 'c4000000-0000-0000-0000-000000000001';
    const jugadorId = 'd4000000-0000-0000-0000-000000000001';

    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'Bundesliga', 'BL1', 'Alemania')`,
      [ligaId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 601, 'Bayern Munich', $2)`,
      [equipoId, ligaId],
    );
    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
       VALUES ($1, 701, 'Harry Kane', 'Delantero', $2, $3, true)`,
      [jugadorId, equipoId, ligaId],
    );

    // 1. Ejecutar handler
    const resultado = await schedulerService.ejecutarRecalculoSemanal();
    expect(resultado.ejecutado).toBe(true);
    expect(resultado.procesados).toBe(1);
    expect(resultado.fallidos).toBe(0);

    // 2. Verificar que se persistió cotización con valor 1.00 y sinEstadisticas = true
    const cotizacion = await cotizacionRepo.obtenerUltimaCotizacion(jugadorId);
    expect(cotizacion).not.toBeNull();
    expect(cotizacion!.valor).toBe(1.0);
    expect(cotizacion!.sinEstadisticas).toBe(true);

    // 3. Simular solapamiento reteniendo el lock en una conexión separada
    const lockRunner = dataSource.createQueryRunner();
    await lockRunner.connect();
    await lockRunner.query(`SELECT pg_advisory_lock(20261101)`);
    try {
      const solapado = await schedulerService.ejecutarRecalculoSemanal();
      expect(solapado.ejecutado).toBe(false);
    } finally {
      await lockRunner.query(`SELECT pg_advisory_unlock(20261101)`);
      await lockRunner.release();
    }
  });

  it('debe ejecutar benchmark a escala (2.500 jugadores) procesando en < 50 ms/jugador (SC-002)', async () => {
    const ligaId = 'b4000000-0000-0000-0000-000000000002';
    const equipoId = 'c4000000-0000-0000-0000-000000000002';

    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'Ligue 1', 'FL1', 'Francia')`,
      [ligaId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 602, 'PSG', $2)`,
      [equipoId, ligaId],
    );

    // Generar e insertar 2.500 jugadores activos en bloques de 500
    const totalJugadores = 2500;
    const batchSize = 500;

    for (let batch = 0; batch < totalJugadores / batchSize; batch++) {
      const values: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        const num = batch * batchSize + i + 1;
        const id = `d4000000-0000-0000-0000-${num.toString().padStart(12, '0')}`;
        const externalId = 10000 + num;
        values.push(
          `('${id}', ${externalId}, 'Jugador Escala ${num}', 'Delantero', '${equipoId}', '${ligaId}', true)`,
        );
      }
      await dataSource.query(
        `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES ${values.join(',')}`,
      );
    }

    // Ejecutar recálculo
    const res = await schedulerService.ejecutarRecalculoSemanal();
    expect(res.ejecutado).toBe(true);
    expect(res.procesados).toBe(totalJugadores);
    expect(res.fallidos).toBe(0);

    const msPorJugador = res.duracionMs! / res.procesados!;
    expect(msPorJugador).toBeLessThan(50); // Criterio SC-002: < 50 ms/jugador
  }, 120000);
});
