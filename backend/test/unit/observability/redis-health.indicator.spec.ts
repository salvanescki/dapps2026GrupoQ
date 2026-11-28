import { RedisHealthIndicator } from '../../../src/health/indicators/redis-health.indicator';
import { HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

describe('RedisHealthIndicator (Unit Tests)', () => {
  let indicator: RedisHealthIndicator;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      ping: jest.fn(),
      on: jest.fn(),
    } as any;
    indicator = new RedisHealthIndicator(mockRedis);
  });

  it('debe retornar status "up" si Redis responde PONG dentro del timeout', async () => {
    (mockRedis.ping as jest.Mock).mockResolvedValue('PONG');

    const result = await indicator.isHealthy('redis');
    expect(result).toEqual({
      redis: {
        status: 'up',
      },
    });
  });

  it('debe lanzar HealthCheckError con status "down" si Redis rechaza la conexión', async () => {
    (mockRedis.ping as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6379'));

    await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);

    try {
      await indicator.isHealthy('redis');
    } catch (err: any) {
      expect(err.causes).toEqual({
        redis: {
          status: 'down',
          message: 'ECONNREFUSED 127.0.0.1:6379',
        },
      });
    }
  });

  it('debe lanzar HealthCheckError si la respuesta de Redis no es PONG', async () => {
    (mockRedis.ping as jest.Mock).mockResolvedValue('UNKNOWN_REPLY');

    await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);
  });
});
