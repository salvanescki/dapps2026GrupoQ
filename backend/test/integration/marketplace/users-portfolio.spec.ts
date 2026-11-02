import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { OmsService } from '../../../src/services/oms.service';
import { UsersController } from '../../../src/controllers/users.controller';
import { AdminTransactionsController } from '../../../src/controllers/admin-transactions.controller';
import { OrdenTypeOrmRepository } from '../../../src/data-access/orden.typeorm-repository';
import { OrdenOrmEntity } from '../../../src/data-access/orden.orm-entity';
import { TransaccionTypeOrmRepository } from '../../../src/data-access/transaccion.typeorm-repository';
import { TransaccionOrmEntity } from '../../../src/data-access/transaccion.orm-entity';
import { BalanceTokenTypeOrmRepository } from '../../../src/data-access/balance-token.typeorm-repository';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { Usuario } from '../../../src/domain/usuario.entity';
import { ForbiddenException } from '@nestjs/common';

describe('Users Portfolio & Transaction Audit (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let omsService: OmsService;
  let usersController: UsersController;
  let adminController: AdminTransactionsController;
  let usuarioRepo: UsuarioTypeOrmRepository;

  let adminUser: Usuario;
  let usuario1: Usuario;
  let usuario2: Usuario;

  const ligaId = 'f1000000-0000-0000-0000-000000000001';
  const equipoId = 'f2000000-0000-0000-0000-000000000001';
  const jugador1Id = 'f3000000-0000-0000-0000-000000000001';
  const jugador2Id = 'f3000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const ordenRepo = new OrdenTypeOrmRepository(dataSource.getRepository(OrdenOrmEntity));
    const transaccionRepo = new TransaccionTypeOrmRepository(dataSource.getRepository(TransaccionOrmEntity));
    const balanceTokenRepo = new BalanceTokenTypeOrmRepository(dataSource.getRepository(BalanceTokenOrmEntity));
    const cotizacionRepo = new CotizacionTypeOrmRepository(dataSource.getRepository(CotizacionOrmEntity));
    const jugadorRepo = new JugadorTypeOrmRepository(dataSource.getRepository(JugadorOrmEntity));
    usuarioRepo = new UsuarioTypeOrmRepository(dataSource.getRepository(UsuarioOrmEntity));

    const mockRedisClient: any = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    const cacheService = new MarketplaceCacheService(mockRedisClient);

    omsService = new OmsService(
      dataSource,
      ordenRepo,
      transaccionRepo,
      balanceTokenRepo,
      cotizacionRepo,
      jugadorRepo,
      usuarioRepo,
      cacheService,
    );

    usersController = new UsersController(omsService);
    adminController = new AdminTransactionsController(omsService);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    // 1. Crear usuarios
    adminUser = Usuario.crear({
      nombre: 'Super Administrador',
      correo: 'admin@portfolio.com',
      contrasenaHash: 'hash',
      rol: 'ADMIN',
      saldo: 1000.0,
    });
    await usuarioRepo.guardar(adminUser);

    usuario1 = Usuario.crear({
      nombre: 'Inversor 1',
      correo: 'user1@portfolio.com',
      contrasenaHash: 'hash',
      rol: 'USUARIO',
      saldo: 800.0,
    });
    await usuarioRepo.guardar(usuario1);

    usuario2 = Usuario.crear({
      nombre: 'Inversor 2',
      correo: 'user2@portfolio.com',
      contrasenaHash: 'hash',
      rol: 'USUARIO',
      saldo: 500.0,
    });
    await usuarioRepo.guardar(usuario2);

    // 2. Sembrar catálogo
    await dataSource.query(`
      INSERT INTO ligas (id, nombre, codigo, pais)
      VALUES ('${ligaId}', 'Bundesliga', 'BL1', 'Alemania')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO equipos (id, external_id, nombre, liga_id)
      VALUES ('${equipoId}', 1001, 'Bayern Munich', '${ligaId}')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
      VALUES
        ('${jugador1Id}', 1101, 'Harry Kane', 'Delantero', '${equipoId}', '${ligaId}', true),
        ('${jugador2Id}', 1102, 'Jamal Musiala', 'Mediocampista', '${equipoId}', '${ligaId}', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Cotizaciones vigentes
    await dataSource.query(`
      INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
      VALUES
        ('c4000000-0000-0000-0000-000000000001', '${jugador1Id}', 0.8000, 1.80, 'GLOBAL', 'GLOBAL_v1', false, null, now()),
        ('c4000000-0000-0000-0000-000000000002', '${jugador2Id}', 0.6000, 1.60, 'POSICIONAL', 'POSICIONAL_v1', false, null, now())
    `);

    // 4. Balances para Usuario 1: 10 Kane (8 disponibles, 2 en venta) y 5 Musiala (5 disponibles)
    await dataSource.query(`
      INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada, actualizado_en)
      VALUES
        ('b3000000-0000-0000-0000-000000000001', '${usuario1.id}', '${jugador1Id}', 8, 2, now()),
        ('b3000000-0000-0000-0000-000000000002', '${usuario1.id}', '${jugador2Id}', 5, 0, now())
    `);

    // 5. Historial de compras para Usuario 1 para calcular precioPromedioAdquisicion
    // Kane: compró 10 tokens a 1.50 = 15.00
    // Musiala: compró 5 tokens a 1.40 = 7.00
    await dataSource.query(`
      INSERT INTO ordenes (id, usuario_id, jugador_id, tipo, tipo_mercado, cantidad, cantidad_restante, precio_unitario, estado, creado_en)
      VALUES
        ('04000000-0000-0000-0000-000000000001', '${usuario1.id}', '${jugador1Id}', 'COMPRA', 'PRIMARIO', 10, 0, 1.50, 'COMPLETADA', now() - interval '2 days'),
        ('04000000-0000-0000-0000-000000000002', '${usuario1.id}', '${jugador2Id}', 'COMPRA', 'PRIMARIO', 5, 0, 1.40, 'COMPLETADA', now() - interval '1 day')
    `);

    await dataSource.query(`
      INSERT INTO transacciones (id, orden_id, jugador_id, comprador_id, vendedor_id, cantidad, precio_unitario, monto_total, tipo_mercado, estrategia_cotizacion, creado_en)
      VALUES
        ('a4000000-0000-0000-0000-000000000001', '04000000-0000-0000-0000-000000000001', '${jugador1Id}', '${usuario1.id}', '${adminUser.id}', 10, 1.50, 15.00, 'PRIMARIO', 'GLOBAL_v1', now() - interval '2 days'),
        ('a4000000-0000-0000-0000-000000000002', '04000000-0000-0000-0000-000000000002', '${jugador2Id}', '${usuario1.id}', '${adminUser.id}', 5, 1.40, 7.00, 'PRIMARIO', 'POSICIONAL_v1', now() - interval '1 day')
    `);
  });

  it('GET /users/:id/portfolio: debe calcular la valoración y precio promedio en < 200 ms', async () => {
    const inicio = Date.now();
    const portfolio = await usersController.obtenerPortfolio(
      usuario1.id,
      { user: { id: usuario1.id } },
    );
    const duracionMs = Date.now() - inicio;

    expect(duracionMs).toBeLessThan(200);
    expect(portfolio).toBeDefined();
    expect(portfolio.usuarioId).toBe(usuario1.id);
    expect(portfolio.saldoBilletera).toBe(800.0);

    // Kane: 10 tokens * 1.80 = 18.00; Musiala: 5 tokens * 1.60 = 8.00 => Total tokens = 26.00
    expect(portfolio.valoracionTotalTokens).toBe(26.0);
    expect(portfolio.patrimonioNetoTotal).toBe(826.0);
    expect(portfolio.posiciones.length).toBe(2);

    const posKane = portfolio.posiciones.find((p) => p.jugadorId === jugador1Id);
    expect(posKane).toBeDefined();
    expect(posKane!.nombreJugador).toBe('Harry Kane');
    expect(posKane!.cantidadTokensDisponibles).toBe(8);
    expect(posKane!.cantidadTokensEnVenta).toBe(2);
    expect(posKane!.precioPromedioAdquisicion).toBe(1.5);
    expect(posKane!.cotizacionActual).toBe(1.8);
    expect(posKane!.valoracionTotalPosicion).toBe(18.0);
  });

  it('GET /users/:id/portfolio: debe permitir la consulta al superusuario ADMIN', async () => {
    const portfolio = await usersController.obtenerPortfolio(
      usuario1.id,
      { user: { id: adminUser.id } },
    );
    expect(portfolio).toBeDefined();
    expect(portfolio.usuarioId).toBe(usuario1.id);
  });

  it('GET /users/:id/portfolio: debe rechazar con ForbiddenException (403) ante consulta de otro usuario no ADMIN', async () => {
    await expect(
      usersController.obtenerPortfolio(usuario1.id, { user: { id: usuario2.id } }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('GET /users/:id/transactions: debe retornar transacciones del usuario con filtros y estrategiaCotizacion', async () => {
    const txs = await usersController.obtenerHistorialTransacciones(
      usuario1.id,
      { tipo: 'COMPRA' },
      { user: { id: usuario1.id } },
    );

    expect(txs.length).toBe(2);
    expect(txs[0].tipoOperacion).toBe('COMPRA');
    expect(txs[0].contraparte).toBe('MERCADO_PRIMARIO');
    expect(txs[0].estrategiaCotizacion).toBe('POSICIONAL_v1');
    expect(txs[1].estrategiaCotizacion).toBe('GLOBAL_v1');
  });

  it('GET /admin/transactions: debe retornar el reporte global de transacciones para ADMIN', async () => {
    const reporte = await adminController.obtenerAuditoriaGlobal({
      tipoMercado: 'PRIMARIO',
    });

    expect(reporte.length).toBe(2);
    expect(reporte[0].nombreJugador).toBeDefined();
    expect(reporte[0].compradorId).toBe(usuario1.id);
    expect(reporte[0].vendedorId).toBe(adminUser.id);
  });

  it('debe cubrir edge cases de filtros y autorizaciones en portfolio e historiales', async () => {
    // Solicitante inexistente
    await expect(
      omsService.obtenerPortfolioUsuario('00000000-0000-0000-0000-000000000000', usuario1.id),
    ).rejects.toThrow();

    await expect(
      omsService.obtenerHistorialTransaccionesUsuario('00000000-0000-0000-0000-000000000000', usuario1.id, {}),
    ).rejects.toThrow();

    // Tercero intentando consultar historial
    await expect(
      omsService.obtenerHistorialTransaccionesUsuario(usuario2.id, usuario1.id, {}),
    ).rejects.toThrow(ForbiddenException);

    // Admin consultando historial de otro usuario
    const txsAdmin = await omsService.obtenerHistorialTransaccionesUsuario(adminUser.id, usuario1.id, {
      tipo: 'VENTA',
      jugadorId: jugador1Id,
      desde: new Date(Date.now() - 3600000).toISOString(),
      hasta: new Date(Date.now() + 3600000).toISOString(),
      limite: 5,
    });
    expect(Array.isArray(txsAdmin)).toBe(true);

    // Auditoria global con filtros exhaustivos
    const auditoriaFiltros = await omsService.obtenerAuditoriaGlobalTransacciones({
      usuarioId: usuario1.id,
      jugadorId: jugador1Id,
      tipoMercado: 'PRIMARIO',
      desde: new Date(Date.now() - 7 * 86400000).toISOString(),
      hasta: new Date(Date.now() + 3600000).toISOString(),
      limite: 10,
    });
    expect(auditoriaFiltros.length).toBeGreaterThanOrEqual(1);

    // Usuario titular inexistente en portfolio
    await expect(
      omsService.obtenerPortfolioUsuario(adminUser.id, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow();

    // Usuario 2 no tiene tokens comprados: debe retornar posiciones vacias (balances.length === 0)
    const portfolioVacio = await omsService.obtenerPortfolioUsuario(usuario2.id, usuario2.id);
    expect(portfolioVacio.posiciones).toEqual([]);
    expect(portfolioVacio.valoracionTotalTokens).toBe(0.0);
    expect(portfolioVacio.patrimonioNetoTotal).toBe(500.0);
  });
});
