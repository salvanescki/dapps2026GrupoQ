import { OmsService } from '../../../src/services/oms.service';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';
import { DataSource, EntityManager } from 'typeorm';
import { Dinero } from '../../../src/domain/dinero.value-object';
import { BadRequestException } from '@nestjs/common';

describe('OmsService - Trading Metrics Instrumentation (Unit Tests)', () => {
  let omsService: OmsService;
  let mockMetricsService: jest.Mocked<AppMetricsService>;
  let mockDataSource: Partial<DataSource>;
  let mockEntityManager: Partial<EntityManager>;
  let mockOrdenRepo: any;
  let mockTransaccionRepo: any;
  let mockBalanceTokenRepo: any;
  let mockCotizacionRepo: any;
  let mockJugadorRepo: any;
  let mockUsuarioRepo: any;
  let mockCacheService: any;

  beforeEach(() => {
    mockMetricsService = {
      recordOrderCreated: jest.fn(),
      recordTransaction: jest.fn(),
      recordVolumeCents: jest.fn(),
      recordSettlementDuration: jest.fn(),
      recordSlippageRejection: jest.fn(),
      setActiveSellOrders: jest.fn(),
      updateActiveSellOrders: jest.fn(),
    } as any;

    mockOrdenRepo = { guardar: jest.fn() };
    mockTransaccionRepo = { guardar: jest.fn() };
    mockBalanceTokenRepo = { guardar: jest.fn() };
    mockCotizacionRepo = {};
    mockJugadorRepo = {};
    mockUsuarioRepo = {};
    mockCacheService = { invalidarRanking: jest.fn() };

    mockEntityManager = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
    };

    omsService = new OmsService(
      mockDataSource as DataSource,
      mockOrdenRepo,
      mockTransaccionRepo,
      mockBalanceTokenRepo,
      mockCotizacionRepo,
      mockJugadorRepo,
      mockUsuarioRepo,
      mockCacheService,
      mockMetricsService,
    );
  });

  it('debe registrar métricas al ejecutar una compra primaria exitosa', async () => {
    const jugadorId = 'jugador-1';
    const compradorId = 'comprador-1';
    const adminId = 'admin-uuid';

    (mockEntityManager.findOne as jest.Mock).mockImplementation((entity, opts) => {
      if (entity.name === 'JugadorOrmEntity') {
        return Promise.resolve({ id: jugadorId, activo: true });
      }
      if (entity.name === 'CotizacionOrmEntity') {
        return Promise.resolve({ jugadorId, valor: '10.00', estrategiaVersion: 'GLOBAL_v1' });
      }
      if (entity.name === 'UsuarioOrmEntity') {
        return Promise.resolve({ id: adminId, rol: 'ADMIN' });
      }
      return Promise.resolve(null);
    });

    const mockQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(() => {
        return Promise.resolve([
          { id: adminId, nombre: 'Admin User', correo: 'admin@test.com', contrasenaHash: 'hash', saldo: 0, rol: 'ADMIN', activo: true, version: 1 },
          { id: compradorId, nombre: 'Comprador User', correo: 'comp@test.com', contrasenaHash: 'hash', saldo: 5000, rol: 'USUARIO', activo: true, version: 1 },
        ]);
      }),
    };

    const mockBalanceQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(() => {
        return Promise.resolve([
          { id: 'bal-admin', usuarioId: adminId, jugadorId, cantidadDisponible: 50, cantidadBloqueada: 0, version: 1 },
          { id: 'bal-comp', usuarioId: compradorId, jugadorId, cantidadDisponible: 0, cantidadBloqueada: 0, version: 1 },
        ]);
      }),
    };

    (mockEntityManager.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(mockQueryBuilder)
      .mockReturnValueOnce(mockBalanceQueryBuilder);

    const result = await omsService.comprarTokens(compradorId, {
      jugadorId,
      cantidad: 2,
    });

    expect(result).toBeDefined();
    expect(mockMetricsService.recordOrderCreated).toHaveBeenCalledWith('compra', 'primario', 'completada');
    expect(mockMetricsService.recordTransaction).toHaveBeenCalledWith('primario', 'GLOBAL_v1');
    expect(mockMetricsService.recordVolumeCents).toHaveBeenCalledWith('primario', 2000);
    expect(mockMetricsService.recordSettlementDuration).toHaveBeenCalledWith('primario', expect.any(Number));
  });

  it('debe registrar rechazo de slippage si el precio supera el precioMaximoUnitario', async () => {
    const jugadorId = 'jugador-1';
    const compradorId = 'comprador-1';

    (mockEntityManager.findOne as jest.Mock).mockImplementation((entity, opts) => {
      if (entity.name === 'JugadorOrmEntity') {
        return Promise.resolve({ id: jugadorId, activo: true });
      }
      if (entity.name === 'CotizacionOrmEntity') {
        return Promise.resolve({ jugadorId, valor: '15.00', estrategiaVersion: 'GLOBAL_v1' });
      }
      return Promise.resolve(null);
    });

    await expect(
      omsService.comprarTokens(compradorId, {
        jugadorId,
        cantidad: 1,
        precioMaximoUnitario: 10.0,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockMetricsService.recordSlippageRejection).toHaveBeenCalledWith('primario');
    expect(mockMetricsService.recordOrderCreated).toHaveBeenCalledWith('compra', 'primario', 'rechazada');
  });

  it('debe registrar métricas al crear y cancelar una orden de venta secundaria', async () => {
    const vendedorId = 'vendedor-1';
    const jugadorId = 'jugador-1';
    const ordenId = 'orden-venta-1';

    // Mock crearOrdenVenta
    (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce({ id: jugadorId, activo: true });
    (mockEntityManager.createQueryBuilder as jest.Mock).mockReturnValueOnce({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'bal-1',
        usuarioId: vendedorId,
        jugadorId,
        cantidadDisponible: 10,
        cantidadBloqueada: 0,
        version: 1,
      }),
    });

    await omsService.crearOrdenVenta(vendedorId, {
      jugadorId,
      cantidad: 5,
      precioUnitario: 12.5,
    });

    expect(mockMetricsService.recordOrderCreated).toHaveBeenCalledWith('venta', 'secundario', 'pendiente');
    expect(mockMetricsService.updateActiveSellOrders).toHaveBeenCalledWith(1);

    // Mock cancelarOrdenVenta
    (mockEntityManager.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: ordenId,
          usuarioId: vendedorId,
          jugadorId,
          tipo: 'VENTA',
          tipoMercado: 'SECUNDARIO',
          estado: 'PENDIENTE',
          cantidad: 5,
          cantidadRestante: 5,
          precioUnitario: '12.50',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }),
      })
      .mockReturnValueOnce({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'bal-1',
          usuarioId: vendedorId,
          jugadorId,
          cantidadDisponible: 5,
          cantidadBloqueada: 5,
          version: 1,
        }),
      });

    await omsService.cancelarOrdenVenta(vendedorId, ordenId);

    expect(mockMetricsService.recordOrderCreated).toHaveBeenCalledWith('venta', 'secundario', 'cancelada');
    expect(mockMetricsService.updateActiveSellOrders).toHaveBeenCalledWith(-1);
  });
});
