import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';

describe('MarketplaceCacheService Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('debe inicializar con REDIS_URL si está presente en el ambiente', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const service = new MarketplaceCacheService();
    expect(service).toBeDefined();
  });

  it('debe soportar degradación controlada cuando redisClient es nulo', async () => {
    const service = new MarketplaceCacheService(null as any);
    await service.guardarRanking('clave', { test: 1 });
    const obtenido = await service.obtenerRanking('clave');
    expect(obtenido).toBeNull();
    await service.invalidarRanking();
    await service.onModuleDestroy();
  });

  it('debe manejar errores de Redis con degradación controlada', async () => {
    const mockRedis: any = {
      setex: jest.fn().mockRejectedValue(new Error('Redis write fail')),
      get: jest.fn().mockRejectedValue(new Error('Redis read fail')),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(0),
      quit: jest.fn().mockRejectedValue(new Error('Redis quit fail')),
      on: jest.fn(),
    };

    const service = new MarketplaceCacheService(mockRedis);
    await service.guardarRanking('clave', { val: 123 });
    const res = await service.obtenerRanking('clave');
    expect(res).toBeNull();

    // keys retorna []
    await service.invalidarRanking();

    // keys arroja error
    mockRedis.keys.mockRejectedValueOnce(new Error('Keys fail'));
    await service.invalidarRanking();

    await service.onModuleDestroy();
  });
});

