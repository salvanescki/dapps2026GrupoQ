import { EstadisticaJugador } from '../../scraping/domain/estadistica-jugador.entity';
import { SnapshotMetricasNormalizadas } from '../cotizacion.entity';

export interface MetricasNormalizadasMap {
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  dribbles: number;
  tackles: number;
  interceptions: number;
  saves: number;
  savePercentage: number;
  rating: number;
}

export class MetricasJugadorParaCotizacion {
  public static readonly LIMITES_MAXIMOS: Readonly<Record<keyof MetricasNormalizadasMap, number>> = {
    goals: 30,
    assists: 20,
    shots: 5.0,
    keyPasses: 4.0,
    dribbles: 4.0,
    tackles: 5.0,
    interceptions: 4.0,
    saves: 120.0,
    savePercentage: 100.0,
    rating: 10.0,
  };

  private readonly _sinEstadisticas: boolean;
  private readonly _metricasNormalizadas: MetricasNormalizadasMap | null;

  private constructor(
    sinEstadisticas: boolean,
    metricasNormalizadas: MetricasNormalizadasMap | null,
  ) {
    this._sinEstadisticas = sinEstadisticas;
    this._metricasNormalizadas = metricasNormalizadas;
  }

  public static vacio(): MetricasJugadorParaCotizacion {
    return new MetricasJugadorParaCotizacion(true, null);
  }

  public static desdeMetricasDirectas(
    metricas: MetricasNormalizadasMap,
  ): MetricasJugadorParaCotizacion {
    const clamped: MetricasNormalizadasMap = {
      goals: this.clamp(metricas.goals),
      assists: this.clamp(metricas.assists),
      shots: this.clamp(metricas.shots),
      keyPasses: this.clamp(metricas.keyPasses),
      dribbles: this.clamp(metricas.dribbles),
      tackles: this.clamp(metricas.tackles),
      interceptions: this.clamp(metricas.interceptions),
      saves: this.clamp(metricas.saves),
      savePercentage: this.clamp(metricas.savePercentage),
      rating: this.clamp(metricas.rating),
    };
    return new MetricasJugadorParaCotizacion(false, clamped);
  }

  public static desdeEstadisticas(
    estadisticas: EstadisticaJugador[],
  ): MetricasJugadorParaCotizacion {
    if (!estadisticas || estadisticas.length === 0) {
      return MetricasJugadorParaCotizacion.vacio();
    }

    const conPartidos = estadisticas.filter((e) => (e.partidosJugados ?? 0) > 0);
    if (conPartidos.length === 0) {
      return MetricasJugadorParaCotizacion.vacio();
    }

    // Ordenar temporadas descendentemente para elegir la más reciente
    const temporadasOrdenadas = Array.from(
      new Set(conPartidos.map((e) => e.temporada)),
    ).sort((a, b) => b.localeCompare(a));

    const temporadaReciente = temporadasOrdenadas[0];
    const filasTemporada = conPartidos.filter(
      (e) => e.temporada === temporadaReciente,
    );

    const totalPartidos = filasTemporada.reduce(
      (acc, e) => acc + (e.partidosJugados ?? 0),
      0,
    );

    if (totalPartidos === 0) {
      return MetricasJugadorParaCotizacion.vacio();
    }

    // Acumulados totales
    const golesTotal = filasTemporada.reduce(
      (acc, e) => acc + (e.goles ?? 0),
      0,
    );
    const asistenciasTotal = filasTemporada.reduce(
      (acc, e) => acc + (e.asistencias ?? 0),
      0,
    );
    const atajadasTotal = filasTemporada.reduce(
      (acc, e) => acc + (e.atajadas ?? 0),
      0,
    );

    // Métricas ponderadas por partidos jugados
    const tirosPonderados =
      filasTemporada.reduce(
        (acc, e) => acc + (e.tirosPorPartido ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    const pasesClavePonderados =
      filasTemporada.reduce(
        (acc, e) => acc + (e.pasesClavePorPartido ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    const regatesPonderados =
      filasTemporada.reduce(
        (acc, e) =>
          acc + (e.regatesCompletadosPorPartido ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    const entradasPonderadas =
      filasTemporada.reduce(
        (acc, e) =>
          acc + (e.entradasPorPartido ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    // Proyectar el getter preexistente intercepccionesPorPartido hacia 'interceptions'
    const intercepcionesPonderadas =
      filasTemporada.reduce(
        (acc, e) =>
          acc + (e.intercepccionesPorPartido ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    const porcentajeAtajadasPonderado =
      filasTemporada.reduce(
        (acc, e) =>
          acc + (e.porcentajeAtajadas ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    const ratingPonderado =
      filasTemporada.reduce(
        (acc, e) => acc + (e.rating ?? 0) * (e.partidosJugados ?? 0),
        0,
      ) / totalPartidos;

    // Normalización con clamp [0, 1] respecto a los límites fijos
    const normalizadas: MetricasNormalizadasMap = {
      goals: this.normalizarYClampear(
        golesTotal,
        this.LIMITES_MAXIMOS.goals,
      ),
      assists: this.normalizarYClampear(
        asistenciasTotal,
        this.LIMITES_MAXIMOS.assists,
      ),
      shots: this.normalizarYClampear(
        tirosPonderados,
        this.LIMITES_MAXIMOS.shots,
      ),
      keyPasses: this.normalizarYClampear(
        pasesClavePonderados,
        this.LIMITES_MAXIMOS.keyPasses,
      ),
      dribbles: this.normalizarYClampear(
        regatesPonderados,
        this.LIMITES_MAXIMOS.dribbles,
      ),
      tackles: this.normalizarYClampear(
        entradasPonderadas,
        this.LIMITES_MAXIMOS.tackles,
      ),
      interceptions: this.normalizarYClampear(
        intercepcionesPonderadas,
        this.LIMITES_MAXIMOS.interceptions,
      ),
      saves: this.normalizarYClampear(
        atajadasTotal,
        this.LIMITES_MAXIMOS.saves,
      ),
      savePercentage: this.normalizarYClampear(
        porcentajeAtajadasPonderado,
        this.LIMITES_MAXIMOS.savePercentage,
      ),
      rating: this.normalizarYClampear(
        ratingPonderado,
        this.LIMITES_MAXIMOS.rating,
      ),
    };

    return new MetricasJugadorParaCotizacion(false, normalizadas);
  }

  private static normalizarYClampear(valor: number | null, max: number): number {
    if (valor === null || valor === undefined || Number.isNaN(valor) || valor <= 0) {
      return 0.0;
    }
    const norm = valor / max;
    return this.clamp(norm);
  }

  private static clamp(valor: number): number {
    if (Number.isNaN(valor) || valor <= 0) return 0.0;
    if (valor >= 1.0) return 1.0;
    return Math.round((valor + Number.EPSILON) * 10000) / 10000;
  }

  public get sinEstadisticas(): boolean {
    return this._sinEstadisticas;
  }

  public get metricas(): MetricasNormalizadasMap | null {
    return this._metricasNormalizadas;
  }

  public toSnapshot(): SnapshotMetricasNormalizadas | null {
    if (this._sinEstadisticas || !this._metricasNormalizadas) {
      return null;
    }
    return { ...this._metricasNormalizadas };
  }
}
