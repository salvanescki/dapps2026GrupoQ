import { Cotizacion } from '../domain/cotizacion.entity';
import {
  EstrategiaId,
  EstrategiaVersion,
} from '../domain/configuracion-mercado.entity';
import { CotizacionOrmEntity } from './cotizacion.orm-entity';

export class CotizacionMapper {
  public static toDomain(orm: CotizacionOrmEntity): Cotizacion {
    if (!orm) return null;
    return Cotizacion.crearDesdeCalculo({
      id: orm.id,
      jugadorId: orm.jugadorId,
      score: Number(orm.score),
      valor: Number(orm.valor),
      estrategiaId: orm.estrategiaId as EstrategiaId,
      estrategiaVersion: orm.estrategiaVersion as EstrategiaVersion,
      sinEstadisticas: orm.sinEstadisticas,
      metricas: orm.metricas,
      fechaCotizacion: orm.fechaCotizacion,
    });
  }

  public static toOrm(domain: Cotizacion): CotizacionOrmEntity {
    if (!domain) return null;
    const orm = new CotizacionOrmEntity();
    orm.id = domain.id;
    orm.jugadorId = domain.jugadorId;
    orm.score = domain.score;
    orm.valor = domain.valor;
    orm.estrategiaId = domain.estrategiaId;
    orm.estrategiaVersion = domain.estrategiaVersion;
    orm.sinEstadisticas = domain.sinEstadisticas;
    orm.metricas = domain.metricas;
    orm.fechaCotizacion = domain.fechaCotizacion;
    return orm;
  }
}
