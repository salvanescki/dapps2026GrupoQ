import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { WhoScoredPlaywrightService, RawWhoScoredPlayerStats } from '../../../src/scraping/services/whoscored-playwright.service';
import { NormalizadorJugadorService } from '../../../src/scraping/services/normalizador-jugador.service';
import { IEstadisticaJugadorRepository } from '../../../src/scraping/domain/estadistica-jugador.repository.interface';
import { IEjecucionScrapingRepository } from '../../../src/scraping/domain/ejecucion-scraping.repository.interface';
import { IJugadorRepository } from '../../../src/domain/jugador.repository.interface';
import { Jugador } from '../../../src/domain/jugador.entity';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { EjecucionScraping } from '../../../src/scraping/domain/ejecucion-scraping.entity';

describe('ScrapingService (Unit Tests)', () => {
  let service: ScrapingService;
  let mockPlaywrightService: Partial<WhoScoredPlaywrightService>;
  let normalizadorService: NormalizadorJugadorService;
  let mockEstadisticaRepo: Partial<IEstadisticaJugadorRepository>;
  let mockEjecucionRepo: Partial<IEjecucionScrapingRepository>;
  let mockJugadorRepo: Partial<IJugadorRepository>;

  const jugadorLocalMock = Jugador.crear({
    id: '11111111-1111-4111-8111-111111111111',
    externalId: 100,
    nombre: 'Mohamed Salah',
    posicionOriginal: 'Right Winger',
    equipoId: '22222222-2222-4222-8222-222222222222',
    ligaId: '33333333-3333-4333-8333-333333333333',
    activo: true,
  });

  const porteroLocalMock = Jugador.crear({
    id: '44444444-4444-4444-8444-444444444444',
    externalId: 101,
    nombre: 'Alisson Becker',
    posicionOriginal: 'Goalkeeper',
    equipoId: '22222222-2222-4222-8222-222222222222',
    ligaId: '33333333-3333-4333-8333-333333333333',
    activo: true,
  });

  beforeEach(() => {
    normalizadorService = new NormalizadorJugadorService();

    mockPlaywrightService = {
      extraerEstadisticasLiga: jest.fn(),
    };

    mockEstadisticaRepo = {
      guardar: jest.fn().mockImplementation(async (e) => e),
      guardarMuchos: jest.fn().mockResolvedValue(undefined),
      buscarPorJugadorYTemporada: jest.fn(),
      buscarPorJugador: jest.fn(),
    };

    mockEjecucionRepo = {
      guardar: jest.fn().mockImplementation(async (e) => e),
      buscarPorId: jest.fn(),
      buscarUltima: jest.fn(),
      buscarEnProgreso: jest.fn().mockResolvedValue(null),
      listarPaginado: jest.fn(),
    };

    mockJugadorRepo = {
      buscarPorId: jest.fn(),
      buscarConFiltros: jest.fn().mockResolvedValue({
        items: [jugadorLocalMock, porteroLocalMock],
        total: 2,
        pagina: 1,
        limite: 100,
      }),
    };

    service = new ScrapingService(
      mockPlaywrightService as WhoScoredPlaywrightService,
      normalizadorService,
      mockEstadisticaRepo as IEstadisticaJugadorRepository,
      mockEjecucionRepo as IEjecucionScrapingRepository,
      mockJugadorRepo as IJugadorRepository,
    );

    (service as any).config = {
      delayMinMs: 0,
      delayMaxMs: 0,
      seasonLabel: '2025/2026',
      leagueConfigs: [
        { liga: 'PL', regionId: 252, tournamentId: 2, seasonId: 12345, stageId: 22345 },
      ],
    };
  });

  it('debe ejecutar el pipeline de scraping procesando y persistiendo estadísticas de jugadores coincidentes', async () => {
    const rawStatsMap = new Map<string, RawWhoScoredPlayerStats>();
    rawStatsMap.set('1234', {
      whoScoredId: '1234',
      nombre: 'M. Salah',
      equipoNombre: 'Liverpool',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 8,
      asistencias: 5,
      rating: 7.85,
      precisionPase: 84.0,
      tarjetasAmarillas: 1,
      tarjetasRojas: 0,
    });

    (mockPlaywrightService.extraerEstadisticasLiga as jest.Mock).mockResolvedValue(rawStatsMap);

    const ejecucion = await service.ejecutarPipeline();

    expect(ejecucion).toBeDefined();
    expect(ejecucion.estado).toBe('exitoso');
    expect(ejecucion.jugadoresProcesados).toBe(1);
    expect(ejecucion.errores).toBe(0);
    expect(mockEstadisticaRepo.guardarMuchos).toHaveBeenCalled();
  });

  it('debe registrar error y continuar cuando un jugador de WhoScored no coincide con la base local', async () => {
    const rawStatsMap = new Map<string, RawWhoScoredPlayerStats>();
    rawStatsMap.set('9999', {
      whoScoredId: '9999',
      nombre: 'Jugador Desconocido',
      equipoNombre: 'Equipo Desconocido',
      partidosJugados: 5,
      minutosJugados: 400,
      goles: 1,
      asistencias: 0,
    });

    (mockPlaywrightService.extraerEstadisticasLiga as jest.Mock).mockResolvedValue(rawStatsMap);

    const ejecucion = await service.ejecutarPipeline();

    expect(ejecucion.estado).toBe('exitoso');
    expect(ejecucion.jugadoresProcesados).toBe(0);
    expect(ejecucion.errores).toBe(1);
    expect(ejecucion.detalle).toHaveLength(1);
    expect(ejecucion.detalle[0].jugadorNombre).toBe('Jugador Desconocido');
  });

  it('debe formatear estadísticas diferenciando portero vs jugador de campo al consultar por ID', async () => {
    const statsMock = EstadisticaJugador.crear({
      jugadorId: jugadorLocalMock.id,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 8,
      asistencias: 5,
      rating: 7.85,
      precisionPase: 84.0,
      tarjetasAmarillas: 1,
      tarjetasRojas: 0,
      tirosPorPartido: 3.5,
      xgPorPartido: 0.65,
    });

    (mockJugadorRepo.buscarPorId as jest.Mock).mockResolvedValue(jugadorLocalMock);
    (mockEstadisticaRepo.buscarPorJugadorYTemporada as jest.Mock).mockResolvedValue(statsMock);

    const resultado = await service.obtenerEstadisticasJugador(jugadorLocalMock.id, '2025/2026');

    expect(resultado.rol).toBe('jugador_campo');
    expect(resultado.estadisticas.goles).toBe(8);
    expect(resultado.estadisticas.tirosPorPartido).toBe(3.5);
    expect(resultado.estadisticas.atajadas).toBeUndefined();
  });

  it('debe retornar estadísticas con rol portero y métricas de arquero para porteros', async () => {
    const statsMock = EstadisticaJugador.crear({
      jugadorId: porteroLocalMock.id,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 0,
      asistencias: 0,
      rating: 7.15,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      atajadas: 4.2,
      golesRecibidos: 8,
      porcentajeAtajadas: 81.5,
    });

    (mockJugadorRepo.buscarPorId as jest.Mock).mockResolvedValue(porteroLocalMock);
    (mockEstadisticaRepo.buscarPorJugadorYTemporada as jest.Mock).mockResolvedValue(statsMock);

    const resultado = await service.obtenerEstadisticasJugador(porteroLocalMock.id, '2025/2026');

    expect(resultado.rol).toBe('portero');
    expect(resultado.estadisticas.atajadas).toBe(4.2);
    expect(resultado.estadisticas.golesRecibidos).toBe(8);
    expect(resultado.estadisticas.porcentajeAtajadas).toBe(81.5);
  });

  it('debe recuperar ejecuciones huérfanas en onModuleInit marcándolas como fallidas', async () => {
    const ejecucionHuerfana = EjecucionScraping.reconstituir({
      id: 'huerfana-1',
      inicio: new Date(Date.now() - 3600000), // hace 1 hora
      estado: 'en_progreso',
    });

    (mockEjecucionRepo.buscarEnProgreso as jest.Mock).mockResolvedValue(ejecucionHuerfana);

    await service.onModuleInit();

    expect(mockEjecucionRepo.guardar).toHaveBeenCalled();
    expect(ejecucionHuerfana.estado).toBe('fallido');
    expect(ejecucionHuerfana.fin).toBeDefined();
  });

  it('debe recuperar ejecuciones vencidas por timeout en ejecutarPipeline permitiendo nueva corrida', async () => {
    const ejecucionVencida = EjecucionScraping.reconstituir({
      id: 'vencida-1',
      inicio: new Date(Date.now() - 10000000), // muy vieja (> 15 min)
      estado: 'en_progreso',
    });

    (mockEjecucionRepo.buscarEnProgreso as jest.Mock).mockResolvedValue(ejecucionVencida);
    (mockJugadorRepo.buscarConFiltros as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    (mockPlaywrightService.extraerEstadisticasLiga as jest.Mock).mockResolvedValue(new Map());

    const nuevaEjecucion = await service.ejecutarPipeline('manual');

    expect(ejecucionVencida.estado).toBe('fallido');
    expect(nuevaEjecucion).toBeDefined();
    expect(nuevaEjecucion.id).not.toBe('vencida-1');
  });
});

