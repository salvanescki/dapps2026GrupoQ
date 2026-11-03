import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
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
import { NotFoundException } from '@nestjs/common';

describe('QuotesService (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let quotesService: QuotesService;
  let cotizacionRepo: CotizacionTypeOrmRepository;
  let cacheService: MarketplaceCacheService;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const cotizacionOrmRepo = dataSource.getRepository(CotizacionOrmEntity);
    cotizacionRepo = new CotizacionTypeOrmRepository(cotizacionOrmRepo);

    const jugadorRepo = new JugadorTypeOrmRepository(
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

    const mockRedisStore = new Map<string, string>();
    const mockRedisClient: any = {
      get: jest.fn().mockImplementation(async (key: string) => mockRedisStore.get(key) || null),
      setex: jest.fn().mockImplementation(async (key: string, _ttl: number, val: string) => {
        mockRedisStore.set(key, val);
        return 'OK';
      }),
      del: jest.fn().mockImplementation(async (...keys: string[]) => {
        keys.forEach((k) => mockRedisStore.delete(k));
        return keys.length;
      }),
      keys: jest.fn().mockImplementation(async (pattern: string) => {
        const prefix = pattern.replace('*', '');
        return Array.from(mockRedisStore.keys()).filter((k) => k.startsWith(prefix));
      }),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    cacheService = new MarketplaceCacheService(mockRedisClient);
    const tokensService = new TokensService(
      dataSource,
      usuarioRepo,
      jugadorRepo,
      configRepo,
    );

    quotesService = new QuotesService(
      dataSource,
      cotizacionRepo,
      jugadorRepo,
      estadisticaRepo,
      configRepo,
      usuarioRepo,
      cacheService,
      tokensService,
    );
  }, 90000);

  afterAll(async () => {
    await cacheService.onModuleDestroy();
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();
    await cacheService.invalidarRanking();
  });

  it('debe arrojar NotFoundException si el jugador no existe al consultar historial', async () => {
    await expect(
      quotesService.obtenerHistorialCotizaciones(
        '00000000-0000-0000-0000-000000000099',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe retornar historial cronológico de cotizaciones con snapshot de métricas', async () => {
    const ligaId = 'b3000000-0000-0000-0000-000000000001';
    const equipoId = 'c3000000-0000-0000-0000-000000000001';
    const jugadorId = 'd3000000-0000-0000-0000-000000000001';

    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'La Liga', 'PD', 'España')`,
      [ligaId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 401, 'FC Barcelona', $2)`,
      [equipoId, ligaId],
    );
    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
       VALUES ($1, 501, 'Pedri', 'Mediocampista', $2, $3, true)`,
      [jugadorId, equipoId, ligaId],
    );

    const c1Id = 'e3000000-0000-0000-0000-000000000001';
    const c2Id = 'e3000000-0000-0000-0000-000000000002';

    await dataSource.query(
      `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
       VALUES ($1, $2, 0.0000, 1.00, 'GLOBAL', 'GLOBAL_v1', true, null, now() - interval '7 days')`,
      [c1Id, jugadorId],
    );

    await dataSource.query(
      `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
       VALUES ($1, $2, 0.4500, 1.45, 'GLOBAL', 'GLOBAL_v1', false, '{"keyPasses": 0.8}'::jsonb, now())`,
      [c2Id, jugadorId],
    );

    const historial = await quotesService.obtenerHistorialCotizaciones(
      jugadorId,
      10,
    );
    expect(historial).toHaveLength(2);
    expect(historial[0].id).toBe(c2Id);
    expect(historial[0].valor).toBe(1.45);
    expect(historial[0].metricas).toEqual({ keyPasses: 0.8 });
    expect(historial[1].id).toBe(c1Id);
    expect(historial[1].sinEstadisticas).toBe(true);
  });

  it('debe calcular ranking con variación, suministro, ordenamiento y responder en < 200 ms (con y sin caché)', async () => {
    const adminId = 'a3000000-0000-0000-0000-000000000001';
    const ligaId = 'b3000000-0000-0000-0000-000000000002';
    const equipoId = 'c3000000-0000-0000-0000-000000000002';
    const j1Id = 'd3000000-0000-0000-0000-000000000011';
    const j2Id = 'd3000000-0000-0000-0000-000000000012';

    await dataSource.query(
      `INSERT INTO usuarios (id, nombre, correo, contrasena_hash, rol, saldo) VALUES ($1, 'Admin', 'adm@test.com', 'hash', 'ADMIN', 1000)`,
      [adminId],
    );
    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'Serie A', 'SA', 'Italia')`,
      [ligaId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 402, 'Inter', $2)`,
      [equipoId, ligaId],
    );
    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES
       ($1, 511, 'Lautaro Martinez', 'Delantero', $3, $4, true),
       ($2, 512, 'Nicolo Barella', 'Mediocampista', $3, $4, true)`,
      [j1Id, j2Id, equipoId, ligaId],
    );

    // Balances del ADMIN (Lautaro: 80 disp, Barella: 100 disp)
    await dataSource.query(
      `INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada) VALUES
       ('f3000000-0000-0000-0000-000000000001', $1, $2, 80, 0),
       ('f3000000-0000-0000-0000-000000000002', $1, $3, 100, 0)`,
      [adminId, j1Id, j2Id],
    );

    // Cotizaciones:
    // Lautaro: inicial 1.00 hace 7 días, actual 1.85 (variación +85%)
    await dataSource.query(
      `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, fecha_cotizacion) VALUES
       ('e3000000-0000-0000-0000-000000000011', $1, 0.0, 1.00, 'GLOBAL', 'GLOBAL_v1', true, now() - interval '7 days'),
       ('e3000000-0000-0000-0000-000000000012', $1, 0.85, 1.85, 'GLOBAL', 'GLOBAL_v1', false, now())`,
      [j1Id],
    );

    // Barella: actual 1.50 (solo una cotización, variación 0%)
    await dataSource.query(
      `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, fecha_cotizacion) VALUES
       ('e3000000-0000-0000-0000-000000000021', $1, 0.50, 1.50, 'GLOBAL', 'GLOBAL_v1', false, now())`,
      [j2Id],
    );

    // Benchmark primera consulta (sin caché)
    const t0 = Date.now();
    const rankingSinCache = await quotesService.obtenerRanking(10);
    const duracionSinCache = Date.now() - t0;

    expect(duracionSinCache).toBeLessThan(200); // Latencia < 200 ms
    expect(rankingSinCache).toHaveLength(2);

    // Lautaro primero (1.85 > 1.50)
    expect(rankingSinCache[0].posicionRanking).toBe(1);
    expect(rankingSinCache[0].nombre).toBe('Lautaro Martinez');
    expect(rankingSinCache[0].cotizacionActual).toBe(1.85);
    expect(rankingSinCache[0].variacionPorcentual).toBe(85);
    expect(rankingSinCache[0].tokensDisponibles).toBe(80);

    // Barella segundo
    expect(rankingSinCache[1].posicionRanking).toBe(2);
    expect(rankingSinCache[1].nombre).toBe('Nicolo Barella');
    expect(rankingSinCache[1].cotizacionActual).toBe(1.50);
    expect(rankingSinCache[1].variacionPorcentual).toBe(0);
    expect(rankingSinCache[1].tokensDisponibles).toBe(100);

    // Benchmark segunda consulta (con caché L1)
    const t1 = Date.now();
    const rankingConCache = await quotesService.obtenerRanking(10);
    const duracionConCache = Date.now() - t1;

    expect(duracionConCache).toBeLessThan(50);
    expect(rankingConCache).toEqual(rankingSinCache);

    // Filtrar por posición Delantero
    const rankingDelanteros = await quotesService.obtenerRanking(10, 'Delantero');
    expect(rankingDelanteros).toHaveLength(1);
    expect(rankingDelanteros[0].nombre).toBe('Lautaro Martinez');
  });

  it('debe retornar array vacio si no hay jugadores activos en ranking', async () => {
    const ranking = await quotesService.obtenerRanking(10);
    expect(ranking).toEqual([]);
  });

  it('debe ordenar ranking por score y nombre ante empate de valor, ignorar jugadores sin cotizacion y soportar jugadores sin admin', async () => {
    const ligaId = 'b4000000-0000-0000-0000-000000000001';
    const equipoId = 'c4000000-0000-0000-0000-000000000001';
    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'Serie A', 'SA', 'Italia')`,
      [ligaId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 701, 'Equipo Serie A', $2)`,
      [equipoId, ligaId],
    );

    // 3 jugadores activos: jA (score 0.50, valor 1.50), jB (score 0.60, valor 1.50), jC (score 0.50, valor 1.50), jSinCotizacion
    const jAId = 'd4000000-0000-0000-0000-000000000001';
    const jBId = 'd4000000-0000-0000-0000-000000000002';
    const jCId = 'd4000000-0000-0000-0000-000000000003';
    const jSinCotId = 'd4000000-0000-0000-0000-000000000004';

    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES
       ($1, 801, 'Zeta Player', 'Delantero', $5, $6, true),
       ($2, 802, 'Alpha Player', 'Delantero', $5, $6, true),
       ($3, 803, 'Beta Player', 'Delantero', $5, $6, true),
       ($4, 804, 'Sin Cotizacion', 'Delantero', $5, $6, true)`,
      [jAId, jBId, jCId, jSinCotId, equipoId, ligaId],
    );

    await dataSource.query(
      `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, fecha_cotizacion) VALUES
       ('e4000000-0000-0000-0000-000000000001', $1, 0.50, 1.50, 'GLOBAL', 'GLOBAL_v1', false, now()),
       ('e4000000-0000-0000-0000-000000000002', $2, 0.60, 1.50, 'GLOBAL', 'GLOBAL_v1', false, now()),
       ('e4000000-0000-0000-0000-000000000003', $3, 0.50, 1.50, 'GLOBAL', 'GLOBAL_v1', false, now())`,
      [jAId, jBId, jCId],
    );

    // Sin admin en BD para ejercitar la rama admin = null
    const ranking = await quotesService.obtenerRanking(10);

    // Alpha Player (score 0.60 > 0.50)
    expect(ranking[0].nombre).toBe('Alpha Player');
    expect(ranking[0].equipoNombre).toBe('Equipo Serie A');

    // Empate de valor (1.50) y score (0.50): Beta Player alfabéticamente antes que Zeta Player
    expect(ranking[1].nombre).toBe('Beta Player');
    expect(ranking[2].nombre).toBe('Zeta Player');

    // jSinCotId debe haber sido ignorado
    expect(ranking.some((r) => r.jugadorId === jSinCotId)).toBe(false);
  });
});
