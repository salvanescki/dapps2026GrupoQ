import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../../../src/health/health.module';
import { TypeOrmHealthIndicator, HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../../src/health/indicators/redis-health.indicator';
import { FootballDataHealthIndicator } from '../../../src/health/indicators/football-data-health.indicator';

describe('HealthController GET /health/ready (Integration)', () => {
  let app: INestApplication;
  let mockTypeOrmIndicator: { pingCheck: jest.Mock };
  let mockRedisIndicator: { isHealthy: jest.Mock };
  let mockFootballDataIndicator: { isHealthy: jest.Mock };

  beforeEach(async () => {
    mockTypeOrmIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    };
    mockRedisIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
    };
    mockFootballDataIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ footballData: { status: 'up' } }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue(mockTypeOrmIndicator)
      .overrideProvider(RedisHealthIndicator)
      .useValue(mockRedisIndicator)
      .overrideProvider(FootballDataHealthIndicator)
      .useValue(mockFootballDataIndicator)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('debe responder HTTP 200 con status "ok" cuando todas las dependencias están disponibles', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info).toHaveProperty('database');
    expect(response.body.info).toHaveProperty('redis');
    expect(response.body.info).toHaveProperty('footballData');
    expect(response.body.details.database.status).toBe('up');
    expect(response.body.details.redis.status).toBe('up');
    expect(response.body.details.footballData.status).toBe('up');
  });

  it('debe responder HTTP 503 con status "error" si Redis o Football-Data falla', async () => {
    mockRedisIndicator.isHealthy.mockRejectedValue(
      new HealthCheckError('Redis failed', {
        redis: { status: 'down', message: 'Connection timeout after 2000ms' },
      }),
    );

    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(response.body.status).toBe('error');
    expect(response.body.error).toHaveProperty('redis');
    expect(response.body.details.redis.status).toBe('down');
  });
});
