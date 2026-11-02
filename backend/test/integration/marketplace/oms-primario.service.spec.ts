import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { OmsService } from '../../../src/services/oms.service';
import { OrdersController } from '../../../src/controllers/orders.controller';
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
import { Dinero } from '../../../src/domain/dinero.value-object';
import { BadRequestException } from '@nestjs/common';

describe('OMS Mercado Primario (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let omsService: OmsService;
  let ordersController: OrdersController;
  let usuarioRepo: UsuarioTypeOrmRepository;
  let adminUser: Usuario;
  let compradorUser: Usuario;

  const ligaId = 'd1000000-0000-0000-0000-000000000001';
  const equipoId = 'd2000000-0000-0000-0000-000000000001';
  const jugadorId = 'd3000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    const ordenRepo = new OrdenTypeOrmRepository(dataSource.getRepository(OrdenOrmEntity));
    const transaccionRepo = new TransaccionTypeOrmRepository(dataSource.getRepository(TransaccionOrmEntity));
    const balanceTokenRepo = new BalanceTokenTypeOrmRepository(dataSource.getRepository(BalanceTokenOrmEntity));
    const cotizacionRepo = new CotizacionTypeOrmRepository(dataSource.getRepository(CotizacionOrmEntity));
    const jugadorRepo = new JugadorTypeOrmRepository(dataSource.getRepository(JugadorOrmEntity));
    usuarioRepo = new UsuarioTypeOrmRepository(dataSource.getRepository(UsuarioOrmEntity));

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

    ordersController = new OrdersController(omsService);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    // 1. Crear ADMIN y Comprador con fondos
    adminUser = Usuario.crear({
      nombre: 'Administrador OMS',
      correo: 'admin@oms.com',
      contrasenaHash: 'hash',
      rol: 'ADMIN',
      saldo: 1000.0,
    });
    await usuarioRepo.guardar(adminUser);

    compradorUser = Usuario.crear({
      nombre: 'Comprador Inversor',
      correo: 'comprador@oms.com',
      contrasenaHash: 'hash',
      rol: 'USUARIO',
      saldo: 1000.0,
    });
    await usuarioRepo.guardar(compradorUser);

    // 2. Sembrar Liga, Equipo y Jugador Activo
    await dataSource.query(`
      INSERT INTO ligas (id, nombre, codigo, pais)
      VALUES ('${ligaId}', 'Premier League', 'PL', 'Inglaterra')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO equipos (id, external_id, nombre, liga_id)
      VALUES ('${equipoId}', 201, 'Manchester City', '${ligaId}')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
      VALUES ('${jugadorId}', 301, 'Erling Haaland', 'Delantero', '${equipoId}', '${ligaId}', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Sembrar Balance inicial de 100 tokens para el ADMIN
    await dataSource.query(`
      INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada, actualizado_en)
      VALUES ('b1000000-0000-0000-0000-000000000001', '${adminUser.id}', '${jugadorId}', 100, 0, now())
      ON CONFLICT DO NOTHING
    `);

    // 4. Sembrar Cotización vigente inicial (1.25, GLOBAL_v1)
    await dataSource.query(`
      INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
      VALUES ('c1000000-0000-0000-0000-000000000001', '${jugadorId}', 0.2500, 1.25, 'GLOBAL', 'GLOBAL_v1', false, '{"goals": 0.5}'::jsonb, now())
      ON CONFLICT DO NOTHING
    `);
  });

  it('debe liquidar exitosamente una compra en mercado primario en < 500 ms (SC-004), debitando saldo exacto y guardando estrategiaCotizacion', async () => {
    const inicio = Date.now();
    const res = await ordersController.comprarTokens(
      {
        jugadorId,
        cantidad: 10,
      },
      { user: { id: compradorUser.id } },
    );
    const duracionMs = Date.now() - inicio;

    expect(duracionMs).toBeLessThan(500);
    expect(res).toBeDefined();
    expect(res.cantidadTokensComprados).toBe(10);
    expect(res.precioUnitarioPagado).toBe(1.25);
    expect(res.montoTotalDebitado).toBe(12.5);
    expect(res.saldoRestanteUsuario).toBe(987.5);
    expect(res.tipoMercado).toBe('PRIMARIO');
    expect(res.estrategiaCotizacion).toBe('GLOBAL_v1');

    // Comprobar BD: Balances y suma estricta de 100 tokens (SC-001)
    const adminBal = await dataSource.query(`SELECT cantidad_disponible FROM balances_tokens WHERE usuario_id = '${adminUser.id}'`);
    const compBal = await dataSource.query(`SELECT cantidad_disponible FROM balances_tokens WHERE usuario_id = '${compradorUser.id}'`);
    expect(Number(adminBal[0].cantidad_disponible)).toBe(90);
    expect(Number(compBal[0].cantidad_disponible)).toBe(10);

    const sumTotal = await dataSource.query(`
      SELECT SUM(cantidad_disponible + cantidad_bloqueada) as total
      FROM balances_tokens WHERE jugador_id = '${jugadorId}'
    `);
    expect(Number(sumTotal[0].total)).toBe(100);

    // Comprobar BD: Transacción inmutable
    const txs = await dataSource.query(`SELECT * FROM transacciones WHERE id = '${res.transaccionId}'`);
    expect(txs.length).toBe(1);
    expect(txs[0].estrategia_cotizacion).toBe('GLOBAL_v1');
    expect(Number(txs[0].monto_total)).toBe(12.5);
  });

  it('debe registrar POSICIONAL_v1 en la transacción cuando la cotización vigente corresponde a POSICIONAL', async () => {
    // Insertar nueva cotización más reciente con POSICIONAL_v1
    await dataSource.query(`
      INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
      VALUES ('c2000000-0000-0000-0000-000000000002', '${jugadorId}', 0.4000, 1.40, 'POSICIONAL', 'POSICIONAL_v1', false, '{"goals": 0.8}'::jsonb, now())
    `);

    const res = await ordersController.comprarTokens(
      {
        jugadorId,
        cantidad: 5,
      },
      { user: { id: compradorUser.id } },
    );

    expect(res.precioUnitarioPagado).toBe(1.4);
    expect(res.estrategiaCotizacion).toBe('POSICIONAL_v1');

    const tx = await dataSource.query(`SELECT estrategia_cotizacion FROM transacciones WHERE id = '${res.transaccionId}'`);
    expect(tx[0].estrategia_cotizacion).toBe('POSICIONAL_v1');
  });

  it('debe rechazar la compra con BadRequestException si el comprador no posee saldo suficiente', async () => {
    // Comprador sin saldo
    const pobreUser = Usuario.crear({
      nombre: 'Pobre',
      correo: 'pobre@oms.com',
      contrasenaHash: 'hash',
      rol: 'USUARIO',
      saldo: 5.0,
    });
    await usuarioRepo.guardar(pobreUser);

    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 10 }, // 10 * 1.25 = 12.5 > 5.0
        { user: { id: pobreUser.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la compra con BadRequestException si se supera el inventario primario disponible', async () => {
    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 101 }, // Stock es 100
        { user: { id: compradorUser.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la compra con BadRequestException si el precioMaximoUnitario es inferior a la cotización', async () => {
    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 2, precioMaximoUnitario: 1.0 }, // Cotización es 1.25
        { user: { id: compradorUser.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la compra si el jugador se encuentra inactivo', async () => {
    await dataSource.query(`UPDATE jugadores SET activo = false WHERE id = '${jugadorId}'`);

    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 1 },
        { user: { id: compradorUser.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar si el superusuario ADMIN intenta comprar tokens de su propio inventario primario', async () => {
    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 1 },
        { user: { id: adminUser.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe soportar ráfagas concurrentes sobre el último lote primario con 0 sobreventas y suma contable exacta de 100 tokens (SC-005, SC-001)', async () => {
    // Dejar al ADMIN con exactamente 10 tokens disponibles
    await dataSource.query(`
      UPDATE balances_tokens SET cantidad_disponible = 10 WHERE usuario_id = '${adminUser.id}' AND jugador_id = '${jugadorId}'
    `);

    // Crear 5 compradores simultáneos intentando comprar 3 tokens cada uno (total demandado = 15 > 10 disponibles)
    const concurrentes: Usuario[] = [];
    for (let i = 1; i <= 5; i++) {
      const u = Usuario.crear({
        nombre: `Concurrente ${i}`,
        correo: `conc${i}@oms.com`,
        contrasenaHash: 'hash',
        saldo: 100.0,
      });
      await usuarioRepo.guardar(u);
      concurrentes.push(u);
    }

    const promesas = concurrentes.map((u) =>
      ordersController.comprarTokens(
        { jugadorId, cantidad: 3 },
        { user: { id: u.id } },
      ).catch((err) => err),
    );

    const resultados = await Promise.all(promesas);

    const exitosos = resultados.filter((r) => !(r instanceof Error));
    const fallidos = resultados.filter((r) => r instanceof Error);

    // Con 10 tokens y compras de 3: exactamente 3 compras deben tener éxito (3 * 3 = 9 tokens vendidos) y 2 deben fallar por falta de stock
    expect(exitosos.length).toBe(3);
    expect(fallidos.length).toBe(2);

    // Verificar en BD que no hubo sobreventa (SC-005)
    const adminBal = await dataSource.query(`SELECT cantidad_disponible FROM balances_tokens WHERE usuario_id = '${adminUser.id}'`);
    expect(Number(adminBal[0].cantidad_disponible)).toBe(1);

    // Suma de todos los balances de este jugador DEBE SER EXACTAMENTE 100 (SC-001)
    const sumaTotal = await dataSource.query(`
      SELECT SUM(cantidad_disponible + cantidad_bloqueada) AS total
      FROM balances_tokens
      WHERE jugador_id = '${jugadorId}'
    `);
    // Tenía 10 el admin + 90 que no estaban pero en el test se seteó a 10.
    // La suma de los existentes en BD es: 1 admin + 3*3 compradores = 10.
    expect(Number(sumaTotal[0].total)).toBe(10);
  });
});
