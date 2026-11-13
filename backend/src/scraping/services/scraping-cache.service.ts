import { Injectable, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { BaseRedisCacheService } from '../../services/base-redis-cache.service';
import {
  EstructuraCompeticionWhoScored,
  EquipoWhoScoredDescubierto,
} from './whoscored-playwright.service';

@Injectable()
export class ScrapingCacheService extends BaseRedisCacheService {
  private readonly defaultTTL = 86400; // 24 horas en segundos

  constructor(@Optional() injectedRedis?: Redis) {
    super(ScrapingCacheService.name, injectedRedis);
  }

  public async guardarEstructuraCompeticion(
    competencia: string,
    temporada: string,
    estructura: EstructuraCompeticionWhoScored,
  ): Promise<void> {
    await this.guardarJson(
      `whoscored:discovery:${competencia.toLowerCase()}:${temporada}`,
      estructura,
      this.defaultTTL,
      'estructura de competición',
    );
  }

  public async obtenerEstructuraCompeticion(
    competencia: string,
    temporada: string,
  ): Promise<EstructuraCompeticionWhoScored | null> {
    return this.obtenerJson<EstructuraCompeticionWhoScored>(
      `whoscored:discovery:${competencia.toLowerCase()}:${temporada}`,
      'estructura de competición',
    );
  }

  public async guardarEquiposStage(
    competencia: string,
    stageId: number,
    equipos: EquipoWhoScoredDescubierto[],
  ): Promise<void> {
    await this.guardarJson(
      `whoscored:teams:${competencia.toLowerCase()}:${stageId}`,
      equipos,
      this.defaultTTL,
      'equipos de etapa',
    );
  }

  public async obtenerEquiposStage(
    competencia: string,
    stageId: number,
  ): Promise<EquipoWhoScoredDescubierto[] | null> {
    return this.obtenerJson<EquipoWhoScoredDescubierto[]>(
      `whoscored:teams:${competencia.toLowerCase()}:${stageId}`,
      'equipos de etapa',
    );
  }
}
