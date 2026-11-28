import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { AuditAspectRegistry } from './aspects/audit-aspect.registry';
import { createPinoLoggerConfig } from './config/pino-logger.config';
import { MetricsController } from './controllers/metrics.controller';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';
import { AuditContextMiddleware } from './middleware/audit-context.middleware';
import { AppMetricsService } from './services/app-metrics.service';
import { AuditContextService } from './services/audit-context.service';
import { AuditLoggerService } from './services/audit-logger.service';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => createPinoLoggerConfig(),
    }),
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    AppMetricsService,
    AuditContextService,
    AuditLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
  exports: [
    AppMetricsService,
    AuditContextService,
    AuditLoggerService,
    LoggerModule,
  ],
})
export class ObservabilityModule
  implements OnModuleInit, OnModuleDestroy, NestModule
{
  constructor(
    private readonly appMetricsService: AppMetricsService,
    @Optional() private readonly auditLoggerService?: AuditLoggerService,
    @Optional() private readonly auditContextService?: AuditContextService,
  ) {}

  onModuleInit(): void {
    this.appMetricsService.onModuleInit();
    if (this.auditLoggerService) {
      AuditAspectRegistry.registerLogger(this.auditLoggerService);
    }
    if (this.auditContextService) {
      AuditAspectRegistry.registerContext(this.auditContextService);
    }
  }

  onModuleDestroy(): void {
    AuditAspectRegistry.clear();
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
