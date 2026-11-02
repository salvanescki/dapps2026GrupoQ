import { PosicionJugador } from '../jugador.entity';
import { MetricasJugadorParaCotizacion } from './metricas-jugador-cotizacion.value-object';
import { EstrategiaId, EstrategiaVersion } from '../configuracion-mercado.entity';
import { SnapshotMetricasNormalizadas } from '../cotizacion.entity';

export interface ResultadoCalculoCotizacion {
  score: number;
  valor: number;
  sinEstadisticas: boolean;
  metricasNormalizadas: SnapshotMetricasNormalizadas | null;
}

export interface EstrategiaCotizacion {
  readonly id: EstrategiaId;
  readonly version: EstrategiaVersion;
  calcular(
    metricas: MetricasJugadorParaCotizacion,
    posicion: PosicionJugador,
  ): ResultadoCalculoCotizacion;
}
