import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Prometheus Metrics Endpoint GET /metrics (Integration)', () => {
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

  it('debe responder HTTP 200 con Content-Type text/plain y exponer métricas de runtime y dominio', async () => {
    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/plain.*version=0\.0\.4/);

    const body = response.text;

    // Métricas por defecto del runtime de Node.js
    expect(body).toContain('process_cpu');

    // Métricas del dominio inicializadas
    expect(body).toContain('marketplace_orders_total');
    expect(body).toContain('marketplace_active_sell_orders');
    expect(body).toContain('quotes_active_strategy');
    expect(body).toContain('football_data_rate_limit_remaining');
  });

  it('debe reflejar inmediatamente incrementos realizados mediante AppMetricsService', async () => {
    metricsService.recordOrderCreated('compra', 'primario', 'completada');
    metricsService.recordVolumeCents('primario', 5000);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.text).toContain('marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"}');
    expect(response.text).toContain('marketplace_volume_cents_total{mercado="primario"} 5000');
  });
});
