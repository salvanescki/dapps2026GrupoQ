import { PosicionJugador } from './jugador.entity';
import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';

export interface MiembroEquipoSemanalProps {
  id?: string;
  equipoSemanalId: string;
  jugadorId: string;
  nombre: string;
  equipoNombre: string;
  posicion: PosicionJugador;
  cotizacion: number;
  score: number;
  orden: number;
}

export class MiembroEquipoSemanal {
  private readonly _id: string;
  private readonly _equipoSemanalId: string;
  private readonly _jugadorId: string;
  private readonly _nombre: string;
  private readonly _equipoNombre: string;
  private readonly _posicion: PosicionJugador;
  private readonly _cotizacion: number;
  private readonly _score: number;
  private readonly _orden: number;

  private constructor(props: MiembroEquipoSemanalProps) {
    this._id = props.id || generarId();
    this._equipoSemanalId = props.equipoSemanalId;
    this._jugadorId = props.jugadorId;
    this._nombre = props.nombre;
    this._equipoNombre = props.equipoNombre;
    this._posicion = props.posicion;
    this._cotizacion = props.cotizacion;
    this._score = props.score;
    this._orden = props.orden;

    this.validarInvariantes();
  }

  public static crear(props: MiembroEquipoSemanalProps): MiembroEquipoSemanal {
    return new MiembroEquipoSemanal(props);
  }

  private validarInvariantes(): void {
    if (!this._equipoSemanalId || this._equipoSemanalId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del equipo semanal es obligatorio para el miembro.',
      );
    }

    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del jugador es obligatorio para el miembro.',
      );
    }

    if (!this._nombre || this._nombre.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El nombre del jugador no puede estar vacío.',
      );
    }

    if (!this._equipoNombre || this._equipoNombre.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El nombre del equipo del jugador no puede estar vacío.',
      );
    }

    const posicionesValidas: PosicionJugador[] = [
      'Portero',
      'Defensa',
      'Mediocampista',
      'Delantero',
    ];
    if (!posicionesValidas.includes(this._posicion)) {
      throw new ReglaDeNegocioException(
        `La posición táctica '${this._posicion}' no es válida para el Equipo de la Semana.`,
      );
    }

    if (
      typeof this._cotizacion !== 'number' ||
      isNaN(this._cotizacion) ||
      this._cotizacion < 1.0
    ) {
      throw new ReglaDeNegocioException(
        `La cotización del jugador debe ser mayor o igual a 1.00. Valor recibido: ${this._cotizacion}`,
      );
    }

    if (
      typeof this._score !== 'number' ||
      isNaN(this._score) ||
      this._score < 0 ||
      this._score > 1
    ) {
      throw new ReglaDeNegocioException(
        `El score del jugador debe estar entre 0.0000 y 1.0000. Valor recibido: ${this._score}`,
      );
    }

    if (
      typeof this._orden !== 'number' ||
      !Number.isInteger(this._orden) ||
      this._orden < 1 ||
      this._orden > 11
    ) {
      throw new ReglaDeNegocioException(
        `El orden táctico del jugador debe ser un entero entre 1 y 11. Valor recibido: ${this._orden}`,
      );
    }
  }

  public get id(): string {
    return this._id;
  }

  public get equipoSemanalId(): string {
    return this._equipoSemanalId;
  }

  public get jugadorId(): string {
    return this._jugadorId;
  }

  public get nombre(): string {
    return this._nombre;
  }

  public get equipoNombre(): string {
    return this._equipoNombre;
  }

  public get posicion(): PosicionJugador {
    return this._posicion;
  }

  public get cotizacion(): number {
    return this._cotizacion;
  }

  public get score(): number {
    return this._score;
  }

  public get orden(): number {
    return this._orden;
  }
}

