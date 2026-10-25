import { WhoScoredPlaywrightService, RawWhoScoredPlayerStats } from '../../../src/scraping/services/whoscored-playwright.service';

describe('WhoScoredPlaywrightService (Unit Tests)', () => {
  let service: WhoScoredPlaywrightService;
  let mockPage: any;
  let mockContext: any;
  let mockBrowser: any;

  beforeEach(() => {
    mockPage = {
      route: jest.fn().mockImplementation((pattern, handler) => {
        const mockRoute = {
          request: () => ({ resourceType: () => 'image' }),
          abort: jest.fn(),
          continue: jest.fn(),
        };
        handler(mockRoute);
      }),
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue({ click: jest.fn().mockResolvedValue(undefined) }),
      $$eval: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    service = new WhoScoredPlaywrightService();
    // Inyectamos el mockBrowser directamente para pruebas unitarias sin lanzar Chromium real
    (service as any).browser = mockBrowser;
  });

  it('debe inicializar y cerrar el browser limpiamente en el ciclo de vida', async () => {
    expect(service).toBeDefined();
    await service.cerrarNavegador();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('debe extraer estadísticas parseando filas del DOM de WhoScored', async () => {
    const mockRows = [
      {
        whoScoredId: '12345',
        nombre: 'Erling Haaland',
        equipoNombre: 'Manchester City',
        apps: '10',
        minsPlayed: '900',
        goal: '12',
        assistTotal: '2',
        shotsPerGame: '4.1',
        passSuccess: '78.2',
        aerialWonPerGame: '1.5',
        rating: '7.95',
        yellowCard: '1',
        redCard: '0',
      },
    ];

    // Simulamos la extracción de la pestaña Summary
    mockPage.$$eval.mockResolvedValueOnce(mockRows);
    // Para las siguientes pestañas simulamos filas vacías o adicionales
    mockPage.$$eval.mockResolvedValue([]);

    const config = {
      liga: 'PL',
      regionId: 252,
      tournamentId: 2,
      seasonId: 12345,
      stageId: 22345,
    };

    // Sobreescribimos el delay para tests rápidos
    (service as any).scrapingConfig = {
      delayMinMs: 0,
      delayMaxMs: 0,
      seasonLabel: '2025/2026',
      leagueConfigs: [config],
    };

    const resultado = await service.extraerEstadisticasLiga(config);
    expect(resultado).toBeInstanceOf(Map);
    expect(resultado.size).toBe(1);

    const jugador = resultado.get('12345');
    expect(jugador).toBeDefined();
    expect(jugador!.nombre).toBe('Erling Haaland');
    expect(jugador!.goles).toBe(12);
    expect(jugador!.asistencias).toBe(2);
    expect(jugador!.rating).toBe(7.95);
  });

  it('debe abortar recursos estáticos pesados (imágenes, hojas de estilo, fuentes)', async () => {
    let handlerGuardado: any;
    mockPage.route = jest.fn().mockImplementation((pattern, handler) => {
      handlerGuardado = handler;
    });

    await (service as any).configurarInterceptores(mockPage);

    const routeImg = {
      request: () => ({ resourceType: () => 'image' }),
      abort: jest.fn(),
      continue: jest.fn(),
    };
    handlerGuardado(routeImg);
    expect(routeImg.abort).toHaveBeenCalled();

    const routeDoc = {
      request: () => ({ resourceType: () => 'document' }),
      abort: jest.fn(),
      continue: jest.fn(),
    };
    handlerGuardado(routeDoc);
    expect(routeDoc.continue).toHaveBeenCalled();
  });

  it('debe inicializar el navegador con el plugin stealth sin lanzar errores', async () => {
    const uninitializedService = new WhoScoredPlaywrightService();
    const { chromium } = require('playwright-extra');
    const mockLaunch = jest.spyOn(chromium, 'launch').mockResolvedValue(mockBrowser);
    const mockUse = jest.spyOn(chromium, 'use').mockImplementation((() => {}) as any);

    const browser = await uninitializedService.obtenerNavegador();
    expect(browser).toBe(mockBrowser);
    expect(mockLaunch).toHaveBeenCalled();

    mockLaunch.mockRestore();
    mockUse.mockRestore();
  });
});
