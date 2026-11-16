import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Scraping Metrics Instrumentation (Unit Tests)', () => {
  let scrapingService: ScrapingService;
  let mockMetricsService: jest.Mocked<AppMetricsService>;
  let mockPlaywrightService: any;
  let mockNormalizador: any;
  let mockEstadisticaRepo: any;
  let mockEjecucionRepo: any;
  let mockJugadorRepo: any;

  beforeEach(() => {
    mockMetricsService = {
      recordScrapingExecution: jest.fn(),
      recordScrapingDuration: jest.fn(),
      setPlayerMatchRate: jest.fn(),
      recordScrapingIncident: jest.fn(),
    } as any;

    mockPlaywrightService = {
      extraerEstadisticasLiga: jest.fn().mockResolvedValue(new Map()),
    };
    mockNormalizador = {
      normalizarTexto: jest.fn((str) => str?.toLowerCase().trim() || ''),
      coincidenClubes: jest.fn().mockReturnValue(true),
    };
    mockEstadisticaRepo = {
      guardarMuchos: jest.fn().mockResolvedValue(undefined),
    };
    mockEjecucionRepo = {
      buscarEnProgreso: jest.fn().mockResolvedValue(null),
      guardar: jest.fn().mockResolvedValue(undefined),
    };
    mockJugadorRepo = {
      buscarConFiltros: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      guardarMuchos: jest.fn().mockResolvedValue(undefined),
    };

    scrapingService = new ScrapingService(
      mockPlaywrightService,
      mockNormalizador,
      mockEstadisticaRepo,
      mockEjecucionRepo,
      mockJugadorRepo,
      undefined,
      mockMetricsService,
    );
  });

  it('debe registrar métrica recuperada_atasco al detectar una ejecución huérfana en onModuleInit', async () => {
    const mockHuerfana = {
      id: 'huerfana-1',
      finalizarFallido: jest.fn(),
    };
    mockEjecucionRepo.buscarEnProgreso.mockResolvedValueOnce(mockHuerfana);

    await scrapingService.onModuleInit();

    expect(mockMetricsService.recordScrapingExecution).toHaveBeenCalledWith('recuperada_atasco');
  });

  it('debe registrar métricas de ejecución exitosa, duración, match rate e incidentes al ejecutar pipeline', async () => {
    (scrapingService as any).config.minJugadoresPorLiga = 0;
    (scrapingService as any).config.leagueConfigs = [
      { liga: 'PL', codigoLiga: 'PL', nombreTorneo: 'Premier League' },
    ];

    const rawMap = new Map();
    rawMap.set('1', { whoScoredId: '1', nombre: 'Bukayo Saka', equipoNombre: 'Arsenal', minutosJugados: 90 });
    mockPlaywrightService.extraerEstadisticasLiga.mockResolvedValueOnce(rawMap);

    const mockJugador = {
      id: 'j-1',
      nombre: 'Bukayo Saka',
      equipo: { nombre: 'Arsenal' },
      whoScoredPlayerId: null,
      asociarWhoScored: jest.fn(),
    };
    mockJugadorRepo.buscarConFiltros.mockResolvedValueOnce({ items: [mockJugador], total: 1 });

    const ejecucion = await scrapingService.ejecutarPipeline('manual');

    expect(ejecucion).toBeDefined();
    expect(mockMetricsService.recordScrapingExecution).toHaveBeenCalledWith('exitoso');
    expect(mockMetricsService.recordScrapingDuration).toHaveBeenCalledWith('PL', expect.any(Number));
    expect(mockMetricsService.setPlayerMatchRate).toHaveBeenCalledWith('PL', expect.any(Number));
  });

  it('debe registrar ejecución fallida si ocurre un error crítico en el pipeline', async () => {
    (scrapingService as any).config.leagueConfigs = [
      { liga: 'PL', codigoLiga: 'PL', nombreTorneo: 'Premier League' },
    ];
    mockPlaywrightService.extraerEstadisticasLiga.mockRejectedValueOnce(new Error('Browser crashed'));

    await expect(scrapingService.ejecutarPipeline('manual')).rejects.toThrow('Browser crashed');
    expect(mockMetricsService.recordScrapingExecution).toHaveBeenCalledWith('fallido');
  });
});
