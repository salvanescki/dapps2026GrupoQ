import {
  validarWhoScoredFeedPayload,
  WhoScoredFeedIncompatibleException,
  RawWhoScoredFeedItem,
} from '../../../src/scraping/services/whoscored-feed-adapter.interface';
import { WhoScoredPlaywrightService } from '../../../src/scraping/services/whoscored-playwright.service';

describe('WhoScoredFeedAdapter - Validación de Esquema y Sesión Stealth (Bloque 3)', () => {
  describe('validarWhoScoredFeedPayload', () => {
    it('debe aceptar un payload válido con playerTableStats y retornar los ítems tipados', () => {
      const payload = {
        stageId: 22345,
        playerTableStats: [
          {
            playerId: 365409,
            name: 'Bukayo Saka',
            teamId: 13,
            teamName: 'Arsenal',
            apps: 10,
            minsPlayed: 850,
            goals: 4,
            assists: 3,
            rating: 7.65,
          },
          {
            playerId: '10884',
            name: 'Mohamed Salah',
            teamId: 26,
            teamName: 'Liverpool',
            apps: 9,
            minsPlayed: 810,
            goals: 7,
            assists: 5,
            rating: 7.92,
          },
        ],
      };

      const items = validarWhoScoredFeedPayload(payload);
      expect(items.length).toBe(2);
      expect(items[0].name).toBe('Bukayo Saka');
      expect(items[0].playerId).toBe(365409);
      expect(items[1].name).toBe('Mohamed Salah');
      expect(items[1].playerId).toBe('10884');
    });

    it('debe aceptar un array directo como payload válido', () => {
      const itemsRaw = [
        {
          playerId: 1234,
          name: 'Declan Rice',
          teamId: 13,
          minsPlayed: 900,
          goals: 1,
          assists: 2,
          rating: 7.3,
        },
      ];

      const items = validarWhoScoredFeedPayload(itemsRaw);
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Declan Rice');
    });

    it('debe lanzar WhoScoredFeedIncompatibleException si el payload es nulo o no es objeto', () => {
      expect(() => validarWhoScoredFeedPayload(null)).toThrow(WhoScoredFeedIncompatibleException);
      expect(() => validarWhoScoredFeedPayload('string invalido')).toThrow(WhoScoredFeedIncompatibleException);
      expect(() => validarWhoScoredFeedPayload(42)).toThrow(WhoScoredFeedIncompatibleException);
    });

    it('debe lanzar WhoScoredFeedIncompatibleException si no contiene playerTableStats ni array', () => {
      expect(() => validarWhoScoredFeedPayload({ result: 'ok', data: [] })).toThrow(
        WhoScoredFeedIncompatibleException,
      );
    });

    it('debe lanzar WhoScoredFeedIncompatibleException si un elemento carece de playerId', () => {
      const payloadInvalido = {
        playerTableStats: [
          {
            name: 'Jugador Sin Id',
            goals: 2,
          },
        ],
      };
      expect(() => validarWhoScoredFeedPayload(payloadInvalido)).toThrow(
        WhoScoredFeedIncompatibleException,
      );
    });

    it('debe lanzar WhoScoredFeedIncompatibleException si un elemento carece de name o está vacío', () => {
      const payloadSinNombre = {
        playerTableStats: [
          {
            playerId: 999,
            name: '   ',
            goals: 2,
          },
        ],
      };
      expect(() => validarWhoScoredFeedPayload(payloadSinNombre)).toThrow(
        WhoScoredFeedIncompatibleException,
      );
    });
  });

  describe('WhoScoredPlaywrightService - Bootstrap de Sesión y Adaptador de Feed', () => {
    let service: WhoScoredPlaywrightService;

    beforeEach(() => {
      service = new WhoScoredPlaywrightService();
    });

    it('debe propagar cookies y cabeceras de navegación en peticiones al feed de estadísticas', async () => {
      const mockCookies = [
        { name: 'cf_clearance', value: 'clearance_test_token', domain: '.whoscored.com', path: '/' },
      ];

      const mockResponse = {
        status: () => 200,
        json: () =>
          Promise.resolve({
            playerTableStats: [
              {
                playerId: 13,
                name: 'Martin Odegaard',
                teamId: 13,
                minsPlayed: 750,
                goals: 2,
                assists: 4,
                rating: 7.4,
              },
            ],
          }),
      };

      const mockPage = {
        goto: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(null),
        route: jest.fn().mockResolvedValue(null),
        evaluate: jest.fn().mockResolvedValue(mockResponse.json()),
      };

      const mockContext = {
        cookies: jest.fn().mockResolvedValue(mockCookies),
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(null),
        request: {
          get: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(null),
        isConnected: jest.fn().mockReturnValue(true),
      };

      jest.spyOn(service, 'obtenerNavegador').mockResolvedValue(mockBrowser as any);

      const items = await service.consultarFeedEquipo(
        mockContext as any,
        22345,
        '13',
        'https://www.whoscored.com/Regions/252/Tournaments/2/Seasons/12345/Stages/22345',
      );

      expect(items.length).toBe(1);
      expect(items[0].playerId).toBe(13);
      expect(items[0].name).toBe('Martin Odegaard');
    });

    it('debe lanzar WhoScoredFeedIncompatibleException si el feed retorna JSON corrupto o no estructurado', async () => {
      const mockResponse = {
        status: () => 200,
        json: () => Promise.resolve({ error: 'formato desconocido' }),
      };

      const mockContext = {
        cookies: jest.fn().mockResolvedValue([]),
        newPage: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(null),
        request: {
          get: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      await expect(
        service.consultarFeedEquipo(
          mockContext as any,
          22345,
          '13',
          'https://www.whoscored.com',
        ),
      ).rejects.toThrow(WhoScoredFeedIncompatibleException);
    });
  });
});
