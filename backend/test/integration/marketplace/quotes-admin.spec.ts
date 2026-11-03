import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { QuotesController } from '../../../src/controllers/quotes.controller';
import { QuotesService } from '../../../src/services/quotes.service';
import { ConfiguracionMercadoTypeOrmRepository } from '../../../src/data-access/configuracion-mercado.typeorm-repository';
import { ConfiguracionMercadoOrmEntity } from '../../../src/data-access/configuracion-mercado.orm-entity';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { EstadisticaJugadorTypeOrmRepository } from '../../../src/scraping/data-access/estadistica-jugador.typeorm-repository';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { TokensService } from '../../../src/services/tokens.service';
import { BalanceTokenTypeOrmRepository } from '../../../src/data-access/balance-token.typeorm-repository';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { Usuario } from '../../../src/domain/usuario.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Quotes Admin & Strategy Governance (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let quotesController: QuotesController;
  let quotesService: QuotesService;
  let usuarioRepo: UsuarioTypeOrmRepository;
  let configRepo: ConfiguracionMercadoTypeOrmRepository;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  let adminUser: Usuario;
  let regularUser: Usuario;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const configOrmRepo = dataSource.getRepository(ConfiguracionMercadoOrmEntity);
    configRepo = new ConfiguracionMercadoTypeOrmRepository(configOrmRepo);

    const usuarioOrmRepo = dataSource.getRepository(UsuarioOrmEntity);
    usuarioRepo = new UsuarioTypeOrmRepository(usuarioOrmRepo);

    const jugadorRepo = new JugadorTypeOrmRepository(dataSource.getRepository(JugadorOrmEntity));
    const cotizacionRepo = new CotizacionTypeOrmRepository(dataSource.getRepository(CotizacionOrmEntity));
    const estadisticaRepo = new EstadisticaJugadorTypeOrmRepository(dataSource.getRepository(EstadisticaJugadorOrmEntity));
    const balanceTokenRepo = new BalanceTokenTypeOrmRepository(dataSource.getRepository(BalanceTokenOrmEntity));

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
    const cacheService = new MarketplaceCacheService(mockRedisClient);
    const tokensService = new TokensService(dataSource, usuarioRepo, jugadorRepo, configRepo);

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

    quotesController = new QuotesController(quotesService);

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector, usuarioRepo);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    // Crear superusuario ADMIN y USUARIO estándar
    adminUser = Usuario.crear({
      nombre: 'Admin Marketplace',
      correo: 'admin@marketplace.com',
      contrasenaHash: 'hash-admin',
      rol: 'ADMIN',
    });
    await usuarioRepo.guardar(adminUser);

    regularUser = Usuario.crear({
      nombre: 'User Marketplace',
      correo: 'user@marketplace.com',
      contrasenaHash: 'hash-user',
      rol: 'USUARIO',
    });
    await usuarioRepo.guardar(regularUser);

    // Sembrar configuración inicial
    await dataSource.query(`
      INSERT INTO configuraciones_mercado (id, estrategia_activa_id, estrategia_activa_version, actualizado_por, actualizado_en)
      VALUES (1, 'GLOBAL', 'GLOBAL_v1', '${adminUser.id}', NOW())
      ON CONFLICT (id) DO UPDATE SET estrategia_activa_id = 'GLOBAL', estrategia_activa_version = 'GLOBAL_v1'
    `);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: () => QuotesController.prototype.cambiarEstrategia,
      getClass: () => QuotesController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('GET /quotes/strategy: debe retornar la estrategia activa y el catálogo de estrategias aprobadas', async () => {
    const res = await quotesController.obtenerConfiguracionEstrategia();

    expect(res).toBeDefined();
    expect(res.estrategiaActivaId).toBe('GLOBAL');
    expect(res.estrategiaActivaVersion).toBe('GLOBAL_v1');
    expect(res.estrategiasDisponibles).toHaveLength(2);

    const ids = res.estrategiasDisponibles.map((e) => e.id);
    expect(ids).toContain('GLOBAL');
    expect(ids).toContain('POSICIONAL');
  });

  it('PUT /quotes/strategy: debe permitir cambiar la estrategia activa a POSICIONAL por ADMIN', async () => {
    // Validar guard para ADMIN
    const ctx = createMockContext({ id: adminUser.id, correo: adminUser.correo });
    const canActivate = await rolesGuard.canActivate(ctx);
    expect(canActivate).toBe(true);

    const res = await quotesController.cambiarEstrategia(
      { estrategiaId: 'POSICIONAL' },
      { user: { id: adminUser.id } },
    );

    expect(res.estrategiaActivaId).toBe('POSICIONAL');
    expect(res.estrategiaActivaVersion).toBe('POSICIONAL_v1');

    // Verificar en BD
    const dbConfig = await configRepo.obtenerConfiguracion();
    expect(dbConfig.estrategiaActivaId).toBe('POSICIONAL');
    expect(dbConfig.estrategiaActivaVersion).toBe('POSICIONAL_v1');
    expect(dbConfig.actualizadoPor).toBe(adminUser.id);
  });

  it('PUT /quotes/strategy: debe rechazar con ForbiddenException (403) a un usuario con rol USUARIO', async () => {
    const ctx = createMockContext({ id: regularUser.id, correo: regularUser.correo });

    await expect(rolesGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('PUT /quotes/strategy: debe rechazar con UnauthorizedException (401) si no hay usuario autenticado', async () => {
    const ctx = createMockContext(null);

    await expect(rolesGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('PUT /quotes/strategy: debe rechazar con ReglaDeNegocioException (400) si se envía una estrategia no soportada', async () => {
    await expect(
      quotesService.cambiarEstrategiaActiva('INEXISTENTE' as any, adminUser.id),
    ).rejects.toThrow(ReglaDeNegocioException);
  });

  it('POST /quotes/recalculate: debe ejecutar el recálculo masivo manual reflejando la estrategia POSICIONAL', async () => {
    // 1. Conmutar a POSICIONAL
    await quotesController.cambiarEstrategia(
      { estrategiaId: 'POSICIONAL' },
      { user: { id: adminUser.id } },
    );

    // 2. Sembrar jugadores
    const ligaId = 'b0000000-0000-0000-0000-000000000001';
    await dataSource.query(`
      INSERT INTO ligas (id, nombre, codigo, pais)
      VALUES ('${ligaId}', 'Liga Santander', 'PD', 'Espana')
      ON CONFLICT (id) DO NOTHING
    `);

    const equipoId = 'b0000000-0000-0000-0000-000000000002';
    await dataSource.query(`
      INSERT INTO equipos (id, nombre, liga_id, external_id)
      VALUES ('${equipoId}', 'Real Madrid', '${ligaId}', 901)
      ON CONFLICT (id) DO NOTHING
    `);

    const jugadorId = 'b0000000-0000-0000-0000-000000000003';
    await dataSource.query(`
      INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
      VALUES ('${jugadorId}', 9001, 'Vinicius Jr', 'Delantero', '${equipoId}', '${ligaId}', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Sembrar estadísticas
    const estadistica = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PD',
      fuente: 'whoscored',
      partidosJugados: 10,
      goles: 20,
      asistencias: 15,
      tirosPorPartido: 3.5,
      pasesClavePorPartido: 2.5,
      regatesCompletadosPorPartido: 4.0,
      entradasPorPartido: 1.0,
      rating: 8.5,
    });
    const estRepo = new EstadisticaJugadorTypeOrmRepository(
      dataSource.getRepository(EstadisticaJugadorOrmEntity),
    );
    await estRepo.guardar(estadistica);

    // 4. Ejecutar recálculo manual
    const resumen = await quotesController.recalcularManualmente();

    expect(resumen).toBeDefined();
    expect(resumen.mensaje).toBe('Recálculo de cotizaciones finalizado exitosamente.');
    expect(resumen.totalJugadoresProcesados).toBeGreaterThanOrEqual(1);
    expect(resumen.exitosos).toBeGreaterThanOrEqual(1);
    expect(resumen.fallidos).toBe(0);
    expect(resumen.estrategiaAplicada).toBe('POSICIONAL');
    expect(resumen.versionEstrategia).toBe('POSICIONAL_v1');

    // 5. Verificar cotización guardada en BD
    const cotizaciones = await dataSource.query(`
      SELECT * FROM cotizaciones WHERE jugador_id = '${jugadorId}' ORDER BY fecha_cotizacion DESC LIMIT 1
    `);
    expect(cotizaciones).toHaveLength(1);
    expect(cotizaciones[0].estrategia_id).toBe('POSICIONAL');
    expect(cotizaciones[0].estrategia_version).toBe('POSICIONAL_v1');
    expect(Number(cotizaciones[0].valor)).toBeGreaterThan(1.0);
  });
});
