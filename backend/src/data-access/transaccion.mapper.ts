import { Transaccion } from '../domain/transaccion.entity';
import { TransaccionOrmEntity } from './transaccion.orm-entity';
import { Dinero } from '../domain/dinero.value-object';

export class TransaccionMapper {
  public static toDomain(orm: TransaccionOrmEntity): Transaccion {
    return Transaccion.recrear({
      id: orm.id,
      ordenId: orm.ordenId,
      jugadorId: orm.jugadorId,
      compradorId: orm.compradorId,
      vendedorId: orm.vendedorId,
      cantidad: orm.cantidad,
      precioUnitario: Dinero.desdeMonto(Number(orm.precioUnitario)),
      montoTotal: Dinero.desdeMonto(Number(orm.montoTotal)),
      tipoMercado: orm.tipoMercado as any,
      estrategiaCotizacion: orm.estrategiaCotizacion,
      creadoEn: orm.creadoEn,
    });
  }

  public static toOrm(domain: Transaccion): TransaccionOrmEntity {
    const orm = new TransaccionOrmEntity();
    orm.id = domain.id;
    orm.ordenId = domain.ordenId;
    orm.jugadorId = domain.jugadorId;
    orm.compradorId = domain.compradorId;
    orm.vendedorId = domain.vendedorId;
    orm.cantidad = domain.cantidad;
    orm.precioUnitario = domain.precioUnitario.aNumero().toFixed(2);
    orm.montoTotal = domain.montoTotal.aNumero().toFixed(2);
    orm.tipoMercado = domain.tipoMercado;
    orm.estrategiaCotizacion = domain.estrategiaCotizacion;
    orm.creadoEn = domain.creadoEn;
    return orm;
  }
}
