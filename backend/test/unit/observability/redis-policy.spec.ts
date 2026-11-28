import { NestFactory } from '@nestjs/core';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { RedisHealthIndicator } from '../../../src/health/indicators/redis-health.indicator';
import { esRedisHabilitado } from '../../../src/observability/utils/redis-policy.util';
import { bootstrapScraper } from '../../../src/run-scraper';
import { bootstrapSyncPlayers } from '../../../src/run-sync-players';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { BaseRedisCacheService } from '../../../src/services/base-redis-cache.service';
import { SincronizacionJugadoresService } from '../../../src/services/sincronizacion-jugadores.service';

class PolicyTestCacheService extends BaseRedisCacheService {
  constructor(injected?: any) {
    super('PolicyTestCacheService', injected);
  }

  public getClient() {
    return this.redisClient;
  }

  public async readKey(key: string) {
    return this.obtenerJson(key, 'test');
  }

  public async writeKey(key: string, val: unknown) {
    return this.guardarJson(key, val, 60, 'test');
  }

  public async clearPattern(pattern: string) {
    return this.eliminarPorPatron(pattern, 'test');
  }
}

describe('Redis Policy & Standalone Logger Attachment (US5)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_ENABLED;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe('esRedisHabilitado', () => {
    it('deshabilita Redis en production sin REDIS_URL ni REDIS_HOST', () => {
      expect(esRedisHabilitado({ NODE_ENV: 'production' })).toBe(false);
    });

    it('habilita Redis en production cuando existe REDIS_URL o REDIS_HOST', () => {
      expect(
        esRedisHabilitado({
          NODE_ENV: 'production',
          REDIS_URL: 'redis://prod:6379',
        }),
      ).toBe(true);
      expect(
        esRedisHabilitado({
          NODE_ENV: 'production',
          REDIS_HOST: 'redis.internal',
        }),
      ).toBe(true);
    });

    it('respeta override explicito REDIS_ENABLED=true/false en cualquier entorno', () => {
      expect(
        esRedisHabilitado({ NODE_ENV: 'production', REDIS_ENABLED: 'true' }),
      ).toBe(true);
      expect(
        esRedisHabilitado({ NODE_ENV: 'development', REDIS_ENABLED: 'false' }),
      ).toBe(false);
      expect(
        esRedisHabilitado({ NODE_ENV: 'test', REDIS_ENABLED: 'FALSE' }),
      ).toBe(false);
    });

    it('mantiene Redis habilitado por defecto en development, test o entorno indefinido', () => {
      expect(esRedisHabilitado({ NODE_ENV: 'development' })).toBe(true);
      expect(esRedisHabilitado({ NODE_ENV: 'test' })).toBe(true);
      expect(esRedisHabilitado({})).toBe(true);
    });
  });

  describe('BaseRedisCacheService en produccion sin Redis', () => {
    it('suprime completamente la creacion de cliente y warnings en operaciones de lectura, escritura e invalidacion', async () => {
      process.env.NODE_ENV = 'production';
      const service = new PolicyTestCacheService();
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      expect(service.getClient()).toBeNull();
      expect(await service.readKey('k1')).toBeNull();
      await service.writeKey('k1', { ok: true });
      await service.clearPattern('k*');

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('mantiene warnings operativos cuando se inyecta cliente Redis con fallo', async () => {
      process.env.NODE_ENV = 'production';
      const failingClient = {
        get: jest.fn().mockRejectedValue(new Error('Redis down')),
        setex: jest.fn().mockRejectedValue(new Error('Redis down')),
        keys: jest.fn().mockRejectedValue(new Error('Redis down')),
      };
      const service = new PolicyTestCacheService(failingClient);
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      expect(await service.readKey('k1')).toBeNull();
      await service.writeKey('k1', { ok: true });
      await service.clearPattern('k*');

      expect(warnSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('RedisHealthIndicator en produccion sin Redis', () => {
    it('retorna estado healthy con mode: disabled sin instanciar ioredis ni emitir warnings', async () => {
      process.env.NODE_ENV = 'production';
      const indicator = new RedisHealthIndicator();
      const warnSpy = jest.spyOn((indicator as any).logger, 'warn');

      const status = await indicator.isHealthy('redis');
      expect(status).toEqual({
        redis: { status: 'up', mode: 'disabled' },
      });
      expect((indicator as any).client).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('ejecuta ping normal si el cliente fue inyectado aunque NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      const mockClient: any = { ping: jest.fn().mockResolvedValue('PONG') };
      const indicator = new RedisHealthIndicator(mockClient);

      const status = await indicator.isHealthy('redis');
      expect(status).toEqual({ redis: { status: 'up' } });
      expect(mockClient.ping).toHaveBeenCalled();
    });
  });

  describe('Acoplamiento defensivo de Pino en scripts standalone (FR-009)', () => {
    it('bootstrapScraper acopla PinoNestLogger si useLogger existe y soporta mocks parciales sin useLogger', async () => {
      const pinoMock = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
      const scrapingMock = { ejecutarPipeline: jest.fn().mockResolvedValue({}) };
      const appWithLogger: any = {
        useLogger: jest.fn(),
        get: jest.fn((token: unknown) => {
          if (token === PinoNestLogger) return pinoMock;
          if (token === ScrapingService) return scrapingMock;
          return null;
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const createSpy = jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValueOnce(appWithLogger);

      expect(await bootstrapScraper(false)).toBe(0);
      expect(appWithLogger.useLogger).toHaveBeenCalledWith(pinoMock);
      expect(scrapingMock.ejecutarPipeline).toHaveBeenCalledWith('programado');

      // Mock parcial sin useLogger ni PinoNestLogger
      const partialApp: any = {
        get: jest.fn((token: unknown) =>
          token === ScrapingService ? scrapingMock : null,
        ),
        close: jest.fn().mockResolvedValue(undefined),
      };
      createSpy.mockResolvedValueOnce(partialApp);
      expect(await bootstrapScraper(false)).toBe(0);
    });

    it('bootstrapSyncPlayers acopla PinoNestLogger si useLogger existe y soporta mocks parciales sin useLogger', async () => {
      const pinoMock = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
      const syncMock = {
        sincronizarLigasYPlanteles: jest.fn().mockResolvedValue({
          totalLigas: 5,
          totalEquipos: 96,
          totalJugadores: 2400,
        }),
      };
      const appWithLogger: any = {
        useLogger: jest.fn(),
        get: jest.fn((token: unknown) => {
          if (token === PinoNestLogger) return pinoMock;
          if (token === SincronizacionJugadoresService) return syncMock;
          return null;
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const createSpy = jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValueOnce(appWithLogger);

      expect(await bootstrapSyncPlayers(false)).toBe(0);
      expect(appWithLogger.useLogger).toHaveBeenCalledWith(pinoMock);

      const partialApp: any = {
        get: jest.fn((token: unknown) =>
          token === SincronizacionJugadoresService ? syncMock : null,
        ),
        close: jest.fn().mockResolvedValue(undefined),
      };
      createSpy.mockResolvedValueOnce(partialApp);
      expect(await bootstrapSyncPlayers(false)).toBe(0);
    });
  });
});
