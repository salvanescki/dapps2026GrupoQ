import { Module, Global, OnModuleInit } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppMetricsService } from './services/app-metrics.service';
import { MetricsController } from './controllers/metrics.controller';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [AppMetricsService],
  exports: [AppMetricsService],
})
export class ObservabilityModule implements OnModuleInit {
  constructor(private readonly appMetricsService: AppMetricsService) {}

  onModuleInit(): void {
    this.appMetricsService.onModuleInit();
  }
}
