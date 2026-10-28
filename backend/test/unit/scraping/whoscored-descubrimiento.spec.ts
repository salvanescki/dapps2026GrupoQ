import {
  WhoScoredPlaywrightService,
  EstructuraCompeticionWhoScored,
} from '../../../src/scraping/services/whoscored-playwright.service';
import { LigaScrapingConfig } from '../../../src/config/scraping.config';

describe('WhoScoredPlaywrightService - Descubrimiento de Competición y Equipos (Bloque 2)', () => {
  let service: WhoScoredPlaywrightService;

  beforeEach(() => {
    service = new WhoScoredPlaywrightService();
  });

  const mockLeagues: LigaScrapingConfig[] = [
    { liga: 'PL', regionId: 252, tournamentId: 2, seasonId: 12345, stageId: 22345, nombreTorneo: 'Premier League' },
    { liga: 'LL', regionId: 206, tournamentId: 4, seasonId: 12346, stageId: 22346, nombreTorneo: 'LaLiga' },
    { liga: 'SA', regionId: 108, tournamentId: 5, seasonId: 12347, stageId: 22347, nombreTorneo: 'Serie A' },
    { liga: 'BL', regionId: 81, tournamentId: 3, seasonId: 12348, stageId: 22348, nombreTorneo: 'Bundesliga' },
    { liga: 'L1', regionId: 74, tournamentId: 22, seasonId: 12349, stageId: 22349, nombreTorneo: 'Ligue 1' },
  ];

  it('debe descubrir correctamente la estructura competitiva y equipos desde fixture de DOM para Premier League', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(null),
      close: jest.fn().mockResolvedValue(null),
      route: jest.fn().mockResolvedValue(null),
      waitForSelector: jest.fn().mockResolvedValue(null),
      $eval: jest.fn().mockImplementation((selector: string) => {
        if (selector.includes('heading') || selector.includes('title')) {
          return Promise.resolve('Premier League 2025/2026');
        }
        return Promise.resolve('Regular Season');
      }),
      $$eval: jest.fn().mockImplementation((selector: string) => {
        return Promise.resolve([
          { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13/Show/England-Arsenal' },
          { whoScoredTeamId: '26', nombre: 'Liverpool', url: '/Teams/26/Show/England-Liverpool' },
          { whoScoredTeamId: '167', nombre: 'Manchester City', url: '/Teams/167/Show/England-Manchester-City' },
          { whoScoredTeamId: '32', nombre: 'Manchester United', url: '/Teams/32/Show/England-Manchester-United' },
        ]);
      }),
    };

    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(null),
    };

    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(null),
      isConnected: jest.fn().mockReturnValue(true),
    };

    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue(mockBrowser as any);

    const estructura: EstructuraCompeticionWhoScored =
      await service.descubrirEstructuraCompeticion(mockLeagues[0]);

    expect(estructura.tournamentId).toBe(2);
    expect(estructura.seasonId).toBe(12345);
    expect(estructura.stageId).toBe(22345);
    expect(estructura.competencia).toBe('Premier League');
    expect(estructura.etapa).toBe('Regular Season');
    expect(estructura.equipos.length).toBe(4);
    expect(estructura.equipos[0]).toEqual({
      whoScoredTeamId: '13',
      nombre: 'Arsenal',
      url: '/Teams/13/Show/England-Arsenal',
    });
  });

  it('debe descubrir correctamente equipos y parámetros para las 5 ligas top (PL, LL, SA, BL, L1)', async () => {
    for (const config of mockLeagues) {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(null),
        route: jest.fn().mockResolvedValue(null),
        waitForSelector: jest.fn().mockResolvedValue(null),
        $eval: jest.fn().mockResolvedValue(config.nombreTorneo),
        $$eval: jest.fn().mockResolvedValue([
          { whoScoredTeamId: '101', nombre: `Team A - ${config.liga}`, url: `/Teams/101/Show/${config.liga}-TeamA` },
          { whoScoredTeamId: '102', nombre: `Team B - ${config.liga}`, url: `/Teams/102/Show/${config.liga}-TeamB` },
        ]),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(null),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(null),
        isConnected: jest.fn().mockReturnValue(true),
      };

      jest.spyOn(service, 'obtenerNavegador').mockResolvedValue(mockBrowser as any);

      const estructura = await service.descubrirEstructuraCompeticion(config);
      expect(estructura.tournamentId).toBe(config.tournamentId);
      expect(estructura.competencia).toBe(config.nombreTorneo);
      expect(estructura.equipos.length).toBe(2);
      expect(estructura.equipos[0].whoScoredTeamId).toBe('101');
    }
  });

  it('debe resolver equipos desde fallback de configuración si el selector DOM de equipos no encuentra filas', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(null),
      close: jest.fn().mockResolvedValue(null),
      route: jest.fn().mockResolvedValue(null),
      waitForSelector: jest.fn().mockRejectedValue(new Error('Timeout')),
      $eval: jest.fn().mockRejectedValue(new Error('No heading')),
      $$eval: jest.fn().mockResolvedValue([]),
    };

    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(null),
    };

    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(null),
      isConnected: jest.fn().mockReturnValue(true),
    };

    jest.spyOn(service, 'obtenerNavegador').mockResolvedValue(mockBrowser as any);

    const estructura = await service.descubrirEstructuraCompeticion(mockLeagues[0]);
    expect(estructura.tournamentId).toBe(2);
    expect(estructura.competencia).toBe('Premier League');
    expect(estructura.etapa).toBe('Regular Season');
  });
});
