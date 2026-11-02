import {
  ConfiguracionMercado,
  EstrategiaId,
  EstrategiaVersion,
} from '../domain/configuracion-mercado.entity';
import { ConfiguracionMercadoOrmEntity } from './configuracion-mercado.orm-entity';

export class ConfiguracionMercadoMapper {
  public static toDomain(orm: ConfiguracionMercadoOrmEntity): ConfiguracionMercado {
    if (!orm) return null;
    return ConfiguracionMercado.crear({
      id: orm.id,
      estrategiaActivaId: orm.estrategiaActivaId as EstrategiaId,
      estrategiaActivaVersion: orm.estrategiaActivaVersion as EstrategiaVersion,
      actualizadoPor: orm.actualizadoPor,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(
    domain: ConfiguracionMercado,
  ): ConfiguracionMercadoOrmEntity {
    if (!domain) return null;
    const orm = new ConfiguracionMercadoOrmEntity();
    orm.id = domain.id;
    orm.estrategiaActivaId = domain.estrategiaActivaId;
    orm.estrategiaActivaVersion = domain.estrategiaActivaVersion;
    orm.actualizadoPor = domain.actualizadoPor;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
