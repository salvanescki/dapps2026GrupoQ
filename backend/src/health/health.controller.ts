import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { FootballDataHealthIndicator } from './indicators/football-data-health.indicator';

@ApiTags('Observabilidad')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly footballDataIndicator: FootballDataHealthIndicator,
  ) {}

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Sonda de preparación (Readiness Probe)',
    description:
      'Verifica la disponibilidad operativa de todas las dependencias críticas requeridas para procesar tráfico: base de datos PostgreSQL, caché Redis y la API externa Football-Data.org.',
  })
  @ApiResponse({
    status: 200,
    description: 'Todas las dependencias críticas están disponibles. La instancia está lista para recibir tráfico.',
  })
  @ApiResponse({
    status: 503,
    description: 'Al menos una dependencia crítica no está disponible o excedió el tiempo límite de espera.',
  })
  checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.redisIndicator.isHealthy('redis'),
      () => this.footballDataIndicator.isHealthy('footballData'),
    ]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Sonda de vivacidad (Liveness Probe)',
    description:
      'Verifica si el proceso Node.js se encuentra en un estado saludable y recuperable, evaluando que el consumo de memoria Heap no supere 300 MB y el RSS no supere 1 GB.',
  })
  @ApiResponse({
    status: 200,
    description: 'El proceso se encuentra saludable y dentro de los límites de memoria permitidos.',
  })
  @ApiResponse({
    status: 503,
    description: 'El proceso ha superado los umbrales de memoria Heap o RSS y requiere reinicio por parte del orquestador.',
  })
  checkLiveness(): Promise<HealthCheckResult> {
    const HEAP_THRESHOLD_BYTES = 300 * 1024 * 1024; // 300 MB
    const RSS_THRESHOLD_BYTES = 1024 * 1024 * 1024; // 1024 MB (1 GB)

    return this.health.check([
      async () => {
        const result = await this.memory.checkHeap('memory_heap', HEAP_THRESHOLD_BYTES);
        return {
          memory_heap: {
            ...result.memory_heap,
            bytes: result.memory_heap?.bytes ?? process.memoryUsage().heapUsed,
          },
        };
      },
      async () => {
        const result = await this.memory.checkRSS('memory_rss', RSS_THRESHOLD_BYTES);
        return {
          memory_rss: {
            ...result.memory_rss,
            bytes: result.memory_rss?.bytes ?? process.memoryUsage().rss,
          },
        };
      },
    ]);
  }
}
