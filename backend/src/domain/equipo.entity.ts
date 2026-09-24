import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';

export interface EquipoProps {
  id?: string;
  externalId: number;
  nombre: string;
  nombreCorto?: string | null;
  tla?: string | null;
  escudoUrl?: string | null;
  ligaId: string;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class Equipo {
  private _id: string;
  private _externalId: number;
  private _nombre: string;
  private _nombreCorto: string | null;
  private _tla: string | null;
  private _escudoUrl: string | null;
  private _ligaId: string;
  private _creadoEn: Date;
  private _actualizadoEn: Date;

  private constructor(props: EquipoProps) {
    this._id = props.id || generarId();
    this._externalId = props.externalId;
    this._nombre = props.nombre?.trim();
    this._nombreCorto = props.nombreCorto ? props.nombreCorto.trim() : null;
    this._tla = props.tla ? props.tla.trim() : null;
    this._escudoUrl = props.escudoUrl || null;
    this._ligaId = props.ligaId;
    this._creadoEn = props.creadoEn || new Date();
    this._actualizadoEn = props.actualizadoEn || new Date();

    this.validarInvariantes();
  }

  public static crear(props: EquipoProps): Equipo {
    return new Equipo(props);
  }

  public validarInvariantes(): void {
    if (!this._nombre || this._nombre.length < 2) {
      throw new ReglaDeNegocioException(
        'El nombre del equipo es obligatorio y debe tener al menos 2 caracteres.',
      );
    }

    if (!Number.isInteger(this._externalId) || this._externalId <= 0) {
      throw new ReglaDeNegocioException(
        'El externalId del equipo debe ser un número entero positivo.',
      );
    }

    if (!this._ligaId || this._ligaId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El equipo debe pertenecer a una liga (ligaId es obligatorio).',
      );
    }
  }

  public perteneceALiga(ligaId: string): boolean {
    if (!ligaId) return false;
    return this._ligaId.toLowerCase() === ligaId.trim().toLowerCase();
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get externalId(): number {
    return this._externalId;
  }
  public get nombre(): string {
    return this._nombre;
  }
  public get nombreCorto(): string | null {
    return this._nombreCorto;
  }
  public get tla(): string | null {
    return this._tla;
  }
  public get escudoUrl(): string | null {
    return this._escudoUrl;
  }
  public get ligaId(): string {
    return this._ligaId;
  }
  public get creadoEn(): Date {
    return this._creadoEn;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
