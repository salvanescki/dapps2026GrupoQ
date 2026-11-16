import { HealthController } from '../../../src/health/health.controller';
import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../../src/health/indicators/redis-health.indicator';
import { FootballDataHealthIndicator } from '../../../src/health/indicators/football-data-health.indicator';

describe('HealthController (Unit Tests)', () => {
  let controller: HealthController;
  let mockHealth: jest.Mocked<HealthCheckService>;
  let mockDb: jest.Mocked<TypeOrmHealthIndicator>;
  let mockMemory: jest.Mocked<MemoryHealthIndicator>;
  let mockRedis: jest.Mocked<RedisHealthIndicator>;
  let mockFootballData: jest.Mocked<FootballDataHealthIndicator>;

  beforeEach(() => {
    mockHealth = {
      check: jest.fn().mockImplementation(async (indicators: any[]) => {
        const results = await Promise.all(indicators.map((fn) => fn()));
        return { status: 'ok', details: Object.assign({}, ...results) };
      }),
    } as any;
    mockDb = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as any;
    mockMemory = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
    } as any;
    mockRedis = {
      isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
    } as any;
    mockFootballData = {
      isHealthy: jest.fn().mockResolvedValue({ footballData: { status: 'up' } }),
    } as any;

    controller = new HealthController(
      mockHealth,
      mockDb,
      mockMemory,
      mockRedis,
      mockFootballData,
    );
  });

  it('debe ejecutar checkReadiness() invocando las sondas de DB, Redis y FootballData', async () => {
    const res = await controller.checkReadiness();
    expect(res.status).toBe('ok');
    expect(mockDb.pingCheck).toHaveBeenCalledWith('database', { timeout: 3000 });
    expect(mockRedis.isHealthy).toHaveBeenCalledWith('redis');
    expect(mockFootballData.isHealthy).toHaveBeenCalledWith('footballData');
  });

  it('debe ejecutar checkLiveness() evaluando umbrales de memoria Heap (300MB) y RSS (1GB)', async () => {
    const res = await controller.checkLiveness();
    expect(res.status).toBe('ok');
    expect(mockMemory.checkHeap).toHaveBeenCalledWith('memory_heap', 300 * 1024 * 1024);
    expect(mockMemory.checkRSS).toHaveBeenCalledWith('memory_rss', 1024 * 1024 * 1024);
  });
});
