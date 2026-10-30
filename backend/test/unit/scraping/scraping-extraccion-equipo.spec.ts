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
        goal: 5,
        assistTotal: 4,
        shotsPerGame: 3.2,
        passSuccess: 84.5,
        aerialWonPerGame: 0.7,
        yellowCard: 2,
        redCard: 0,
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
    const saka = resultado.jugadores.get('101');
    expect(saka?.nombre).toBe('Bukayo Saka');
    expect(saka?.goles).toBe(5);
    expect(saka?.asistencias).toBe(4);
    expect(saka?.tirosPorPartido).toBe(3.2);
    expect(saka?.precisionPase).toBe(84.5);
    expect(saka?.duelosAereosGanadosPorPartido).toBe(0.7);
    expect(saka?.tarjetasAmarillas).toBe(2);
    expect(saka?.tarjetasRojas).toBe(0);
    expect(resultado.incidencias.length).toBe(0);
  });

  it('debe enriquecer estadísticas del jugador fusionando feeds complementarios (offensive, defensive, passing, xg, saves)', async () => {
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
      .mockImplementation(async (_ctx, _stg, _teamId, _ref, _page, opciones) => {
        const cat = opciones?.category ?? 'summary';
        const sub = opciones?.subcategory ?? 'all';

        if (cat === 'summary' && sub === 'all') {
          return [
            {
              playerId: 373525,
              name: 'João Pedro',
              teamName: 'Chelsea',
              apps: 6,
              minsPlayed: 522,
              goal: 5,
              assistTotal: 3,
              shotsPerGame: 2.7,
              passSuccess: 68.3,
              aerialWonPerGame: 3.7,
              yellowCard: 1,
              redCard: 0,
              rating: 7.73,
            },
            {
              playerId: 102248,
              name: 'Emiliano Martínez',
              teamName: 'Chelsea',
              apps: 6,
              minsPlayed: 525,
              goal: 0,
              assistTotal: 0,
              rating: 6.95,
            },
          ];
        }
        if (cat === 'summary' && sub === 'offensive') {
          return [
            {
              playerId: 373525,
              name: 'João Pedro',
              dribbleWonPerGame: 1.2,
              keyPassPerGame: 1.2,
            },
          ];
        }
        if (cat === 'summary' && sub === 'defensive') {
          return [
            {
              playerId: 373525,
              name: 'João Pedro',
              tacklePerGame: 0.3,
              interceptionPerGame: 0.1,
              clearancePerGame: 0.7,
              goalOwn: 1,
            },
          ];
        }
        if (cat === 'summary' && sub === 'passing') {
          return [
            {
              playerId: 373525,
              name: 'João Pedro',
              totalPassesPerGame: 20.5,
              accurateCrossesPerGame: 0.2,
            },
          ];
        }
        if (cat === 'xg-stats' && sub === 'summary') {
          return [
            {
              playerId: 373525,
              name: 'João Pedro',
              apps: 6,
              xG: 3.6,
            },
          ];
        }
        if (cat === 'saves' && sub === 'shotzone') {
          return [
            {
              playerId: 102248,
              name: 'Emiliano Martínez',
              saveTotal: 4,
            },
          ];
        }
        return [];
      });

    const resultado = await service.extraerEstadisticasLigaPorEquipos(config, [equipos[0]]);

    const jp = resultado.jugadores.get('373525');
    expect(jp).toBeDefined();
    expect(jp?.goles).toBe(5);
    expect(jp?.asistencias).toBe(3);
    expect(jp?.regatesCompletadosPorPartido).toBe(1.2);
    expect(jp?.pasesClavePorPartido).toBe(1.2);
    expect(jp?.entradasPorPartido).toBe(0.3);
    expect(jp?.intercepccionesPorPartido).toBe(0.1);
    expect(jp?.despejesPorPartido).toBe(0.7);
    expect(jp?.autogoles).toBe(1);
    expect(jp?.pasesPorPartido).toBe(20.5);
    expect(jp?.centrosPorPartido).toBe(0.2);
    expect(jp?.xgPorPartido).toBeCloseTo(0.6, 5);

    const dibu = resultado.jugadores.get('102248');
    expect(dibu?.atajadas).toBe(4);
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
          goal: 12,
          assistTotal: 2,
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
          goal: 2,
          assistTotal: 3,
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
