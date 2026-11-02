import {
  EstrategiaCotizacion,
  ResultadoCalculoCotizacion,
} from './estrategia-cotizacion.interface';
import { MetricasJugadorParaCotizacion } from './metricas-jugador-cotizacion.value-object';
import { PosicionJugador } from '../jugador.entity';
import { EstrategiaId, EstrategiaVersion } from '../configuracion-mercado.entity';
import { EstrategiaGlobal } from './estrategia-global.strategy';

export class EstrategiaPosicional implements EstrategiaCotizacion {
  public readonly id: EstrategiaId = 'POSICIONAL';
  public readonly version: EstrategiaVersion = 'POSICIONAL_v1';
  private readonly fallbackGlobal = new EstrategiaGlobal();

  public calcular(
    metricas: MetricasJugadorParaCotizacion,
    posicion: PosicionJugador,
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
    let scoreRaw: number;

    switch (posicion) {
      case 'Delantero':
        // Delantero: 0.35*goals + 0.20*shots + 0.15*assists + 0.15*rating + 0.10*dribbles + 0.05*keyPasses + 0.00*tackles
        scoreRaw =
          0.35 * m.goals +
          0.20 * m.shots +
          0.15 * m.assists +
          0.15 * m.rating +
          0.10 * m.dribbles +
          0.05 * m.keyPasses;
        break;

      case 'Mediocampista':
        // Mediocampista: 0.25*assists + 0.20*keyPasses + 0.15*dribbles + 0.15*rating + 0.10*goals + 0.10*tackles + 0.05*shots
        scoreRaw =
          0.25 * m.assists +
          0.20 * m.keyPasses +
          0.15 * m.dribbles +
          0.15 * m.rating +
          0.10 * m.goals +
          0.10 * m.tackles +
          0.05 * m.shots;
        break;

      case 'Defensa':
        // Defensa: 0.30*tackles + 0.25*interceptions + 0.25*rating + 0.05*keyPasses + 0.05*assists + 0.05*dribbles + 0.05*goals
        scoreRaw =
          0.30 * m.tackles +
          0.25 * m.interceptions +
          0.25 * m.rating +
          0.05 * m.keyPasses +
          0.05 * m.assists +
          0.05 * m.dribbles +
          0.05 * m.goals;
        break;

      case 'Portero':
        // Portero: 0.55*rating + 0.30*savePercentage + 0.15*saves
        scoreRaw =
          0.55 * m.rating +
          0.30 * m.savePercentage +
          0.15 * m.saves;
        break;

      case 'No Clasificado':
      default:
        // Fallback determinista a GLOBAL_v1
        return this.fallbackGlobal.calcular(metricas, posicion);
    }

    const scoreClamped = Math.min(1.0, Math.max(0.0, scoreRaw));
    const score = Math.round((scoreClamped + Number.EPSILON) * 10000) / 10000;
    const valor = Math.round((1.0 + score + Number.EPSILON) * 100) / 100;

    return {
      score,
      valor,
      sinEstadisticas: false,
      metricasNormalizadas: metricas.toSnapshot(),
    };
  }
}
