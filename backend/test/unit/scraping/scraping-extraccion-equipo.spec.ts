import {
  WhoScoredPlaywrightService,
  IncidenciaScraping,
  ResultadoExtraccionLiga,
} from '../../../src/scraping/services/whoscored-playwright.service';
import { WhoScoredFeedIncompatibleException } from '../../../src/scraping/services/whoscored-feed-adapter.interface';
import { LigaScrapingConfig } from '../../../src/config/scraping.config';

describe('WhoScoredPlaywrightService - Extracción por Equipo y Resiliencia (Bloque 4)', () => {
  let service: WhoScoredPlaywrightService;

  beforeEach(() => {
    service = new WhoScoredPlaywrightService();
  });

  const config: LigaScrapingConfig = {
    liga: 'PL',
    regionId: 252,
    tournamentId: 2,
    seasonId: 12345,
    stageId: 22345,
    nombreTorneo: 'Premier League',
  };

  const equipos = [
    { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
    { whoScoredTeamId: '26', nombre: 'Liverpool', url: '/Teams/26' },
    { whoScoredTeamId: '167', nombre: 'Manchester City', url: '/Teams/167' },
  ];

  it('debe extraer secuencialmente jugadores por equipo usando el feed exitosamente', async () => {
    const mockFeedResponse = [
      {
        playerId: 101,
        name: 'Bukayo Saka',
        teamId: 13,
        teamName: 'Arsenal',
        apps: 10,
        minsPlayed: 900,
        goals: 5,
        assists: 4,
        rating: 7.8,
      },
    ];

    jest.spyOn(service as any, 'delayHumano').mockResolvedValue(undefined);
    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
          route: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      isConnected: jest.fn().mockReturnValue(true),
    } as any);

    jest.spyOn(service, 'consultarFeedEquipo').mockResolvedValue(mockFeedResponse);

    const resultado: ResultadoExtraccionLiga =
      await service.extraerEstadisticasLigaPorEquipos(config, equipos);

    expect(resultado.jugadores.size).toBe(1);
    expect(resultado.jugadores.get('101')?.nombre).toBe('Bukayo Saka');
    expect(resultado.incidencias.length).toBe(0);
  });

  it('debe conmutar a fallback DOM observable con log WARN si el feed resulta incompatible', async () => {
    jest.spyOn(service as any, 'delayHumano').mockResolvedValue(undefined);
    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
          route: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      isConnected: jest.fn().mockReturnValue(true),
    } as any);

    jest
      .spyOn(service, 'consultarFeedEquipo')
      .mockRejectedValue(new WhoScoredFeedIncompatibleException('Feed no disponible'));

    jest.spyOn(service, 'extraerEquipoDesdeDOM').mockResolvedValue([
      {
        whoScoredId: '201',
        nombre: 'Virgil van Dijk',
        equipoNombre: 'Liverpool',
        minutosJugados: 900,
        rating: 7.5,
      },
    ]);

    const resultado = await service.extraerEstadisticasLigaPorEquipos(config, [equipos[1]]);

    expect(resultado.jugadores.has('201')).toBe(true);
    expect(resultado.incidencias.some((i) => i.tipo === 'FALLBACK_DOM_ACTIVADO')).toBe(true);
  });

  it('debe aislar la falla en 1 equipo tras agotar reintentos y continuar con los restantes', async () => {
    jest.spyOn(service as any, 'delayHumano').mockResolvedValue(undefined);
    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
          route: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      isConnected: jest.fn().mockReturnValue(true),
    } as any);

    // Equipo 13 falla en feed y falla en fallback DOM
    jest.spyOn(service, 'consultarFeedEquipo').mockImplementation(async (_ctx, _stg, teamId) => {
      if (teamId === '13') {
        throw new Error('Timeout continuo');
      }
      return [
        {
          playerId: 301,
          name: 'Erling Haaland',
          teamId: 167,
          teamName: 'Manchester City',
          minsPlayed: 850,
          goals: 12,
          assists: 2,
          rating: 8.1,
        },
      ];
    });

    jest.spyOn(service, 'extraerEquipoDesdeDOM').mockImplementation(async (_page, team) => {
      if (team.whoScoredTeamId === '13') {
        throw new Error('Fallo crítico en DOM');
      }
      return [];
    });

    const resultado = await service.extraerEstadisticasLigaPorEquipos(config, [
      equipos[0],
      equipos[2],
    ]);

    expect(resultado.jugadores.has('301')).toBe(true);
    expect(resultado.incidencias.some((i) => i.tipo === 'EQUIPO_FALLIDO_AISLADO')).toBe(true);
  });

  it('debe aplicar pausa ante HTTP 429 y reintentar', async () => {
    jest.spyOn(service as any, 'delayHumano').mockResolvedValue(undefined);
    const pausaSpy = jest.spyOn(service as any, 'pausaRateLimit').mockResolvedValue(undefined);

    let llamadas = 0;
    jest.spyOn(service, 'consultarFeedEquipo').mockImplementation(async () => {
      llamadas++;
      if (llamadas === 1) {
        const err: any = new Error('Rate limit');
        err.status = 429;
        throw err;
      }
      return [
        {
          playerId: 401,
          name: 'Declan Rice',
          teamId: 13,
          minsPlayed: 880,
          goals: 2,
          assists: 3,
          rating: 7.4,
        },
      ];
    });

    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
          route: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      isConnected: jest.fn().mockReturnValue(true),
    } as any);

    const resultado = await service.extraerEstadisticasLigaPorEquipos(config, [equipos[0]]);

    expect(pausaSpy).toHaveBeenCalledWith(10000);
    expect(resultado.jugadores.has('401')).toBe(true);
  });
});
