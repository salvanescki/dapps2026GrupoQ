import { ScrapingCacheService } from '../../../src/scraping/services/scraping-cache.service';
import { EstructuraCompeticionWhoScored } from '../../../src/scraping/services/whoscored-playwright.service';

describe('ScrapingCacheService - Subbloque Redis L1 (Bloque 8)', () => {
  let cacheService: ScrapingCacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
    };

    cacheService = new ScrapingCacheService(mockRedisClient);
  });

  const estructuraMock: EstructuraCompeticionWhoScored = {
    tournamentId: 2,
    seasonId: 12345,
    stageId: 22345,
    competencia: 'Premier League',
    etapa: 'Regular Season',
    temporadaEtiqueta: '2025/2026',
    equipos: [
      { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
      { whoScoredTeamId: '26', nombre: 'Liverpool', url: '/Teams/26' },
    ],
  };

  it('debe almacenar estructura de competición con TTL de 24 horas (86400s)', async () => {
    mockRedisClient.setex.mockResolvedValue('OK');

    await cacheService.guardarEstructuraCompeticion(
      'Premier League',
      '2025/2026',
      estructuraMock,
    );

    expect(mockRedisClient.setex).toHaveBeenCalledWith(
      'whoscored:discovery:premier league:2025/2026',
      86400,
      JSON.stringify(estructuraMock),
    );
  });

  it('debe retornar estructura en caso de cache hit', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify(estructuraMock));

    const resultado = await cacheService.obtenerEstructuraCompeticion(
      'Premier League',
      '2025/2026',
    );

    expect(resultado).toEqual(estructuraMock);
    expect(mockRedisClient.get).toHaveBeenCalledWith(
      'whoscored:discovery:premier league:2025/2026',
    );
  });

  it('debe retornar null en caso de cache miss', async () => {
    mockRedisClient.get.mockResolvedValue(null);

    const resultado = await cacheService.obtenerEstructuraCompeticion(
      'LaLiga',
      '2025/2026',
    );

    expect(resultado).toBeNull();
  });

  it('debe degradar controladamente ante error de Redis retornando null y emitiendo log WARN sin lanzar excepción', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis connection timeout'));

    const resultado = await cacheService.obtenerEstructuraCompeticion(
      'Premier League',
      '2025/2026',
    );

    expect(resultado).toBeNull();
  });

  it('debe degradar controladamente ante error al guardar en Redis sin interrumpir el proceso', async () => {
    mockRedisClient.setex.mockRejectedValue(new Error('Redis readonly replica'));

    await expect(
      cacheService.guardarEstructuraCompeticion(
        'Premier League',
        '2025/2026',
        estructuraMock,
      ),
    ).resolves.not.toThrow();
  });
});
