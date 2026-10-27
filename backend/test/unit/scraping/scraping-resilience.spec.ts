import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { WhoScoredPlaywrightService, RawWhoScoredPlayerStats } from '../../../src/scraping/services/whoscored-playwright.service';
import { NormalizadorJugadorService } from '../../../src/scraping/services/normalizador-jugador.service';
import { IEstadisticaJugadorRepository } from '../../../src/scraping/domain/estadistica-jugador.repository.interface';
import { IEjecucionScrapingRepository } from '../../../src/scraping/domain/ejecucion-scraping.repository.interface';
import { IJugadorRepository } from '../../../src/domain/jugador.repository.interface';
import { Jugador } from '../../../src/domain/jugador.entity';

describe('Scraping Resilience & Error Isolation (FR-008, SC-003)', () => {
  let service: ScrapingService;
  let mockPlaywrightService: Partial<WhoScoredPlaywrightService>;
  let normalizadorService: NormalizadorJugadorService;
  let mockEstadisticaRepo: Partial<IEstadisticaJugadorRepository>;
  let mockEjecucionRepo: Partial<IEjecucionScrapingRepository>;
  let mockJugadorRepo: Partial<IJugadorRepository>;

  const jugador1 = Jugador.crear({
    id: '11111111-1111-4111-8111-111111111111',
    externalId: 101,
    nombre: 'Player One',
    posicionOriginal: 'Forward',
    equipoId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    ligaId: 'llllllll-llll-4lll-8lll-llllllllllll',
  });

  const jugador2 = Jugador.crear({
    id: '22222222-2222-4222-8222-222222222222',
    externalId: 102,
    nombre: 'Player Two',
    posicionOriginal: 'Midfielder',
    equipoId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    ligaId: 'llllllll-llll-4lll-8lll-llllllllllll',
  });

  const jugador3 = Jugador.crear({
    id: '33333333-3333-4333-8333-333333333333',
    externalId: 103,
    nombre: 'Player Three',
    posicionOriginal: 'Defender',
    equipoId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    ligaId: 'llllllll-llll-4lll-8lll-llllllllllll',
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
        items: [jugador1, jugador2, jugador3],
        total: 3,
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

  it('debe aislar fallos individuales por jugador sin abortar el procesamiento global de la liga', async () => {
    const rawStatsMap = new Map<string, RawWhoScoredPlayerStats>();

    // Jugador 1: Válido
    rawStatsMap.set('1', {
      whoScoredId: '1',
      nombre: 'Player One',
      partidosJugados: 10,
      minutosJugados: 900,
      goles: 4,
      asistencias: 2,
    });

    // Jugador 2: Inválido (error de matching)
    rawStatsMap.set('2', {
      whoScoredId: '2',
      nombre: 'Unknown Player Ghost',
      partidosJugados: 1,
      minutosJugados: 90,
    });

    // Jugador 3: Válido
    rawStatsMap.set('3', {
      whoScoredId: '3',
      nombre: 'Player Two',
      partidosJugados: 8,
      minutosJugados: 700,
      goles: 1,
      asistencias: 3,
    });

    // Jugador 4: Inválido (invariante de dominio violada: goles negativos)
    rawStatsMap.set('4', {
      whoScoredId: '4',
      nombre: 'Player Three',
      partidosJugados: 5,
      minutosJugados: 400,
      goles: -5,
      asistencias: 0,
    });

    (mockPlaywrightService.extraerEstadisticasLiga as jest.Mock).mockResolvedValue(rawStatsMap);

    const ejecucion = await service.ejecutarPipeline();

    // Verificaciones de aislamiento (FR-008, SC-003):
    expect(ejecucion.estado).toBe('exitoso'); // No aborta
    expect(ejecucion.jugadoresProcesados).toBe(2); // Jugador 1 y 3 procesados
    expect(ejecucion.errores).toBe(2); // Jugador 2 y 4 aislados con error
    expect(ejecucion.detalle).toHaveLength(2);
    expect(ejecucion.detalle[0].jugadorNombre).toBe('Unknown Player Ghost');
    expect(ejecucion.detalle[1].jugadorNombre).toBe('Player Three');
    expect(ejecucion.detalle[1].mensaje).toContain('goles');

    // Se guardaron los válidos
    expect(mockEstadisticaRepo.guardarMuchos).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jugadorId: jugador1.id }),
        expect.objectContaining({ jugadorId: jugador2.id }),
      ]),
    );
  });
});
