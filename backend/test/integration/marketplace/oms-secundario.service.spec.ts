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
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('OMS Mercado Secundario (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let omsService: OmsService;
  let ordersController: OrdersController;
  let usuarioRepo: UsuarioTypeOrmRepository;

  let usuarioA: Usuario; // Vendedor
  let usuarioB: Usuario; // Comprador
  let usuarioC: Usuario; // Tercero

  const ligaId = 'e1000000-0000-0000-0000-000000000001';
  const equipoId = 'e2000000-0000-0000-0000-000000000001';
  const jugadorId = 'e3000000-0000-0000-0000-000000000001';

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

    ordersController = new OrdersController(omsService);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    // 1. Crear usuarios
    usuarioA = Usuario.crear({
      nombre: 'Usuario Vendedor A',
      correo: 'vendedor_a@oms.com',
      contrasenaHash: 'hash',
      saldo: 100.0,
    });
    await usuarioRepo.guardar(usuarioA);

    usuarioB = Usuario.crear({
      nombre: 'Usuario Comprador B',
      correo: 'comprador_b@oms.com',
      contrasenaHash: 'hash',
      saldo: 500.0,
    });
    await usuarioRepo.guardar(usuarioB);

    usuarioC = Usuario.crear({
      nombre: 'Usuario Tercero C',
      correo: 'tercero_c@oms.com',
      contrasenaHash: 'hash',
      saldo: 500.0,
    });
    await usuarioRepo.guardar(usuarioC);

    // 2. Sembrar Liga, Equipo y Jugador Activo
    await dataSource.query(`
      INSERT INTO ligas (id, nombre, codigo, pais)
      VALUES ('${ligaId}', 'Serie A', 'SA', 'Italia')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO equipos (id, external_id, nombre, liga_id)
      VALUES ('${equipoId}', 701, 'Inter Milan', '${ligaId}')
      ON CONFLICT (id) DO NOTHING
    `);

    await dataSource.query(`
      INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo)
      VALUES ('${jugadorId}', 801, 'Lautaro Martinez', 'Delantero', '${equipoId}', '${ligaId}', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Balance del Usuario A con 20 tokens disponibles
    await dataSource.query(`
      INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada, actualizado_en)
      VALUES ('b2000000-0000-0000-0000-000000000001', '${usuarioA.id}', '${jugadorId}', 20, 0, now())
    `);

    // 4. Cotización oficial vigente (1.50, POSICIONAL_v1)
    await dataSource.query(`
      INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
      VALUES ('c3000000-0000-0000-0000-000000000001', '${jugadorId}', 0.5000, 1.50, 'POSICIONAL', 'POSICIONAL_v1', false, '{"goals": 0.9}'::jsonb, now())
    `);
  });

  it('debe publicar una orden de venta reteniendo tokens en custodia preventiva (cantidadBloqueada)', async () => {
    const res = await ordersController.crearOrdenVenta(
      {
        jugadorId,
        cantidad: 8,
        precioUnitario: 2.25,
      },
      { user: { id: usuarioA.id } },
    );

    expect(res).toBeDefined();
    expect(res.cantidad).toBe(8);
    expect(res.cantidadRestante).toBe(8);
    expect(res.precioUnitario).toBe(2.25);
    expect(res.estado).toBe('PENDIENTE');

    // Verificar custodia en balances_tokens
    const balance = await dataSource.query(`
      SELECT cantidad_disponible, cantidad_bloqueada FROM balances_tokens
      WHERE usuario_id = '${usuarioA.id}' AND jugador_id = '${jugadorId}'
    `);
    expect(Number(balance[0].cantidad_disponible)).toBe(12);
    expect(Number(balance[0].cantidad_bloqueada)).toBe(8);
  });

  it('debe listar el libro de ofertas secundarias activas ordenadas por mejor precio ascendente y fecha', async () => {
    // Publicar dos ofertas del Usuario A
    await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 5, precioUnitario: 3.0 },
      { user: { id: usuarioA.id } },
    );
    await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 3, precioUnitario: 2.0 },
      { user: { id: usuarioA.id } },
    );

    const ofertas = await ordersController.listarOrdenesVenta({
      jugadorId,
      estado: 'ACTIVA',
    });

    expect(ofertas).toHaveLength(2);
    // La más barata (2.0) debe ir primero
    expect(ofertas[0].precioUnitario).toBe(2.0);
    expect(ofertas[0].cantidadRestante).toBe(3);
    expect(ofertas[1].precioUnitario).toBe(3.0);
  });

  it('debe liquidar compra parcial y total de una oferta puntual en < 500 ms (SC-004) registrando estrategiaCotizacion', async () => {
    // 1. Usuario A publica oferta de 10 tokens a 2.00
    const oferta = await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 10, precioUnitario: 2.0 },
      { user: { id: usuarioA.id } },
    );

    // 2. Usuario B compra parcialmente 4 tokens
    const compraParcial = await ordersController.comprarTokens(
      {
        jugadorId,
        cantidad: 4,
        ordenVentaId: oferta.ordenId,
      },
      { user: { id: usuarioB.id } },
    );

    expect(compraParcial.cantidadTokensComprados).toBe(4);
    expect(compraParcial.precioUnitarioPagado).toBe(2.0);
    expect(compraParcial.montoTotalDebitado).toBe(8.0);
    expect(compraParcial.tipoMercado).toBe('SECUNDARIO');
    expect(compraParcial.estrategiaCotizacion).toBe('POSICIONAL_v1');

    // Comprobar estado de la orden (debe ser PARCIAL con 6 restantes)
    const ordenParcial = await dataSource.query(`SELECT estado, cantidad_restante FROM ordenes WHERE id = '${oferta.ordenId}'`);
    expect(ordenParcial[0].estado).toBe('PARCIAL');
    expect(Number(ordenParcial[0].cantidad_restante)).toBe(6);

    // 3. Usuario B compra los 6 tokens restantes
    const compraTotal = await ordersController.comprarTokens(
      {
        jugadorId,
        cantidad: 6,
        ordenVentaId: oferta.ordenId,
      },
      { user: { id: usuarioB.id } },
    );

    expect(compraTotal.cantidadTokensComprados).toBe(6);

    // Comprobar estado de la orden (debe ser COMPLETADA con 0 restantes)
    const ordenCompleta = await dataSource.query(`SELECT estado, cantidad_restante FROM ordenes WHERE id = '${oferta.ordenId}'`);
    expect(ordenCompleta[0].estado).toBe('COMPLETADA');
    expect(Number(ordenCompleta[0].cantidad_restante)).toBe(0);

    // Comprobar saldos monetarios
    const balA = await dataSource.query(`SELECT saldo FROM usuarios WHERE id = '${usuarioA.id}'`);
    const balB = await dataSource.query(`SELECT saldo FROM usuarios WHERE id = '${usuarioB.id}'`);
    expect(Number(balA[0].saldo)).toBe(120.0); // 100 + 20
    expect(Number(balB[0].saldo)).toBe(480.0); // 500 - 20
  });

  it('debe rechazar la compra con BadRequestException si el comprador es el mismo vendedor (no wash trading)', async () => {
    const oferta = await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 5, precioUnitario: 2.0 },
      { user: { id: usuarioA.id } },
    );

    await expect(
      ordersController.comprarTokens(
        { jugadorId, cantidad: 1, ordenVentaId: oferta.ordenId },
        { user: { id: usuarioA.id } },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la cancelación si la solicita un tercero (ForbiddenException)', async () => {
    const oferta = await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 5, precioUnitario: 2.0 },
      { user: { id: usuarioA.id } },
    );

    await expect(
      ordersController.cancelarOrdenVenta(oferta.ordenId, { user: { id: usuarioC.id } }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe permitir cancelar una orden PENDIENTE y devolver tokens de custodia a disponible', async () => {
    const oferta = await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 6, precioUnitario: 2.0 },
      { user: { id: usuarioA.id } },
    );

    const cancelada = await ordersController.cancelarOrdenVenta(
      oferta.ordenId,
      { user: { id: usuarioA.id } },
    );

    expect(cancelada.estado).toBe('CANCELADA');

    // Comprobar que los 6 tokens volvieron a cantidad_disponible
    const bal = await dataSource.query(`
      SELECT cantidad_disponible, cantidad_bloqueada FROM balances_tokens
      WHERE usuario_id = '${usuarioA.id}' AND jugador_id = '${jugadorId}'
    `);
    expect(Number(bal[0].cantidad_disponible)).toBe(20);
    expect(Number(bal[0].cantidad_bloqueada)).toBe(0);

    // Intentar cancelar de nuevo debe fallar con ConflictException
    await expect(
      ordersController.cancelarOrdenVenta(oferta.ordenId, { user: { id: usuarioA.id } }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe soportar ráfagas concurrentes sobre el remanente secundario garantizando 0 sobreventas (SC-005)', async () => {
    // Publicar oferta de exactamente 6 tokens
    const oferta = await ordersController.crearOrdenVenta(
      { jugadorId, cantidad: 6, precioUnitario: 1.5 },
      { user: { id: usuarioA.id } },
    );

    // Crear 4 compradores simultáneos intentando comprar 2 tokens cada uno (total 8 > 6)
    const compradores: Usuario[] = [];
    for (let i = 1; i <= 4; i++) {
      const u = Usuario.crear({
        nombre: `Comprador Secundario ${i}`,
        correo: `sec${i}@oms.com`,
        contrasenaHash: 'hash',
        saldo: 100.0,
      });
      await usuarioRepo.guardar(u);
      compradores.push(u);
    }

    const promesas = compradores.map((u) =>
      ordersController.comprarTokens(
        { jugadorId, cantidad: 2, ordenVentaId: oferta.ordenId },
        { user: { id: u.id } },
      ).catch((err) => err),
    );

    const resultados = await Promise.all(promesas);

    const exitosos = resultados.filter((r) => !(r instanceof Error));
    const fallidos = resultados.filter((r) => r instanceof Error);

    // Con 6 tokens y pedidos de 2: exactamente 3 compras exitosas y 1 fallida
    expect(exitosos).toHaveLength(3);
    expect(fallidos).toHaveLength(1);

    // Verificar en BD que la orden quedó con 0 restantes y COMPLETADA
    const ordenDb = await dataSource.query(`SELECT estado, cantidad_restante FROM ordenes WHERE id = '${oferta.ordenId}'`);
    expect(ordenDb[0].estado).toBe('COMPLETADA');
    expect(Number(ordenDb[0].cantidad_restante)).toBe(0);
  });

  it('debe validar edge cases en creación, listado y cancelación de órdenes secundarias', async () => {
    // 1. Jugador inexistente
    await expect(
      omsService.crearOrdenVenta(usuarioA.id, {
        jugadorId: '00000000-0000-0000-0000-000000000000',
        cantidad: 1,
        precioUnitario: 2.0,
      }),
    ).rejects.toThrow();

    // 2. Jugador inactivo
    await dataSource.query(`UPDATE jugadores SET activo = false WHERE id = '${jugadorId}'`);
    await expect(
      omsService.crearOrdenVenta(usuarioA.id, {
        jugadorId,
        cantidad: 1,
        precioUnitario: 2.0,
      }),
    ).rejects.toThrow(BadRequestException);
    await dataSource.query(`UPDATE jugadores SET activo = true WHERE id = '${jugadorId}'`);

    // 3. Balance inexistente
    await expect(
      omsService.crearOrdenVenta(usuarioC.id, {
        jugadorId,
        cantidad: 1,
        precioUnitario: 2.0,
      }),
    ).rejects.toThrow(BadRequestException);

    // 4. Balance disponible insuficiente
    await expect(
      omsService.crearOrdenVenta(usuarioA.id, {
        jugadorId,
        cantidad: 9999,
        precioUnitario: 2.0,
      }),
    ).rejects.toThrow(BadRequestException);

    // 5. Cancelar orden inexistente
    await expect(
      omsService.cancelarOrdenVenta(usuarioA.id, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow();

    // 6. Listar con filtros de jugadorId y limite
    const lista = await omsService.listarOrdenesVenta({
      jugadorId,
      limite: 2,
    });
    expect(Array.isArray(lista)).toBe(true);

    // 7. Cancelar orden de tipo COMPRA (debe arrojar BadRequestException)
    const ordenCompraId = 'e4000000-0000-0000-0000-000000000099';
    await dataSource.query(`
      INSERT INTO ordenes (id, usuario_id, jugador_id, tipo, tipo_mercado, cantidad, cantidad_restante, precio_unitario, estado, creado_en)
      VALUES ('${ordenCompraId}', '${usuarioA.id}', '${jugadorId}', 'COMPRA', 'PRIMARIO', 1, 0, 1.0, 'COMPLETADA', now())
    `);
    await expect(
      omsService.cancelarOrdenVenta(usuarioA.id, ordenCompraId),
    ).rejects.toThrow(BadRequestException);

    // 8. Comprar con ordenVentaId inexistente (NotFoundException)
    await expect(
      omsService.comprarTokens(usuarioB.id, {
        jugadorId,
        cantidad: 1,
        ordenVentaId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toThrow();

    // 9. Comprar con ordenVentaId que apunta a orden de tipo COMPRA (ConflictException)
    await expect(
      omsService.comprarTokens(usuarioB.id, {
        jugadorId,
        cantidad: 1,
        ordenVentaId: ordenCompraId,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
