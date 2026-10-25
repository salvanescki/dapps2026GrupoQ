import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import {
  EstructuraCompeticionWhoScored,
  EquipoWhoScoredDescubierto,
} from './whoscored-playwright.service';

@Injectable()
export class ScrapingCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ScrapingCacheService.name);
  private readonly redisClient: Redis | null = null;
  private readonly defaultTTL = 86400; // 24 horas en segundos

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
      } catch (err) {
        this.logger.warn(`No se pudo inicializar cliente Redis: ${(err as Error).message}`);
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

  public async guardarEstructuraCompeticion(
    competencia: string,
    temporada: string,
    estructura: EstructuraCompeticionWhoScored,
  ): Promise<void> {
    if (!this.redisClient) return;
    const key = `whoscored:discovery:${competencia.toLowerCase()}:${temporada}`;
    try {
      await this.redisClient.setex(key, this.defaultTTL, JSON.stringify(estructura));
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al escribir en caché Redis (${key}): ${(err as Error).message}`,
      );
    }
  }

  public async obtenerEstructuraCompeticion(
    competencia: string,
    temporada: string,
  ): Promise<EstructuraCompeticionWhoScored | null> {
    if (!this.redisClient) return null;
    const key = `whoscored:discovery:${competencia.toLowerCase()}:${temporada}`;
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as EstructuraCompeticionWhoScored;
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al consultar caché Redis (${key}): ${(err as Error).message}`,
      );
      return null;
    }
  }

  public async guardarEquiposStage(
    competencia: string,
    stageId: number,
    equipos: EquipoWhoScoredDescubierto[],
  ): Promise<void> {
    if (!this.redisClient) return;
    const key = `whoscored:teams:${competencia.toLowerCase()}:${stageId}`;
    try {
      await this.redisClient.setex(key, this.defaultTTL, JSON.stringify(equipos));
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al escribir equipos en caché Redis (${key}): ${(err as Error).message}`,
      );
    }
  }

  public async obtenerEquiposStage(
    competencia: string,
    stageId: number,
  ): Promise<EquipoWhoScoredDescubierto[] | null> {
    if (!this.redisClient) return null;
    const key = `whoscored:teams:${competencia.toLowerCase()}:${stageId}`;
    try {
      const data = await this.redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as EquipoWhoScoredDescubierto[];
    } catch (err) {
      this.logger.warn(
        `Degradación controlada: fallo al consultar equipos en caché Redis (${key}): ${(err as Error).message}`,
      );
      return null;
    }
  }
}
