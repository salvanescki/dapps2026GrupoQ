import { BalanceToken } from '../domain/balance-token.entity';
import { BalanceTokenOrmEntity } from './balance-token.orm-entity';

export class BalanceTokenMapper {
  public static toDomain(orm: BalanceTokenOrmEntity): BalanceToken {
    if (!orm) return null;
    return BalanceToken.crear({
      id: orm.id,
      usuarioId: orm.usuarioId,
      jugadorId: orm.jugadorId,
      cantidadDisponible: orm.cantidadDisponible,
      cantidadBloqueada: orm.cantidadBloqueada,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(domain: BalanceToken): BalanceTokenOrmEntity {
    if (!domain) return null;
    const orm = new BalanceTokenOrmEntity();
    orm.id = domain.id;
    orm.usuarioId = domain.usuarioId;
    orm.jugadorId = domain.jugadorId;
    orm.cantidadDisponible = domain.cantidadDisponible;
    orm.cantidadBloqueada = domain.cantidadBloqueada;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
