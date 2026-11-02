import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';

export interface BalanceTokenProps {
  id?: string;
  usuarioId: string;
  jugadorId: string;
  cantidadDisponible?: number;
  cantidadBloqueada?: number;
  actualizadoEn?: Date;
}

export class BalanceToken {
  private readonly _id: string;
  private readonly _usuarioId: string;
  private readonly _jugadorId: string;
  private _cantidadDisponible: number;
  private _cantidadBloqueada: number;
  private _actualizadoEn: Date;

  private constructor(props: BalanceTokenProps) {
    this._id = props.id || generarId();
    this._usuarioId = props.usuarioId;
    this._jugadorId = props.jugadorId;
    this._cantidadDisponible = props.cantidadDisponible ?? 0;
    this._cantidadBloqueada = props.cantidadBloqueada ?? 0;
    this._actualizadoEn = props.actualizadoEn || new Date();

    this.validarInvariantes();
  }

  public static crear(props: BalanceTokenProps): BalanceToken {
    return new BalanceToken(props);
  }

  public validarInvariantes(): void {
    if (!this._usuarioId || this._usuarioId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del usuario es obligatorio.',
      );
    }

    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del jugador es obligatorio.',
      );
    }

    if (
      !Number.isInteger(this._cantidadDisponible) ||
      this._cantidadDisponible < 0
    ) {
      throw new ReglaDeNegocioException(
        'La cantidad disponible debe ser un número entero mayor o igual a cero.',
      );
    }

    if (
      !Number.isInteger(this._cantidadBloqueada) ||
      this._cantidadBloqueada < 0
    ) {
      throw new ReglaDeNegocioException(
        'La cantidad bloqueada debe ser un número entero mayor o igual a cero.',
      );
    }
  }

  public get cantidadTotal(): number {
    return this._cantidadDisponible + this._cantidadBloqueada;
  }

  public debitarDisponibles(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ReglaDeNegocioException(
        'La cantidad de tokens a debitar debe ser un entero positivo.',
      );
    }
    if (this._cantidadDisponible < cantidad) {
      throw new ReglaDeNegocioException(
        'Cantidad de tokens disponible insuficiente para debitar.',
      );
    }
    this._cantidadDisponible -= cantidad;
    this._actualizadoEn = new Date();
  }

  public bloquearTokens(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ReglaDeNegocioException(
        'La cantidad de tokens a bloquear debe ser un entero positivo.',
      );
    }
    if (this._cantidadDisponible < cantidad) {
      throw new ReglaDeNegocioException(
        'Tokens disponibles insuficientes para poner en custodia.',
      );
    }
    this._cantidadDisponible -= cantidad;
    this._cantidadBloqueada += cantidad;
    this._actualizadoEn = new Date();
  }

  public liberarTokens(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ReglaDeNegocioException(
        'La cantidad de tokens a liberar debe ser un entero positivo.',
      );
    }
    if (this._cantidadBloqueada < cantidad) {
      throw new ReglaDeNegocioException(
        'Tokens en custodia insuficientes para liberar.',
      );
    }
    this._cantidadBloqueada -= cantidad;
    this._cantidadDisponible += cantidad;
    this._actualizadoEn = new Date();
  }

  public debitarBloqueados(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ReglaDeNegocioException(
        'La cantidad de tokens a liquidar debe ser un entero positivo.',
      );
    }
    if (this._cantidadBloqueada < cantidad) {
      throw new ReglaDeNegocioException(
        'Tokens en custodia insuficientes para liquidar.',
      );
    }
    this._cantidadBloqueada -= cantidad;
    this._actualizadoEn = new Date();
  }

  public acreditarTokens(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ReglaDeNegocioException(
        'La cantidad de tokens a acreditar debe ser un entero positivo.',
      );
    }
    this._cantidadDisponible += cantidad;
    this._actualizadoEn = new Date();
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
  public get cantidadDisponible(): number {
    return this._cantidadDisponible;
  }
  public get cantidadBloqueada(): number {
    return this._cantidadBloqueada;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
