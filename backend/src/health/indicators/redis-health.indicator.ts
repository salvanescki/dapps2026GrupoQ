import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';
import { esRedisHabilitado } from '../../observability/utils/redis-policy.util';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private client: Redis | null = null;
  private readonly isInjectedClient: boolean = false;
  private readonly timeoutMs: number = 2000;

  constructor(@Optional() @Inject('REDIS_CLIENT') injectedClient?: Redis) {
    super();
    if (injectedClient) {
      this.client = injectedClient;
      this.isInjectedClient = true;
    }
  }

  private getClient(): Redis {
    if (!this.client || (!this.isInjectedClient && (this.client.status === 'end' || this.client.status === 'close'))) {
      const commonOptions = {
        lazyConnect: true,
        connectTimeout: this.timeoutMs,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      };

      if (process.env.REDIS_URL) {
        this.client = new Redis(process.env.REDIS_URL, commonOptions);
      } else {
        this.client = new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          ...commonOptions,
        });
      }
      this.client.on('error', (err) => {
        this.logger.warn(`Error en conexión RedisHealthIndicator: ${err.message}`);
      });
    }
    return this.client;
  }

  async isHealthy(key: string = 'redis'): Promise<HealthIndicatorResult> {
    if (!this.isInjectedClient && !esRedisHabilitado()) {
      return this.getStatus(key, true, { mode: 'disabled' });
    }

    try {
      const client = this.getClient();
      const pingPromise = client.ping();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de conexión tras ${this.timeoutMs}ms`)), this.timeoutMs),
      );

      const result = await Promise.race([pingPromise, timeoutPromise]);
      if (result === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new Error(`Respuesta inesperada de Redis: ${result}`);
    } catch (error: any) {
      const result = this.getStatus(key, false, { message: error.message });
      throw new HealthCheckError('Fallo en health check de Redis', result);
    }
  }
}
