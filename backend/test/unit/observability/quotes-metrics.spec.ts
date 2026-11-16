import { QuotesService } from '../../../src/services/quotes.service';
import { QuotesSchedulerService } from '../../../src/services/scheduler/quotes-scheduler.service';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';
import { DataSource } from 'typeorm';

describe('Quotes & Pricing Metrics Instrumentation (Unit Tests)', () => {
  let quotesService: QuotesService;
  let mockMetricsService: jest.Mocked<AppMetricsService>;
  let mockDataSource: Partial<DataSource>;
  let mockCotizacionRepo: any;
  let mockJugadorRepo: any;
  let mockEstadisticaRepo: any;
  let mockConfigRepo: any;
  let mockUsuarioRepo: any;
  let mockCacheService: any;
  let mockTokensService: any;

  beforeEach(() => {
    mockMetricsService = {
      recordRecalculation: jest.fn(),
      recordRecalculationDuration: jest.fn(),
      recordPlayersEvaluated: jest.fn(),
      setActiveStrategy: jest.fn(),
    } as any;

    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    mockCotizacionRepo = {
      guardarMuchos: jest.fn().mockResolvedValue(undefined),
    };
    mockJugadorRepo = {
      listarActivos: jest.fn().mockResolvedValue([
        { id: 'j-1', posicion: 'DELANTERO', equipo: { nombre: 'Arsenal' } },
        { id: 'j-2', posicion: 'CENTROCAMPISTA', equipo: { nombre: 'Chelsea' } },
      ]),
    };
    mockEstadisticaRepo = {
      buscarPorJugadores: jest.fn().mockResolvedValue([
        { jugadorId: 'j-1', partidosJugados: 10, goles: 5, asistencias: 2, minutosJugados: 900, rating: 7.5 },
      ]),
    };
    mockConfigRepo = {
      obtenerConfiguracion: jest.fn().mockResolvedValue({
        estrategiaActivaId: 'GLOBAL',
        estrategiaActivaVersion: 'GLOBAL_v1',
        actualizadoEn: new Date(),
        cambiarEstrategia: jest.fn(),
      }),
      guardar: jest.fn().mockResolvedValue(undefined),
    };
    mockUsuarioRepo = {};
    mockCacheService = {
      invalidarRanking: jest.fn().mockResolvedValue(undefined),
    };
    mockTokensService = {
      emitirFaltantes: jest.fn().mockResolvedValue(undefined),
    };

    quotesService = new QuotesService(
      mockDataSource as DataSource,
      mockCotizacionRepo,
      mockJugadorRepo,
      mockEstadisticaRepo,
      mockConfigRepo,
      mockUsuarioRepo,
      mockCacheService,
      mockTokensService,
      mockMetricsService,
    );
  });

  it('debe registrar el cambio de estrategia activa en las métricas', async () => {
    await quotesService.cambiarEstrategiaActiva('POSICIONAL', 'admin-id');

    expect(mockMetricsService.setActiveStrategy).toHaveBeenCalledWith('POSICIONAL_v1');
  });

  it('debe registrar jugadores evaluados, recálculo y duración al ejecutar recálculo masivo', async () => {
    const res = await quotesService.recalcularCotizacionesActivas();

    expect(res.procesados).toBe(2);
    expect(res.sinEstadisticas).toBe(1); // j-2 no tiene estadísticas
    expect(res.fallidos).toBe(0);

    expect(mockMetricsService.recordPlayersEvaluated).toHaveBeenCalledWith('procesados', 1);
    expect(mockMetricsService.recordPlayersEvaluated).toHaveBeenCalledWith('sin_estadisticas', 1);
    expect(mockMetricsService.recordPlayersEvaluated).toHaveBeenCalledWith('fallidos', 0);
    expect(mockMetricsService.recordRecalculation).toHaveBeenCalledWith('GLOBAL_v1', 'exito');
    expect(mockMetricsService.recordRecalculationDuration).toHaveBeenCalledWith('GLOBAL_v1', expect.any(Number));
  });

  it('debe registrar métricas en QuotesSchedulerService', async () => {
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([{ lock_acquired: true }])
        .mockResolvedValueOnce(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    const mockSchedulerDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as any;

    const scheduler = new QuotesSchedulerService(
      mockSchedulerDataSource,
      quotesService,
      mockMetricsService,
    );

    const result = await scheduler.ejecutarRecalculoSemanal();
    expect(result.ejecutado).toBe(true);
    expect(mockMetricsService.recordRecalculationDuration).toHaveBeenCalledWith('GLOBAL_v1', expect.any(Number));
  });
});
