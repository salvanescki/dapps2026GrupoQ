import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';
import { Dinero } from './dinero.value-object';

export type TipoOrden = 'COMPRA' | 'VENTA';
export type TipoMercadoOrden = 'PRIMARIO' | 'SECUNDARIO';
export type EstadoOrden = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';

export interface OrdenProps {
  id?: string;
  usuarioId: string;
  jugadorId: string;
  tipo: TipoOrden;
  tipoMercado: TipoMercadoOrden;
  cantidad: number;
  cantidadRestante?: number;
  precioUnitario: number | Dinero;
  estado?: EstadoOrden;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class Orden {
  private readonly _id: string;
  private readonly _usuarioId: string;
  private readonly _jugadorId: string;
  private readonly _tipo: TipoOrden;
  private readonly _tipoMercado: TipoMercadoOrden;
  private readonly _cantidad: number;
  private _cantidadRestante: number;
  private readonly _precioUnitario: Dinero;
  private _estado: EstadoOrden;
  private readonly _creadoEn: Date;
  private _actualizadoEn: Date;

  private constructor(props: OrdenProps) {
    this._id = props.id || generarId();
    this._usuarioId = props.usuarioId;
    this._jugadorId = props.jugadorId;
    this._tipo = props.tipo;
    this._tipoMercado = props.tipoMercado;
    this._cantidad = props.cantidad;
    this._cantidadRestante =
      props.cantidadRestante !== undefined ? props.cantidadRestante : props.cantidad;

    if (props.precioUnitario instanceof Dinero) {
      this._precioUnitario = props.precioUnitario;
    } else {
      this._precioUnitario = Dinero.desdeMonto(props.precioUnitario);
    }

    this._estado = props.estado ?? (props.tipo === 'COMPRA' ? 'COMPLETADA' : 'PENDIENTE');
    this._creadoEn = props.creadoEn ?? new Date();
    this._actualizadoEn = props.actualizadoEn ?? new Date();

    this.validarInvariantes();
  }

  public static crearCompra(props: {
    id?: string;
    usuarioId: string;
    jugadorId: string;
    tipoMercado: TipoMercadoOrden;
    cantidad: number;
    precioUnitario: number | Dinero;
  }): Orden {
    return new Orden({
      ...props,
      tipo: 'COMPRA',
      cantidadRestante: 0,
      estado: 'COMPLETADA',
    });
  }

  public static crearVenta(props: {
    id?: string;
    usuarioId: string;
    jugadorId: string;
    cantidad: number;
    precioUnitario: number | Dinero;
  }): Orden {
    return new Orden({
      ...props,
      tipo: 'VENTA',
      tipoMercado: 'SECUNDARIO',
      cantidadRestante: props.cantidad,
      estado: 'PENDIENTE',
    });
  }

  public static recrear(props: OrdenProps): Orden {
    return new Orden(props);
  }

  public validarInvariantes(): void {
    if (!this._usuarioId || this._usuarioId.trim().length === 0) {
      throw new ReglaDeNegocioException('El usuarioId de la orden es obligatorio.');
    }
    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException('El jugadorId de la orden es obligatorio.');
    }
    if (!Number.isInteger(this._cantidad) || this._cantidad < 1) {
      throw new ReglaDeNegocioException('La cantidad debe ser un número entero mayor o igual a 1.');
    }
    if (
      !Number.isInteger(this._cantidadRestante) ||
      this._cantidadRestante < 0 ||
      this._cantidadRestante > this._cantidad
    ) {
      throw new ReglaDeNegocioException(
        `La cantidadRestante (${this._cantidadRestante}) debe ser un entero entre 0 y ${this._cantidad}.`,
      );
    }
    if (this._precioUnitario.centavos <= 0) {
      throw new ReglaDeNegocioException('El precioUnitario debe ser mayor a 0.00.');
    }
    if (this._tipo === 'COMPRA' && (this._estado !== 'COMPLETADA' || this._cantidadRestante !== 0)) {
      throw new ReglaDeNegocioException(
        'Las órdenes de COMPRA son de liquidación inmediata y deben crearse COMPLETADAS con cantidadRestante 0.',
      );
    }
  }

  public ejecutarParcial(cantidadEjecutada: number): void {
    if (!Number.isInteger(cantidadEjecutada) || cantidadEjecutada < 1) {
      throw new ReglaDeNegocioException('La cantidad a ejecutar debe ser un número entero mayor o igual a 1.');
    }
    if (this._tipo !== 'VENTA') {
      throw new ReglaDeNegocioException('Solo las órdenes de VENTA pueden ejecutarse en mercado secundario.');
    }
    if (this._estado !== 'PENDIENTE' && this._estado !== 'PARCIAL') {
      throw new ReglaDeNegocioException(
        `No se puede ejecutar una orden en estado ${this._estado}. Debe ser PENDIENTE o PARCIAL.`,
      );
    }
    if (cantidadEjecutada > this._cantidadRestante) {
      throw new ReglaDeNegocioException(
        `Cantidad a ejecutar (${cantidadEjecutada}) supera el remanente disponible (${this._cantidadRestante}).`,
      );
    }

    this._cantidadRestante -= cantidadEjecutada;
    this._estado = this._cantidadRestante === 0 ? 'COMPLETADA' : 'PARCIAL';
    this._actualizadoEn = new Date();
  }

  public cancelar(): void {
    if (this._tipo !== 'VENTA') {
      throw new ReglaDeNegocioException('Solo las órdenes de VENTA pueden cancelarse.');
    }
    if (this._estado !== 'PENDIENTE' && this._estado !== 'PARCIAL') {
      throw new ReglaDeNegocioException(
        `No se puede cancelar una orden en estado ${this._estado}. Debe estar PENDIENTE o PARCIAL.`,
      );
    }

    this._estado = 'CANCELADA';
    this._actualizadoEn = new Date();
  }

  public esActiva(): boolean {
    return this._estado === 'PENDIENTE' || this._estado === 'PARCIAL';
  }

  public get id(): string {
    return this._id;
  }
  public get usuarioId(): string {
    return this._usuarioId;
  }
  public get jugadorId(): string {
    return this._jugadorId;
  }
  public get tipo(): TipoOrden {
    return this._tipo;
  }
  public get tipoMercado(): TipoMercadoOrden {
    return this._tipoMercado;
  }
  public get cantidad(): number {
    return this._cantidad;
  }
  public get cantidadRestante(): number {
    return this._cantidadRestante;
  }
  public get precioUnitario(): Dinero {
    return this._precioUnitario;
  }
  public get estado(): EstadoOrden {
    return this._estado;
  }
  public get creadoEn(): Date {
    return this._creadoEn;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
