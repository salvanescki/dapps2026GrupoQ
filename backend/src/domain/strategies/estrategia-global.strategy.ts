import {
  EstrategiaCotizacion,
  ResultadoCalculoCotizacion,
} from './estrategia-cotizacion.interface';
import { MetricasJugadorParaCotizacion } from './metricas-jugador-cotizacion.value-object';
import { PosicionJugador } from '../jugador.entity';
import { EstrategiaId, EstrategiaVersion } from '../configuracion-mercado.entity';

export class EstrategiaGlobal implements EstrategiaCotizacion {
  public readonly id: EstrategiaId = 'GLOBAL';
  public readonly version: EstrategiaVersion = 'GLOBAL_v1';

  public calcular(
    metricas: MetricasJugadorParaCotizacion,
    _posicion: PosicionJugador,
  ): ResultadoCalculoCotizacion {
    if (metricas.sinEstadisticas || !metricas.metricas) {
      return {
        score: 0.0,
        valor: 1.0,
        sinEstadisticas: true,
        metricasNormalizadas: null,
      };
    }

    const m = metricas.metricas;

    // FR-009: score = 0.25*goals + 0.15*assists + 0.10*shots + 0.10*keyPasses + 0.10*dribbles + 0.10*tackles + 0.20*rating
    const scoreRaw =
      0.25 * m.goals +
      0.15 * m.assists +
      0.10 * m.shots +
      0.10 * m.keyPasses +
      0.10 * m.dribbles +
      0.10 * m.tackles +
      0.20 * m.rating;

    const scoreClamped = Math.min(1.0, Math.max(0.0, scoreRaw));
    const score = Math.round((scoreClamped + Number.EPSILON) * 10000) / 10000;

    // valor = round2(1.00 + score * 1.00)
    const valor = Math.round((1.0 + score + Number.EPSILON) * 100) / 100;

    return {
      score,
      valor,
      sinEstadisticas: false,
      metricasNormalizadas: metricas.toSnapshot(),
    };
  }
}
