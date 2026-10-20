import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';
import { generarId } from '../../common/utils/generar-id';

export interface EstadisticaJugadorProps {
  id?: string;
  jugadorId: string;
  temporada: string;
  liga: string;
  fuente?: string;
  fechaActualizacion?: Date;
  partidosJugados: number;
  minutosJugados: number;
  goles: number;
  asistencias: number;
  tirosPorPartido?: number | null;
  precisionPase?: number | null;
  duelosAereosGanadosPorPartido?: number | null;
  rating?: number | null;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  regatesCompletadosPorPartido?: number | null;
  pasesClavePorPartido?: number | null;
  xgPorPartido?: number | null;
  xaPorPartido?: number | null;
  grandesOcasionesPorPartido?: number | null;
  entradasPorPartido?: number | null;
  intercepccionesPorPartido?: number | null;
  despejesPorPartido?: number | null;
  pasesPorPartido?: number | null;
  centrosPorPartido?: number | null;
  atajadas?: number | null;
  golesRecibidos?: number | null;
  porcentajeAtajadas?: number | null;
  erroresQueGeneraronGol?: number | null;
  autogoles?: number | null;
}

export class EstadisticaJugador {
  private readonly _id: string;
  private readonly _jugadorId: string;
  private readonly _temporada: string;
  private readonly _liga: string;
  private readonly _fuente: string;
  private _fechaActualizacion: Date;
  private _partidosJugados: number;
  private _minutosJugados: number;
  private _goles: number;
  private _asistencias: number;
  private _tirosPorPartido: number | null;
  private _precisionPase: number | null;
  private _duelosAereosGanadosPorPartido: number | null;
  private _rating: number | null;
  private _tarjetasAmarillas: number;
  private _tarjetasRojas: number;
  private _regatesCompletadosPorPartido: number | null;
  private _pasesClavePorPartido: number | null;
  private _xgPorPartido: number | null;
  private _xaPorPartido: number | null;
  private _grandesOcasionesPorPartido: number | null;
  private _entradasPorPartido: number | null;
  private _intercepccionesPorPartido: number | null;
  private _despejesPorPartido: number | null;
  private _pasesPorPartido: number | null;
  private _centrosPorPartido: number | null;
  private _atajadas: number | null;
  private _golesRecibidos: number | null;
  private _porcentajeAtajadas: number | null;
  private _erroresQueGeneraronGol: number | null;
  private _autogoles: number | null;

  private constructor(props: EstadisticaJugadorProps) {
    this._id = props.id || generarId();
    this._jugadorId = props.jugadorId;
    this._temporada = props.temporada;
    this._liga = props.liga;
    this._fuente = props.fuente?.trim() || 'whoscored';
    this._fechaActualizacion = props.fechaActualizacion || new Date();
    this._partidosJugados = props.partidosJugados ?? 0;
    this._minutosJugados = props.minutosJugados ?? 0;
    this._goles = props.goles ?? 0;
    this._asistencias = props.asistencias ?? 0;
    this._tirosPorPartido = props.tirosPorPartido ?? null;
    this._precisionPase = props.precisionPase ?? null;
    this._duelosAereosGanadosPorPartido = props.duelosAereosGanadosPorPartido ?? null;
    this._rating = props.rating ?? null;
    this._tarjetasAmarillas = props.tarjetasAmarillas ?? 0;
    this._tarjetasRojas = props.tarjetasRojas ?? 0;
    this._regatesCompletadosPorPartido = props.regatesCompletadosPorPartido ?? null;
    this._pasesClavePorPartido = props.pasesClavePorPartido ?? null;
    this._xgPorPartido = props.xgPorPartido ?? null;
    this._xaPorPartido = props.xaPorPartido ?? null;
    this._grandesOcasionesPorPartido = props.grandesOcasionesPorPartido ?? null;
    this._entradasPorPartido = props.entradasPorPartido ?? null;
    this._intercepccionesPorPartido = props.intercepccionesPorPartido ?? null;
    this._despejesPorPartido = props.despejesPorPartido ?? null;
    this._pasesPorPartido = props.pasesPorPartido ?? null;
    this._centrosPorPartido = props.centrosPorPartido ?? null;
    this._atajadas = props.atajadas ?? null;
    this._golesRecibidos = props.golesRecibidos ?? null;
    this._porcentajeAtajadas = props.porcentajeAtajadas ?? null;
    this._erroresQueGeneraronGol = props.erroresQueGeneraronGol ?? null;
    this._autogoles = props.autogoles ?? null;

    this.validarInvariantes();
  }

  public static crear(props: EstadisticaJugadorProps): EstadisticaJugador {
    return new EstadisticaJugador(props);
  }

  public validarInvariantes(): void {
    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException('El jugadorId es obligatorio.');
    }

    if (!this._temporada || this._temporada.trim().length === 0) {
      throw new ReglaDeNegocioException('La temporada es obligatoria.');
    }

    if (!this._liga || this._liga.trim().length === 0) {
      throw new ReglaDeNegocioException('La liga es obligatoria.');
    }

    if (this._goles < 0) {
      throw new ReglaDeNegocioException('La cantidad de goles no puede ser negativa.');
    }

    if (this._asistencias < 0) {
      throw new ReglaDeNegocioException('La cantidad de asistencias no puede ser negativa.');
    }

    if (this._partidosJugados < 0) {
      throw new ReglaDeNegocioException('Los partidos jugados no pueden ser negativos.');
    }

    if (this._minutosJugados < 0) {
      throw new ReglaDeNegocioException('Los minutos jugados no pueden ser negativos.');
    }

    if (this._tarjetasAmarillas < 0 || this._tarjetasRojas < 0) {
      throw new ReglaDeNegocioException('Las tarjetas no pueden ser negativas.');
    }

    if (this._rating !== null && (this._rating < 0 || this._rating > 10)) {
      throw new ReglaDeNegocioException('El rating debe encontrarse en el rango [0, 10].');
    }

    if (this._precisionPase !== null && (this._precisionPase < 0 || this._precisionPase > 100)) {
      throw new ReglaDeNegocioException('La precisión de pase debe encontrarse en el rango [0, 100].');
    }

    if (this._porcentajeAtajadas !== null && (this._porcentajeAtajadas < 0 || this._porcentajeAtajadas > 100)) {
      throw new ReglaDeNegocioException('El porcentaje de atajadas debe encontrarse en el rango [0, 100].');
    }
  }

  public actualizarEstadisticas(props: Partial<EstadisticaJugadorProps>): void {
    if (props.partidosJugados !== undefined) this._partidosJugados = props.partidosJugados;
    if (props.minutosJugados !== undefined) this._minutosJugados = props.minutosJugados;
    if (props.goles !== undefined) this._goles = props.goles;
    if (props.asistencias !== undefined) this._asistencias = props.asistencias;
    if (props.tirosPorPartido !== undefined) this._tirosPorPartido = props.tirosPorPartido;
    if (props.precisionPase !== undefined) this._precisionPase = props.precisionPase;
    if (props.duelosAereosGanadosPorPartido !== undefined) this._duelosAereosGanadosPorPartido = props.duelosAereosGanadosPorPartido;
    if (props.rating !== undefined) this._rating = props.rating;
    if (props.tarjetasAmarillas !== undefined) this._tarjetasAmarillas = props.tarjetasAmarillas;
    if (props.tarjetasRojas !== undefined) this._tarjetasRojas = props.tarjetasRojas;
    if (props.regatesCompletadosPorPartido !== undefined) this._regatesCompletadosPorPartido = props.regatesCompletadosPorPartido;
    if (props.pasesClavePorPartido !== undefined) this._pasesClavePorPartido = props.pasesClavePorPartido;
    if (props.xgPorPartido !== undefined) this._xgPorPartido = props.xgPorPartido;
    if (props.xaPorPartido !== undefined) this._xaPorPartido = props.xaPorPartido;
    if (props.grandesOcasionesPorPartido !== undefined) this._grandesOcasionesPorPartido = props.grandesOcasionesPorPartido;
    if (props.entradasPorPartido !== undefined) this._entradasPorPartido = props.entradasPorPartido;
    if (props.intercepccionesPorPartido !== undefined) this._intercepccionesPorPartido = props.intercepccionesPorPartido;
    if (props.despejesPorPartido !== undefined) this._despejesPorPartido = props.despejesPorPartido;
    if (props.pasesPorPartido !== undefined) this._pasesPorPartido = props.pasesPorPartido;
    if (props.centrosPorPartido !== undefined) this._centrosPorPartido = props.centrosPorPartido;
    if (props.atajadas !== undefined) this._atajadas = props.atajadas;
    if (props.golesRecibidos !== undefined) this._golesRecibidos = props.golesRecibidos;
    if (props.porcentajeAtajadas !== undefined) this._porcentajeAtajadas = props.porcentajeAtajadas;
    if (props.erroresQueGeneraronGol !== undefined) this._erroresQueGeneraronGol = props.erroresQueGeneraronGol;
    if (props.autogoles !== undefined) this._autogoles = props.autogoles;
    this._fechaActualizacion = props.fechaActualizacion || new Date();

    this.validarInvariantes();
  }

  // Getters
  public get id(): string { return this._id; }
  public get jugadorId(): string { return this._jugadorId; }
  public get temporada(): string { return this._temporada; }
  public get liga(): string { return this._liga; }
  public get fuente(): string { return this._fuente; }
  public get fechaActualizacion(): Date { return this._fechaActualizacion; }
  public get partidosJugados(): number { return this._partidosJugados; }
  public get minutosJugados(): number { return this._minutosJugados; }
  public get goles(): number { return this._goles; }
  public get asistencias(): number { return this._asistencias; }
  public get tirosPorPartido(): number | null { return this._tirosPorPartido; }
  public get precisionPase(): number | null { return this._precisionPase; }
  public get duelosAereosGanadosPorPartido(): number | null { return this._duelosAereosGanadosPorPartido; }
  public get rating(): number | null { return this._rating; }
  public get tarjetasAmarillas(): number { return this._tarjetasAmarillas; }
  public get tarjetasRojas(): number { return this._tarjetasRojas; }
  public get regatesCompletadosPorPartido(): number | null { return this._regatesCompletadosPorPartido; }
  public get pasesClavePorPartido(): number | null { return this._pasesClavePorPartido; }
  public get xgPorPartido(): number | null { return this._xgPorPartido; }
  public get xaPorPartido(): number | null { return this._xaPorPartido; }
  public get grandesOcasionesPorPartido(): number | null { return this._grandesOcasionesPorPartido; }
  public get entradasPorPartido(): number | null { return this._entradasPorPartido; }
  public get intercepccionesPorPartido(): number | null { return this._intercepccionesPorPartido; }
  public get despejesPorPartido(): number | null { return this._despejesPorPartido; }
  public get pasesPorPartido(): number | null { return this._pasesPorPartido; }
  public get centrosPorPartido(): number | null { return this._centrosPorPartido; }
  public get atajadas(): number | null { return this._atajadas; }
  public get golesRecibidos(): number | null { return this._golesRecibidos; }
  public get porcentajeAtajadas(): number | null { return this._porcentajeAtajadas; }
  public get erroresQueGeneraronGol(): number | null { return this._erroresQueGeneraronGol; }
  public get autogoles(): number | null { return this._autogoles; }
}
