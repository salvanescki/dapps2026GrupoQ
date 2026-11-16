import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Infrastructure, Support & Auth Metrics via GET /metrics (Integration)', () => {
  let app: INestApplication;
  let metricsService: AppMetricsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ObservabilityModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    metricsService = moduleFixture.get<AppMetricsService>(AppMetricsService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('debe exponer métricas de Football-Data, TOTW, Caché Redis y Autenticación en GET /metrics', async () => {
    metricsService.recordFootballDataRequest('/competitions/PL/teams', 200);
    metricsService.setFootballDataRateLimitRemaining(7);

    metricsService.recordTotwGeneration('exito');
    metricsService.recordTotwDuration(0.75);

    metricsService.recordCacheRequest('marketplace', 'hit');
    metricsService.recordCacheFallback('marketplace');

    metricsService.recordAuthAttempt('exito');
    metricsService.recordPasswordHashingDuration(0.095);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    const text = response.text;

    expect(text).toContain('football_data_requests_total{endpoint="/competitions/PL/teams",status="200"} 1');
    expect(text).toContain('football_data_rate_limit_remaining 7');
    expect(text).toContain('totw_generations_total{estado="exito"} 1');
    expect(text).toContain('totw_generation_duration_seconds_count 1');
    expect(text).toContain('cache_requests_total{dominio="marketplace",resultado="hit"} 1');
    expect(text).toContain('cache_fallback_total{dominio="marketplace"} 1');
    expect(text).toContain('auth_attempts_total{resultado="exito"} 1');
    expect(text).toContain('password_hashing_duration_seconds_count 1');
  });
});
