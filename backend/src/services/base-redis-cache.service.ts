import { Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export abstract class BaseRedisCacheService implements OnModuleDestroy {
  protected readonly logger: Logger;
  protected readonly redisClient: Redis | null = null;

  protected constructor(loggerContext: string, injectedRedis?: Redis | null) {
    this.logger = new Logger(loggerContext);
    if (injectedRedis !== undefined) {
      this.redisClient = injectedRedis;
    } else {
      try {
        this.redisClient = this.crearInstanciaRedis(process.env.REDIS_URL);
        this.redisClient.on('error', () => {
          // Error de conexión manejado por degradación controlada
        });
      } catch (err) {
        this.logger.warn(
          `No se pudo inicializar cliente Redis (${loggerContext}): ${(err as Error).message}`,
        );
        this.redisClient = null;
      }
    }
  }

  protected crearInstanciaRedis(redisUrl?: string): Redis {
    if (redisUrl) {
      return new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });
    }
    return new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  }

  public async onModuleDestroy(): Promise<void> {
    if (!this.redisClient) return;
    try {
      await this.redisClient.quit();
    } catch {
      // Ignorar en shutdown
    }
  }

  protected async guardarJson(
    key: string,
    datos: unknown,
    ttlSegundos: number,
    etiquetaError: string,
  ): Promise<void> {
    if (!this.redisClient) return;
    try {
      await this.redisClient.setex(key, ttlSegundos, JSON.stringify(datos));
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al escribir ${etiquetaError} en caché (${key}): ${(err as Error).message}`,
      );
    }
  }

  protected async obtenerJson<T>(
    key: string,
    etiquetaError: string,
  ): Promise<T | null> {
    if (!this.redisClient) return null;
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al leer ${etiquetaError} de caché (${key}): ${(err as Error).message}`,
      );
      return null;
    }
  }

  protected async eliminarPorPatron(
    patron: string,
    etiquetaError: string,
  ): Promise<void> {
    if (!this.redisClient) return;
    try {
      const keys = await this.redisClient.keys(patron);
      if (keys && keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al invalidar ${etiquetaError} en caché: ${(err as Error).message}`,
      );
    }
  }
}

