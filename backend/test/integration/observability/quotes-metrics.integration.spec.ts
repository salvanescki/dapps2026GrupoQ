import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Quotes Pricing Metrics via GET /metrics (Integration)', () => {
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

  it('debe reflejar recálculos, duración, categorías de evaluación y estrategia activa en GET /metrics', async () => {
    metricsService.recordRecalculation('GLOBAL_v1', 'exito');
    metricsService.recordRecalculationDuration('GLOBAL_v1', 2.34);
    metricsService.recordPlayersEvaluated('procesados', 120);
    metricsService.recordPlayersEvaluated('sin_estadisticas', 15);
    metricsService.recordPlayersEvaluated('fallidos', 2);
    metricsService.setActiveStrategy('POSICIONAL_v1');

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    const text = response.text;

    expect(text).toContain('quotes_recalculations_total{estrategia="GLOBAL_v1",estado="exito"} 1');
    expect(text).toContain('quotes_recalculation_duration_seconds_count{estrategia="GLOBAL_v1"} 1');
    expect(text).toContain('quotes_players_evaluated_total{categoria="procesados"} 120');
    expect(text).toContain('quotes_players_evaluated_total{categoria="sin_estadisticas"} 15');
    expect(text).toContain('quotes_players_evaluated_total{categoria="fallidos"} 2');
    expect(text).toContain('quotes_active_strategy{estrategia="POSICIONAL_v1"} 1');
    expect(text).toContain('quotes_active_strategy{estrategia="GLOBAL_v1"} 0');
  });
});
