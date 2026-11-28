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

export type CampoContadorEstadistico =
  (typeof CAMPOS_CONTADORES_ESTADISTICOS)[number];
export type CampoMetricaOpcional = (typeof CAMPOS_METRICAS_OPCIONALES)[number];

type EstadoMetricasEstadisticas = Record<CampoContadorEstadistico, number> &
  Record<CampoMetricaOpcional, number | null>;

export type MetricasEstadisticasJugador = Partial<EstadoMetricasEstadisticas>;

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
  private readonly _metricas: EstadoMetricasEstadisticas;

  private constructor(props: EstadisticaJugadorProps) {
    this._id = props.id || generarId();
    this._jugadorId = props.jugadorId;
    this._temporada = props.temporada;
    this._liga = props.liga;
    this._competencia = props.competencia?.trim() || null;
    this._etapa = props.etapa?.trim() || null;
    this._fuente = props.fuente?.trim() || 'whoscored';
    this._fechaActualizacion = props.fechaActualizacion || new Date();
    this._metricas = {
      partidosJugados: props.partidosJugados ?? 0,
      minutosJugados: props.minutosJugados ?? 0,
      goles: props.goles ?? 0,
      asistencias: props.asistencias ?? 0,
      tarjetasAmarillas: props.tarjetasAmarillas ?? 0,
      tarjetasRojas: props.tarjetasRojas ?? 0,
      tirosPorPartido: props.tirosPorPartido ?? null,
      precisionPase: props.precisionPase ?? null,
      duelosAereosGanadosPorPartido: props.duelosAereosGanadosPorPartido ?? null,
      rating: props.rating ?? null,
      regatesCompletadosPorPartido: props.regatesCompletadosPorPartido ?? null,
      pasesClavePorPartido: props.pasesClavePorPartido ?? null,
      xgPorPartido: props.xgPorPartido ?? null,
      xaPorPartido: props.xaPorPartido ?? null,
      grandesOcasionesPorPartido: props.grandesOcasionesPorPartido ?? null,
      entradasPorPartido: props.entradasPorPartido ?? null,
      intercepccionesPorPartido: props.intercepccionesPorPartido ?? null,
      despejesPorPartido: props.despejesPorPartido ?? null,
      pasesPorPartido: props.pasesPorPartido ?? null,
      centrosPorPartido: props.centrosPorPartido ?? null,
      atajadas: props.atajadas ?? null,
      golesRecibidos: props.golesRecibidos ?? null,
      porcentajeAtajadas: props.porcentajeAtajadas ?? null,
      erroresQueGeneraronGol: props.erroresQueGeneraronGol ?? null,
      autogoles: props.autogoles ?? null,
    };

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
      [this._metricas.goles < 0, 'La cantidad de goles no puede ser negativa.'],
      [
        this._metricas.asistencias < 0,
        'La cantidad de asistencias no puede ser negativa.',
      ],
      [
        this._metricas.partidosJugados < 0,
        'Los partidos jugados no pueden ser negativos.',
      ],
      [
        this._metricas.minutosJugados < 0,
        'Los minutos jugados no pueden ser negativos.',
      ],
      [
        this._metricas.tarjetasAmarillas < 0 || this._metricas.tarjetasRojas < 0,
        'Las tarjetas no pueden ser negativas.',
      ],
      [
        fueraDeRango(this._metricas.rating, 0, 10),
        'El rating debe encontrarse en el rango [0, 10].',
      ],
      [
        fueraDeRango(this._metricas.precisionPase, 0, 100),
        'La precisión de pase debe encontrarse en el rango [0, 100].',
      ],
      [
        fueraDeRango(this._metricas.porcentajeAtajadas, 0, 100),
        'El porcentaje de atajadas debe encontrarse en el rango [0, 100].',
      ],
    ];

    const violada = reglas.find(([incumple]) => incumple);
    if (violada) {
      throw new ReglaDeNegocioException(violada[1]);
    }
  }

  public actualizarEstadisticas(props: Partial<EstadisticaJugadorProps>): void {
    for (const campo of CAMPOS_CONTADORES_ESTADISTICOS) {
      const valor = props[campo];
      if (valor !== undefined) {
        this._metricas[campo] = valor;
      }
    }
    for (const campo of CAMPOS_METRICAS_OPCIONALES) {
      const valor = props[campo];
      if (valor !== undefined) {
        this._metricas[campo] = valor;
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
  public get partidosJugados(): number { return this._metricas.partidosJugados; }
  public get minutosJugados(): number { return this._metricas.minutosJugados; }
  public get goles(): number { return this._metricas.goles; }
  public get asistencias(): number { return this._metricas.asistencias; }
  public get tirosPorPartido(): number | null { return this._metricas.tirosPorPartido; }
  public get precisionPase(): number | null { return this._metricas.precisionPase; }
  public get duelosAereosGanadosPorPartido(): number | null { return this._metricas.duelosAereosGanadosPorPartido; }
  public get rating(): number | null { return this._metricas.rating; }
  public get tarjetasAmarillas(): number { return this._metricas.tarjetasAmarillas; }
  public get tarjetasRojas(): number { return this._metricas.tarjetasRojas; }
  public get regatesCompletadosPorPartido(): number | null { return this._metricas.regatesCompletadosPorPartido; }
  public get pasesClavePorPartido(): number | null { return this._metricas.pasesClavePorPartido; }
  public get xgPorPartido(): number | null { return this._metricas.xgPorPartido; }
  public get xaPorPartido(): number | null { return this._metricas.xaPorPartido; }
  public get grandesOcasionesPorPartido(): number | null { return this._metricas.grandesOcasionesPorPartido; }
  public get entradasPorPartido(): number | null { return this._metricas.entradasPorPartido; }
  public get intercepccionesPorPartido(): number | null { return this._metricas.intercepccionesPorPartido; }
  public get despejesPorPartido(): number | null { return this._metricas.despejesPorPartido; }
  public get pasesPorPartido(): number | null { return this._metricas.pasesPorPartido; }
  public get centrosPorPartido(): number | null { return this._metricas.centrosPorPartido; }
  public get atajadas(): number | null { return this._metricas.atajadas; }
  public get golesRecibidos(): number | null { return this._metricas.golesRecibidos; }
  public get porcentajeAtajadas(): number | null { return this._metricas.porcentajeAtajadas; }
  public get erroresQueGeneraronGol(): number | null { return this._metricas.erroresQueGeneraronGol; }
  public get autogoles(): number | null { return this._metricas.autogoles; }
}
