import { EjecucionScraping } from '../domain/ejecucion-scraping.entity';
import { EjecucionScrapingOrmEntity } from './ejecucion-scraping.orm-entity';

export class EjecucionScrapingMapper {
  public static toDomain(orm: EjecucionScrapingOrmEntity): EjecucionScraping | null {
    if (!orm) return null;
    return EjecucionScraping.reconstituir({
      id: orm.id,
      inicio: orm.inicio,
      fin: orm.fin,
      jugadoresProcesados: orm.jugadoresProcesados,
      errores: orm.errores,
      estado: orm.estado,
      detalle: Array.isArray(orm.detalle) ? orm.detalle : [],
    });
  }

  public static toOrm(domain: EjecucionScraping): EjecucionScrapingOrmEntity | null {
    if (!domain) return null;
    const orm = new EjecucionScrapingOrmEntity();
    orm.id = domain.id;
    orm.inicio = domain.inicio;
    orm.fin = domain.fin;
    orm.jugadoresProcesados = domain.jugadoresProcesados;
    orm.errores = domain.errores;
    orm.estado = domain.estado;
    orm.detalle = domain.detalle;
    return orm;
  }
}
