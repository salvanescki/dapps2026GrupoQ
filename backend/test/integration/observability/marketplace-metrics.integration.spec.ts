import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ObservabilityModule } from '../../../src/observability/observability.module';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';

describe('Marketplace Trading Metrics via GET /metrics (Integration)', () => {
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

  it('debe reflejar órdenes, transacciones, volumen, duración, slippage y órdenes activas en GET /metrics', async () => {
    // Simular eventos generados durante un flujo de trading en OMS
    metricsService.recordOrderCreated('compra', 'primario', 'completada');
    metricsService.recordTransaction('primario', 'GLOBAL_v1');
    metricsService.recordVolumeCents('primario', 2500);
    metricsService.recordSettlementDuration('primario', 0.035);

    metricsService.recordSlippageRejection('secundario');
    metricsService.recordOrderCreated('compra', 'secundario', 'rechazada');

    metricsService.recordOrderCreated('venta', 'secundario', 'pendiente');
    metricsService.updateActiveSellOrders(2);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    const text = response.text;

    expect(text).toContain('marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 1');
    expect(text).toContain('marketplace_transactions_total{mercado="primario",estrategia_version="GLOBAL_v1"} 1');
    expect(text).toContain('marketplace_volume_cents_total{mercado="primario"} 2500');
    expect(text).toContain('marketplace_order_settlement_duration_seconds_count{mercado="primario"} 1');
    expect(text).toContain('marketplace_slippage_rejections_total{mercado="secundario"} 1');
    expect(text).toContain('marketplace_orders_total{tipo="compra",mercado="secundario",estado="rechazada"} 1');
    expect(text).toContain('marketplace_orders_total{tipo="venta",mercado="secundario",estado="pendiente"} 1');
    expect(text).toContain('marketplace_active_sell_orders 2');
  });
});
