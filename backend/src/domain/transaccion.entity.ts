import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';
import { Dinero } from './dinero.value-object';

export type TipoMercadoTransaccion = 'PRIMARIO' | 'SECUNDARIO';

export interface TransaccionProps {
  id?: string;
  ordenId: string;
  jugadorId: string;
  compradorId: string;
  vendedorId: string;
  cantidad: number;
  precioUnitario: number | Dinero;
  montoTotal?: number | Dinero;
  tipoMercado: TipoMercadoTransaccion;
  estrategiaCotizacion: string;
  creadoEn?: Date;
}

export class Transaccion {
  private readonly _id: string;
  private readonly _ordenId: string;
  private readonly _jugadorId: string;
  private readonly _compradorId: string;
  private readonly _vendedorId: string;
  private readonly _cantidad: number;
  private readonly _precioUnitario: Dinero;
  private readonly _montoTotal: Dinero;
  private readonly _tipoMercado: TipoMercadoTransaccion;
  private readonly _estrategiaCotizacion: string;
  private readonly _creadoEn: Date;

  private constructor(props: TransaccionProps) {
    this._id = props.id || generarId();
    this._ordenId = props.ordenId;
    this._jugadorId = props.jugadorId;
    this._compradorId = props.compradorId;
    this._vendedorId = props.vendedorId;
    this._cantidad = props.cantidad;

    if (props.precioUnitario instanceof Dinero) {
      this._precioUnitario = props.precioUnitario;
    } else {
      this._precioUnitario = Dinero.desdeMonto(props.precioUnitario);
    }

    if (props.montoTotal instanceof Dinero) {
      this._montoTotal = props.montoTotal;
    } else if (props.montoTotal !== undefined) {
      this._montoTotal = Dinero.desdeMonto(props.montoTotal);
    } else {
      this._montoTotal = this._precioUnitario.multiplicarPorEntero(this._cantidad);
    }

    this._tipoMercado = props.tipoMercado;
    this._estrategiaCotizacion = props.estrategiaCotizacion?.trim();
    this._creadoEn = props.creadoEn ?? new Date();

    this.validarInvariantes();
  }

  public static crear(props: TransaccionProps): Transaccion {
    return new Transaccion(props);
  }

  public static recrear(props: TransaccionProps): Transaccion {
    return new Transaccion(props);
  }

  public validarInvariantes(): void {
    if (!this._ordenId || this._ordenId.trim().length === 0) {
      throw new ReglaDeNegocioException('El ordenId de la transacción es obligatorio.');
    }
    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException('El jugadorId de la transacción es obligatorio.');
    }
    if (!this._compradorId || this._compradorId.trim().length === 0) {
      throw new ReglaDeNegocioException('El compradorId de la transacción es obligatorio.');
    }
    if (!this._vendedorId || this._vendedorId.trim().length === 0) {
      throw new ReglaDeNegocioException('El vendedorId de la transacción es obligatorio.');
    }
    if (this._compradorId === this._vendedorId) {
      throw new ReglaDeNegocioException(
        'El comprador y el vendedor no pueden ser el mismo usuario (prohibición de wash trading).',
      );
    }
    if (!Number.isInteger(this._cantidad) || this._cantidad < 1) {
      throw new ReglaDeNegocioException('La cantidad debe ser un entero mayor o igual a 1.');
    }
    if (this._precioUnitario.centavos <= 0) {
      throw new ReglaDeNegocioException('El precioUnitario debe ser mayor a 0.00.');
    }
    const montoCalculado = this._precioUnitario.multiplicarPorEntero(this._cantidad);
    if (this._montoTotal.centavos !== montoCalculado.centavos) {
      throw new ReglaDeNegocioException(
        `El montoTotal (${this._montoTotal.aNumero()}) no coincide con cantidad * precioUnitario (${montoCalculado.aNumero()}).`,
      );
    }
    if (!this._estrategiaCotizacion || this._estrategiaCotizacion.length === 0) {
      throw new ReglaDeNegocioException('El campo estrategiaCotizacion es obligatorio en toda transacción.');
    }
  }

  public get id(): string {
    return this._id;
  }
  public get ordenId(): string {
    return this._ordenId;
  }
  public get jugadorId(): string {
    return this._jugadorId;
  }
  public get compradorId(): string {
    return this._compradorId;
  }
  public get vendedorId(): string {
    return this._vendedorId;
  }
  public get cantidad(): number {
    return this._cantidad;
  }
  public get precioUnitario(): Dinero {
    return this._precioUnitario;
  }
  public get montoTotal(): Dinero {
    return this._montoTotal;
  }
  public get tipoMercado(): TipoMercadoTransaccion {
    return this._tipoMercado;
  }
  public get estrategiaCotizacion(): string {
    return this._estrategiaCotizacion;
  }
  public get creadoEn(): Date {
    return this._creadoEn;
  }
}
