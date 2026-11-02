import { Orden } from '../domain/orden.entity';
import { OrdenOrmEntity } from './orden.orm-entity';
import { Dinero } from '../domain/dinero.value-object';

export class OrdenMapper {
  public static toDomain(orm: OrdenOrmEntity): Orden {
    return Orden.recrear({
      id: orm.id,
      usuarioId: orm.usuarioId,
      jugadorId: orm.jugadorId,
      tipo: orm.tipo as any,
      tipoMercado: orm.tipoMercado as any,
      cantidad: orm.cantidad,
      cantidadRestante: orm.cantidadRestante,
      precioUnitario: Dinero.desdeMonto(Number(orm.precioUnitario)),
      estado: orm.estado as any,
      creadoEn: orm.creadoEn,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(domain: Orden): OrdenOrmEntity {
    const orm = new OrdenOrmEntity();
    orm.id = domain.id;
    orm.usuarioId = domain.usuarioId;
    orm.jugadorId = domain.jugadorId;
    orm.tipo = domain.tipo;
    orm.tipoMercado = domain.tipoMercado;
    orm.cantidad = domain.cantidad;
    orm.cantidadRestante = domain.cantidadRestante;
    orm.precioUnitario = domain.precioUnitario.aNumero().toFixed(2);
    orm.estado = domain.estado;
    orm.creadoEn = domain.creadoEn;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
