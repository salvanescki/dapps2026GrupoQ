import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';

export const CODIGOS_LIGA_VALIDOS = ['PL', 'PD', 'SA', 'BL1', 'FL1'] as const;
export type CodigoLigaValido = (typeof CODIGOS_LIGA_VALIDOS)[number];

export interface LigaProps {
  id?: string;
  codigo: string;
  nombre: string;
  pais: string;
  emblemaUrl?: string | null;
  activo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class Liga {
  private _id: string;
  private _codigo: string;
  private _nombre: string;
  private _pais: string;
  private _emblemaUrl: string | null;
  private _activo: boolean;
  private _creadoEn: Date;
  private _actualizadoEn: Date;

  private constructor(props: LigaProps) {
    this._id = props.id || generarId();
    this._codigo = props.codigo?.trim().toUpperCase();
    this._nombre = props.nombre?.trim();
    this._pais = props.pais?.trim();
    this._emblemaUrl = props.emblemaUrl || null;
    this._activo = props.activo !== undefined ? props.activo : true;
    this._creadoEn = props.creadoEn || new Date();
    this._actualizadoEn = props.actualizadoEn || new Date();

    this.validarInvariantes();
  }

  public static crear(props: LigaProps): Liga {
    return new Liga(props);
  }

  public validarInvariantes(): void {
    if (!this._codigo) {
      throw new ReglaDeNegocioException('El código de la liga es obligatorio.');
    }

    if (!CODIGOS_LIGA_VALIDOS.includes(this._codigo as CodigoLigaValido)) {
      throw new ReglaDeNegocioException(
        `El código de liga '${this._codigo}' no es válido. Debe ser uno de: ${CODIGOS_LIGA_VALIDOS.join(', ')}`,
      );
    }

    if (!this._nombre || this._nombre.length < 3 || this._nombre.length > 100) {
      throw new ReglaDeNegocioException(
        'El nombre de la liga es obligatorio y debe tener entre 3 y 100 caracteres.',
      );
    }

    if (!this._pais || this._pais.trim().length === 0) {
      throw new ReglaDeNegocioException('El país de la liga es obligatorio.');
    }
  }

  public desactivar(): void {
    this._activo = false;
    this._actualizadoEn = new Date();
  }

  public activar(): void {
    this._activo = true;
    this._actualizadoEn = new Date();
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get codigo(): string {
    return this._codigo;
  }
  public get nombre(): string {
    return this._nombre;
  }
  public get pais(): string {
    return this._pais;
  }
  public get emblemaUrl(): string | null {
    return this._emblemaUrl;
  }
  public get activo(): boolean {
    return this._activo;
  }
  public get creadoEn(): Date {
    return this._creadoEn;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
