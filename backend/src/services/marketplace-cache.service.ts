import { Injectable, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { BaseRedisCacheService } from './base-redis-cache.service';

@Injectable()
export class MarketplaceCacheService extends BaseRedisCacheService {
  private readonly defaultTTL = 300; // 5 minutos en segundos

  constructor(@Optional() injectedRedis?: Redis) {
    super(MarketplaceCacheService.name, injectedRedis);
  }

  public async guardarRanking(
    clave: string,
    datos: any,
    ttlSegundos: number = this.defaultTTL,
  ): Promise<void> {
    await this.guardarJson(
      `marketplace:ranking:${clave}`,
      datos,
      ttlSegundos,
      'ranking',
    );
  }

  public async obtenerRanking<T>(clave: string): Promise<T | null> {
    return this.obtenerJson<T>(`marketplace:ranking:${clave}`, 'ranking');
  }

  public async invalidarRanking(): Promise<void> {
    await this.eliminarPorPatron('marketplace:ranking:*', 'ranking');
  }

  public async guardarEquipoSemanal(
    clave: string,
    datos: any,
    ttlSegundos: number = 1800,
  ): Promise<void> {
    await this.guardarJson(
      `marketplace:team-of-the-week:${clave}`,
      datos,
      ttlSegundos,
      'equipo semanal',
    );
  }

  public async obtenerEquipoSemanal<T>(clave: string): Promise<T | null> {
    return this.obtenerJson<T>(
      `marketplace:team-of-the-week:${clave}`,
      'equipo semanal',
    );
  }

  public async invalidarEquipoSemanal(): Promise<void> {
    await this.eliminarPorPatron(
      'marketplace:team-of-the-week:*',
      'equipo semanal',
    );
  }
}
