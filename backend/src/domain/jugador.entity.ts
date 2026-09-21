import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { Equipo } from './equipo.entity';
import { Liga } from './liga.entity';

export type PosicionJugador =
  | 'Portero'
  | 'Defensa'
  | 'Mediocampista'
  | 'Delantero'
  | 'No Clasificado';

export const POSICIONES_VALIDAS: PosicionJugador[] = [
  'Portero',
  'Defensa',
  'Mediocampista',
  'Delantero',
  'No Clasificado',
];

export interface JugadorProps {
  id?: string;
  externalId: number;
  nombre: string;
  posicion?: PosicionJugador;
  posicionOriginal?: string | null;
  fechaNacimiento?: string | null;
  nacionalidad?: string | null;
  dorsal?: number | null;
  equipoId: string;
  ligaId: string;
  activo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
  equipo?: Equipo | null;
  liga?: Liga | null;
}

export interface CriterioFiltroJugadorProps {
  ligaCodigo?: string | null;
  equipoId?: string | null;
  posicion?: PosicionJugador | null;
  busqueda?: string | null;
  pagina?: number;
  limite?: number;
}

export class CriterioFiltroJugador {
  public readonly ligaCodigo: string | null;
  public readonly equipoId: string | null;
  public readonly posicion: PosicionJugador | null;
  public readonly busqueda: string | null;
  public readonly pagina: number;
  public readonly limite: number;

  constructor(props: CriterioFiltroJugadorProps = {}) {
    this.ligaCodigo = props.ligaCodigo ? props.ligaCodigo.trim().toUpperCase() : null;
    this.equipoId = props.equipoId ? props.equipoId.trim() : null;
    this.posicion = props.posicion ? (props.posicion.trim() as PosicionJugador) : null;
    this.busqueda = props.busqueda ? props.busqueda.trim() : null;
    this.pagina = Math.max(1, props.pagina || 1);
    this.limite = Math.min(50, Math.max(1, props.limite || 20));
  }

  public get offset(): number {
    return (this.pagina - 1) * this.limite;
  }
}

export class Jugador {
  private _id: string;
  private _externalId: number;
  private _nombre: string;
  private _posicion: PosicionJugador;
  private _posicionOriginal: string | null;
  private _fechaNacimiento: string | null;
  private _nacionalidad: string;
  private _dorsal: number | null;
  private _equipoId: string;
  private _ligaId: string;
  private _activo: boolean;
  private _creadoEn: Date;
  private _actualizadoEn: Date;
  private _equipo?: Equipo | null;
  private _liga?: Liga | null;

  private constructor(props: JugadorProps) {
    this._id = props.id || this.generarId();
    this._externalId = props.externalId;
    this._nombre = props.nombre?.trim();
    this._posicionOriginal = props.posicionOriginal?.trim() || null;
    this._posicion =
      props.posicion || Jugador.normalizarPosicion(this._posicionOriginal);
    this._fechaNacimiento = props.fechaNacimiento || null;
    this._nacionalidad = props.nacionalidad?.trim() || 'Desconocida';
    this._dorsal =
      props.dorsal !== undefined && props.dorsal !== null
        ? Number(props.dorsal)
        : null;
    this._equipoId = props.equipoId;
    this._ligaId = props.ligaId;
    this._activo = props.activo !== undefined ? props.activo : true;
    this._creadoEn = props.creadoEn || new Date();
    this._actualizadoEn = props.actualizadoEn || new Date();
    this._equipo = props.equipo || null;
    this._liga = props.liga || null;

    this.validarInvariantes();
  }

  public static crear(props: JugadorProps): Jugador {
    return new Jugador(props);
  }

  public static normalizarPosicion(
    posicionOriginal?: string | null,
  ): PosicionJugador {
    if (!posicionOriginal) return 'No Clasificado';
    const pos = posicionOriginal.toLowerCase().trim();

    if (
      pos.includes('goalkeeper') ||
      pos.includes('arquero') ||
      pos.includes('portero')
    ) {
      return 'Portero';
    }

    if (
      pos.includes('defence') ||
      pos.includes('defender') ||
      pos.includes('defensa') ||
      pos.includes('back') ||
      pos.includes('centre-back') ||
      pos.includes('left-back') ||
      pos.includes('right-back')
    ) {
      return 'Defensa';
    }

    if (
      pos.includes('midfield') ||
      pos.includes('midfielder') ||
      pos.includes('mediocampista') ||
      pos.includes('volante') ||
      pos.includes('central midfield') ||
      pos.includes('defensive midfield') ||
      pos.includes('attacking midfield')
    ) {
      return 'Mediocampista';
    }

    if (
      pos.includes('offence') ||
      pos.includes('forward') ||
      pos.includes('winger') ||
      pos.includes('striker') ||
      pos.includes('delantero') ||
      pos.includes('extremo') ||
      pos.includes('punta')
    ) {
      return 'Delantero';
    }

    return 'No Clasificado';
  }

  public validarInvariantes(): void {
    if (!this._nombre || this._nombre.length < 2 || this._nombre.length > 150) {
      throw new ReglaDeNegocioException(
        'El nombre del jugador es obligatorio y debe tener entre 2 y 150 caracteres.',
      );
    }

    if (!Number.isInteger(this._externalId) || this._externalId <= 0) {
      throw new ReglaDeNegocioException(
        'El externalId del jugador debe ser un número entero positivo.',
      );
    }

    if (!this._equipoId || this._equipoId.trim().length === 0) {
      throw new ReglaDeNegocioException('El equipoId del jugador es obligatorio.');
    }

    if (!this._ligaId || this._ligaId.trim().length === 0) {
      throw new ReglaDeNegocioException('El ligaId del jugador es obligatorio.');
    }

    if (!POSICIONES_VALIDAS.includes(this._posicion)) {
      throw new ReglaDeNegocioException(
        `La posición '${this._posicion}' no es válida.`,
      );
    }

    if (this._dorsal !== null && (this._dorsal < 1 || this._dorsal > 99)) {
      throw new ReglaDeNegocioException(
        'El dorsal del jugador debe ser un número entre 1 y 99.',
      );
    }
  }

  public actualizarEquipo(nuevoEquipoId: string, nuevaLigaId: string): void {
    if (!nuevoEquipoId || nuevoEquipoId.trim().length === 0) {
      throw new ReglaDeNegocioException('El nuevo equipoId es requerido.');
    }
    if (!nuevaLigaId || nuevaLigaId.trim().length === 0) {
      throw new ReglaDeNegocioException('La nueva ligaId es requerida.');
    }
    this._equipoId = nuevoEquipoId;
    this._ligaId = nuevaLigaId;
    this._actualizadoEn = new Date();
  }

  public coincideConFiltros(criterio: CriterioFiltroJugador): boolean {
    if (criterio.posicion && this._posicion !== criterio.posicion) {
      return false;
    }
    if (criterio.equipoId && this._equipoId !== criterio.equipoId) {
      return false;
    }
    if (criterio.busqueda) {
      const busquedaNorm = criterio.busqueda
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const nombreNorm = this._nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!nombreNorm.includes(busquedaNorm)) {
        return false;
      }
    }
    return true;
  }

  public desactivar(): void {
    this._activo = false;
    this._actualizadoEn = new Date();
  }

  public activar(): void {
    this._activo = true;
    this._actualizadoEn = new Date();
  }

  private generarId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
  public get posicion(): PosicionJugador {
    return this._posicion;
  }
  public get posicionOriginal(): string | null {
    return this._posicionOriginal;
  }
  public get fechaNacimiento(): string | null {
    return this._fechaNacimiento;
  }
  public get nacionalidad(): string {
    return this._nacionalidad;
  }
  public get dorsal(): number | null {
    return this._dorsal;
  }
  public get equipoId(): string {
    return this._equipoId;
  }
  public get ligaId(): string {
    return this._ligaId;
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
  public get equipo(): Equipo | null | undefined {
    return this._equipo;
  }
  public get liga(): Liga | null | undefined {
    return this._liga;
  }
}

