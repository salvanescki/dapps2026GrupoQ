import { MetricsController } from '../../../src/observability/controllers/metrics.controller';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { HealthModule } from '../../../src/health/health.module';
import { RedisHealthIndicator } from '../../../src/health/indicators/redis-health.indicator';

describe('Observability & Health Modules & Controllers (Unit Tests)', () => {
  it('MetricsController debe delegar index() a la implementación base', async () => {
    const controller = new MetricsController();
    const mockRes = {
      header: jest.fn(),
    } as any;

    const output = await controller.index(mockRes);
    expect(typeof output).toBe('string');
    expect(mockRes.header).toHaveBeenCalledWith('Content-Type', expect.any(String));
  });

  it('ObservabilityModule debe poder instanciarse y ejecutar onModuleInit', () => {
    const mockService = {
      onModuleInit: jest.fn(),
    } as any;
    const mod = new ObservabilityModule(mockService);
    mod.onModuleInit();
    expect(mockService.onModuleInit).toHaveBeenCalled();
  });

  it('HealthModule debe ser una clase instanciable', () => {
    const mod = new HealthModule();
    expect(mod).toBeDefined();
  });

  it('RedisHealthIndicator debe instanciar cliente con URL o host/port por defecto cuando no se inyecta cliente', () => {
    const originalUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    try {
      const indicator = new RedisHealthIndicator();
      expect((indicator as any).getClient()).toBeDefined();
    } finally {
      process.env.REDIS_URL = originalUrl;
    }
  });

  it('RedisHealthIndicator debe instanciar cliente con host/port cuando no existe REDIS_URL', () => {
    const originalUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      const indicator = new RedisHealthIndicator();
      expect((indicator as any).getClient()).toBeDefined();
    } finally {
      if (originalUrl !== undefined) {
        process.env.REDIS_URL = originalUrl;
      }
    }
  });
});
