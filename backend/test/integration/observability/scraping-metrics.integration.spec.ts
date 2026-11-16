import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Scraping Metrics via GET /metrics (Integration)', () => {
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

  it('debe exponer métricas de ejecuciones de scraping, duración, tasa de asociación e incidentes en GET /metrics', async () => {
    metricsService.recordScrapingExecution('exitoso');
    metricsService.recordScrapingDuration('PL', 12.5);
    metricsService.setPlayerMatchRate('PL', 95.0);
    metricsService.recordScrapingIncident('PL');

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    const text = response.text;

    expect(text).toContain('scraping_executions_total{estado="exitoso"} 1');
    expect(text).toContain('scraping_execution_duration_seconds_count{liga="PL"} 1');
    expect(text).toContain('scraping_player_match_rate{liga="PL"} 95');
    expect(text).toContain('scraping_incidents_total{liga="PL"} 1');
  });
});
