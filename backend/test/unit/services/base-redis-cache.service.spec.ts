import Redis from 'ioredis';
import { BaseRedisCacheService } from '../../../src/services/base-redis-cache.service';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { ScrapingCacheService } from '../../../src/scraping/services/scraping-cache.service';

class TestRedisCacheService extends BaseRedisCacheService {
  constructor(injectedRedis?: Redis | null) {
    super('TestRedisCacheService', injectedRedis);
  }

  public obtenerCliente(): Redis | null {
    return this.redisClient;
  }

  public async escribir(
    key: string,
    datos: unknown,
    ttl: number,
  ): Promise<void> {
    await this.guardarJson(key, datos, ttl, 'recurso de prueba');
  }

  public async leer<T>(key: string): Promise<T | null> {
    return this.obtenerJson<T>(key, 'recurso de prueba');
  }

  public async invalidar(patron: string): Promise<void> {
    await this.eliminarPorPatron(patron, 'recurso de prueba');
  }
}

class FailingRedisCacheService extends BaseRedisCacheService {
  constructor() {
    super('FailingRedisCacheService');
  }

  protected override crearInstanciaRedis(): Redis {
    throw new Error('Fallo simulado de construcción Redis');
  }

  public obtenerCliente(): Redis | null {
    return this.redisClient;
  }
}

describe('BaseRedisCacheService Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Inicialización y ciclo de vida del cliente Redis', () => {
    it('debe inicializar usando REDIS_URL cuando está definido y manejar eventos de error', async () => {
      process.env.REDIS_URL = 'redis://127.0.0.1:6379';
      const service = new TestRedisCacheService();
      const cliente = service.obtenerCliente();

      expect(cliente).toBeDefined();
      expect(cliente).not.toBeNull();
      expect(() =>
        cliente?.emit('error', new Error('Conexión rechazada')),
      ).not.toThrow();

      await service.onModuleDestroy();
    });

    it('debe inicializar usando REDIS_HOST y REDIS_PORT por defecto cuando REDIS_URL no está definido', async () => {
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      const service = new TestRedisCacheService();
      expect(service.obtenerCliente()).not.toBeNull();
      await service.onModuleDestroy();
    });

    it('debe inicializar usando REDIS_HOST y REDIS_PORT explícitos', async () => {
      delete process.env.REDIS_URL;
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6380';

      const service = new TestRedisCacheService();
      expect(service.obtenerCliente()).not.toBeNull();
      await service.onModuleDestroy();
    });

    it('debe degradar a redisClient = null cuando la creación del cliente lanza excepción', async () => {
      const service = new FailingRedisCacheService();
      expect(service.obtenerCliente()).toBeNull();
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('debe cerrar limpiamente el cliente en onModuleDestroy e ignorar errores de quit()', async () => {
      const mockRedis: any = {
        quit: jest
          .fn()
          .mockResolvedValueOnce('OK')
          .mockRejectedValueOnce(new Error('Quit error')),
      };
      const service = new TestRedisCacheService(mockRedis);

      await service.onModuleDestroy();
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Operaciones JSON y eliminación por patrón', () => {
    it('debe guardar, obtener y eliminar claves por patrón cuando Redis responde correctamente', async () => {
      const mockRedis: any = {
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(JSON.stringify({ id: 'j1', valor: 10 })),
        keys: jest.fn().mockResolvedValue(['test:1', 'test:2']),
        del: jest.fn().mockResolvedValue(2),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      const service = new TestRedisCacheService(mockRedis);

      await service.escribir('test:1', { id: 'j1', valor: 10 }, 120);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:1',
        120,
        JSON.stringify({ id: 'j1', valor: 10 }),
      );

      const leido = await service.leer<{ id: string; valor: number }>('test:1');
      expect(leido).toEqual({ id: 'j1', valor: 10 });

      await service.invalidar('test:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith('test:1', 'test:2');
    });

    it('no debe invocar del() cuando keys() retorna lista vacía y debe retornar null en cache miss', async () => {
      const mockRedis: any = {
        get: jest.fn().mockResolvedValue(null),
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn(),
      };

      const service = new TestRedisCacheService(mockRedis);

      const resultado = await service.leer('inexistente');
      expect(resultado).toBeNull();

      await service.invalidar('test:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('debe degradar elegantemente sin lanzar excepción cuando redisClient es null o falla', async () => {
      const nullService = new TestRedisCacheService(null);
      await expect(
        nullService.escribir('k', { a: 1 }, 60),
      ).resolves.toBeUndefined();
      await expect(nullService.leer('k')).resolves.toBeNull();
      await expect(nullService.invalidar('k:*')).resolves.toBeUndefined();

      const errorRedis: any = {
        setex: jest.fn().mockRejectedValue(new Error('Write error')),
        get: jest.fn().mockRejectedValue(new Error('Read error')),
        keys: jest.fn().mockRejectedValue(new Error('Keys error')),
      };
      const errorService = new TestRedisCacheService(errorRedis);
      await expect(
        errorService.escribir('k', { a: 1 }, 60),
      ).resolves.toBeUndefined();
      await expect(errorService.leer('k')).resolves.toBeNull();
      await expect(errorService.invalidar('k:*')).resolves.toBeUndefined();
    });
  });

  describe('Delegación en subclases MarketplaceCacheService y ScrapingCacheService', () => {
    it('debe delegar operaciones de equipo semanal en MarketplaceCacheService', async () => {
      const mockRedis: any = {
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(JSON.stringify({ semana: '2026-W45' })),
        keys: jest.fn().mockResolvedValue(['marketplace:team-of-the-week:2026-W45']),
        del: jest.fn().mockResolvedValue(1),
      };
      const marketplaceCache = new MarketplaceCacheService(mockRedis);

      await marketplaceCache.guardarEquipoSemanal('2026-W45', {
        semana: '2026-W45',
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'marketplace:team-of-the-week:2026-W45',
        1800,
        JSON.stringify({ semana: '2026-W45' }),
      );

      const equipo = await marketplaceCache.obtenerEquipoSemanal<{
        semana: string;
      }>('2026-W45');
      expect(equipo).toEqual({ semana: '2026-W45' });

      await marketplaceCache.invalidarEquipoSemanal();
      expect(mockRedis.del).toHaveBeenCalledWith(
        'marketplace:team-of-the-week:2026-W45',
      );
    });

    it('debe delegar operaciones de equipos por etapa en ScrapingCacheService', async () => {
      const mockRedis: any = {
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(
          JSON.stringify([
            { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
          ]),
        ),
      };
      const scrapingCache = new ScrapingCacheService(mockRedis);

      await scrapingCache.guardarEquiposStage('Premier League', 99, [
        { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
      ]);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'whoscored:teams:premier league:99',
        86400,
        JSON.stringify([
          { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
        ]),
      );

      const equipos = await scrapingCache.obtenerEquiposStage(
        'Premier League',
        99,
      );
      expect(equipos).toEqual([
        { whoScoredTeamId: '13', nombre: 'Arsenal', url: '/Teams/13' },
      ]);
    });
  });
});

