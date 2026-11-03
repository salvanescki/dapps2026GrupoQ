import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class MarketplaceCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceCacheService.name);
  private readonly redisClient: Redis | null = null;
  private readonly defaultTTL = 300; // 5 minutos en segundos

  constructor(@Optional() injectedRedis?: Redis) {
    if (injectedRedis) {
      this.redisClient = injectedRedis;
    } else {
      try {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          this.redisClient = new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
          });
        } else {
          this.redisClient = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
          });
        }
        if (this.redisClient) {
          this.redisClient.on('error', () => {
            // Error de conexión manejado por degradación controlada
          });
        }
      } catch (err) {
        this.logger.warn(
          `No se pudo inicializar cliente Redis de marketplace: ${(err as Error).message}`,
        );
        this.redisClient = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // Ignorar en shutdown
      }
    }
  }

  public async guardarRanking(
    clave: string,
    datos: any,
    ttlSegundos: number = this.defaultTTL,
  ): Promise<void> {
    if (!this.redisClient) return;
    const key = `marketplace:ranking:${clave}`;
    try {
      await this.redisClient.setex(key, ttlSegundos, JSON.stringify(datos));
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al escribir ranking en caché (${key}): ${(err as Error).message}`,
      );
    }
  }

  public async obtenerRanking<T>(clave: string): Promise<T | null> {
    if (!this.redisClient) return null;
    const key = `marketplace:ranking:${clave}`;
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al leer ranking de caché (${key}): ${(err as Error).message}`,
      );
      return null;
    }
  }

  public async invalidarRanking(): Promise<void> {
    if (!this.redisClient) return;
    try {
      const keys = await this.redisClient.keys('marketplace:ranking:*');
      if (keys && keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al invalidar ranking en caché: ${(err as Error).message}`,
      );
    }
  }

  public async guardarEquipoSemanal(
    clave: string,
    datos: any,
    ttlSegundos: number = 1800,
  ): Promise<void> {
    if (!this.redisClient) return;
    const key = `marketplace:team-of-the-week:${clave}`;
    try {
      await this.redisClient.setex(key, ttlSegundos, JSON.stringify(datos));
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al escribir equipo semanal en caché (${key}): ${(err as Error).message}`,
      );
    }
  }

  public async obtenerEquipoSemanal<T>(clave: string): Promise<T | null> {
    if (!this.redisClient) return null;
    const key = `marketplace:team-of-the-week:${clave}`;
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al leer equipo semanal de caché (${key}): ${(err as Error).message}`,
      );
      return null;
    }
  }

  public async invalidarEquipoSemanal(): Promise<void> {
    if (!this.redisClient) return;
    try {
      const keys = await this.redisClient.keys('marketplace:team-of-the-week:*');
      if (keys && keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al invalidar equipo semanal en caché: ${(err as Error).message}`,
      );
    }
  }
}
