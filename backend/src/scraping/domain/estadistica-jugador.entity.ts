import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';
import { generarId } from '../../common/utils/generar-id';

export const CAMPOS_CONTADORES_ESTADISTICOS = [
  'partidosJugados',
  'minutosJugados',
  'goles',
  'asistencias',
  'tarjetasAmarillas',
  'tarjetasRojas',
] as const;

export const CAMPOS_METRICAS_OPCIONALES = [
  'tirosPorPartido',
  'precisionPase',
  'duelosAereosGanadosPorPartido',
  'rating',
  'regatesCompletadosPorPartido',
  'pasesClavePorPartido',
  'xgPorPartido',
  'xaPorPartido',
  'grandesOcasionesPorPartido',
  'entradasPorPartido',
  'intercepccionesPorPartido',
  'despejesPorPartido',
  'pasesPorPartido',
  'centrosPorPartido',
  'atajadas',
  'golesRecibidos',
  'porcentajeAtajadas',
  'erroresQueGeneraronGol',
  'autogoles',
] as const;

const CAMPOS_ACTUALIZABLES = [
  ...CAMPOS_CONTADORES_ESTADISTICOS,
  ...CAMPOS_METRICAS_OPCIONALES,
] as const;

export type CampoContadorEstadistico =
  (typeof CAMPOS_CONTADORES_ESTADISTICOS)[number];
export type CampoMetricaOpcional = (typeof CAMPOS_METRICAS_OPCIONALES)[number];

export type MetricasEstadisticasJugador = Partial<
  Record<CampoContadorEstadistico, number> &
    Record<CampoMetricaOpcional, number | null>
>;

export interface EstadisticaJugadorProps extends MetricasEstadisticasJugador {
  id?: string;
  jugadorId: string;
  temporada: string;
  liga: string;
  competencia?: string | null;
  etapa?: string | null;
  fuente?: string;
  fechaActualizacion?: Date;
}

function estaVacio(valor: string | null | undefined): boolean {
  return !valor || valor.trim().length === 0;
}

function excedeLongitud(valor: string | null | undefined, maximo: number): boolean {
  return Boolean(valor) && (valor as string).length > maximo;
}

function fueraDeRango(valor: number | null, minimo: number, maximo: number): boolean {
  return valor !== null && (valor < minimo || valor > maximo);
}

export class EstadisticaJugador {
  private readonly _id: string;
  private readonly _jugadorId: string;
  private readonly _temporada: string;
  private readonly _liga: string;
  private _competencia: string | null;
  private _etapa: string | null;
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
    this._competencia = props.competencia?.trim() || null;
    this._etapa = props.etapa?.trim() || null;
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
    const reglas: Array<[boolean, string]> = [
      [estaVacio(this._jugadorId), 'El jugadorId es obligatorio.'],
      [estaVacio(this._temporada), 'La temporada es obligatoria.'],
      [estaVacio(this._liga), 'La liga es obligatoria.'],
      [
        excedeLongitud(this._competencia, 100),
        'La competencia no puede superar los 100 caracteres.',
      ],
      [
        excedeLongitud(this._etapa, 50),
        'La etapa no puede superar los 50 caracteres.',
      ],
      [this._goles < 0, 'La cantidad de goles no puede ser negativa.'],
      [this._asistencias < 0, 'La cantidad de asistencias no puede ser negativa.'],
      [this._partidosJugados < 0, 'Los partidos jugados no pueden ser negativos.'],
      [this._minutosJugados < 0, 'Los minutos jugados no pueden ser negativos.'],
      [
        this._tarjetasAmarillas < 0 || this._tarjetasRojas < 0,
        'Las tarjetas no pueden ser negativas.',
      ],
      [
        fueraDeRango(this._rating, 0, 10),
        'El rating debe encontrarse en el rango [0, 10].',
      ],
      [
        fueraDeRango(this._precisionPase, 0, 100),
        'La precisión de pase debe encontrarse en el rango [0, 100].',
      ],
      [
        fueraDeRango(this._porcentajeAtajadas, 0, 100),
        'El porcentaje de atajadas debe encontrarse en el rango [0, 100].',
      ],
    ];

    const violada = reglas.find(([incumple]) => incumple);
    if (violada) {
      throw new ReglaDeNegocioException(violada[1]);
    }
  }

  public actualizarEstadisticas(props: Partial<EstadisticaJugadorProps>): void {
    const destino = this as unknown as Record<string, unknown>;
    for (const campo of CAMPOS_ACTUALIZABLES) {
      const valor = props[campo];
      if (valor !== undefined) {
        destino[`_${campo}`] = valor;
      }
    }
    if (props.competencia !== undefined) {
      this._competencia = props.competencia?.trim() || null;
    }
    if (props.etapa !== undefined) {
      this._etapa = props.etapa?.trim() || null;
    }
    this._fechaActualizacion = props.fechaActualizacion || new Date();

    this.validarInvariantes();
  }

  // Getters
  public get id(): string { return this._id; }
  public get jugadorId(): string { return this._jugadorId; }
  public get temporada(): string { return this._temporada; }
  public get liga(): string { return this._liga; }
  public get competencia(): string | null { return this._competencia; }
  public get etapa(): string | null { return this._etapa; }
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
