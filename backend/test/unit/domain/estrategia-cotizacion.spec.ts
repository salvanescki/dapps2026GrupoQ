import { EstrategiaGlobal } from '../../../src/domain/strategies/estrategia-global.strategy';
import { EstrategiaPosicional } from '../../../src/domain/strategies/estrategia-posicional.strategy';
import { MetricasJugadorParaCotizacion } from '../../../src/domain/strategies/metricas-jugador-cotizacion.value-object';
import { PosicionJugador } from '../../../src/domain/jugador.entity';

describe('Estrategias de Cotización (Unit Tests)', () => {
  const global = new EstrategiaGlobal();
  const posicional = new EstrategiaPosicional();

  it('debe devolver valor 1.00, score 0.00 y sinEstadisticas = true si no hay métricas', () => {
    const metricasVacias = MetricasJugadorParaCotizacion.vacio();

    const resGlobal = global.calcular(metricasVacias, 'Delantero');
    expect(resGlobal.score).toBe(0.0);
    expect(resGlobal.valor).toBe(1.0);
    expect(resGlobal.sinEstadisticas).toBe(true);
    expect(resGlobal.metricasNormalizadas).toBeNull();

    const resPosicional = posicional.calcular(metricasVacias, 'Delantero');
    expect(resPosicional.score).toBe(0.0);
    expect(resPosicional.valor).toBe(1.0);
    expect(resPosicional.sinEstadisticas).toBe(true);
  });

  it('debe verificar que la suma de pesos en EstrategiaGlobal es exactamente 1.00 (score máximo = 1.0000, valor = 2.00)', () => {
    const todasMaximas = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
      goals: 1.0,
      assists: 1.0,
      shots: 1.0,
      keyPasses: 1.0,
      dribbles: 1.0,
      tackles: 1.0,
      interceptions: 1.0,
      saves: 1.0,
      savePercentage: 1.0,
      rating: 1.0,
    });

    const res = global.calcular(todasMaximas, 'Delantero');
    expect(res.score).toBe(1.0);
    expect(res.valor).toBe(2.0);
    expect(res.sinEstadisticas).toBe(false);
  });

  describe('EstrategiaPosicional (POSICIONAL_v1) - Suma de pesos = 1.00 por perfil táctico', () => {
    const todasMaximas = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
      goals: 1.0,
      assists: 1.0,
      shots: 1.0,
      keyPasses: 1.0,
      dribbles: 1.0,
      tackles: 1.0,
      interceptions: 1.0,
      saves: 1.0,
      savePercentage: 1.0,
      rating: 1.0,
    });

    const posiciones: PosicionJugador[] = [
      'Delantero',
      'Mediocampista',
      'Defensa',
      'Portero',
      'No Clasificado',
    ];

    posiciones.forEach((pos) => {
      it(`debe dar score 1.0000 y valor 2.00 para perfil ${pos} con métricas máximas`, () => {
        const res = posicional.calcular(todasMaximas, pos);
        expect(res.score).toBe(1.0);
        expect(res.valor).toBe(2.0);
      });
    });

    it('Delantero: debe priorizar goals y shots por sobre tackles', () => {
      const goleador = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
        goals: 1.0,
        shots: 1.0,
        assists: 0.0,
        keyPasses: 0.0,
        dribbles: 0.0,
        tackles: 0.0,
        interceptions: 0.0,
        saves: 0.0,
        savePercentage: 0.0,
        rating: 0.0,
      });

      // Delantero: 0.35*1.0 + 0.20*1.0 = 0.55
      const res = posicional.calcular(goleador, 'Delantero');
      expect(res.score).toBe(0.55);
      expect(res.valor).toBe(1.55);
    });

    it('Defensa: debe priorizar tackles e interceptions por sobre goals', () => {
      const defensor = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
        goals: 0.0,
        shots: 0.0,
        assists: 0.0,
        keyPasses: 0.0,
        dribbles: 0.0,
        tackles: 1.0,
        interceptions: 1.0,
        saves: 0.0,
        savePercentage: 0.0,
        rating: 0.0,
      });

      // Defensa: 0.30*1.0 + 0.25*1.0 = 0.55
      const res = posicional.calcular(defensor, 'Defensa');
      expect(res.score).toBe(0.55);
      expect(res.valor).toBe(1.55);
    });

    it('Portero: debe priorizar rating, savePercentage y saves exclusivamente', () => {
      const arquero = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
        goals: 1.0,
        shots: 1.0,
        assists: 1.0,
        keyPasses: 1.0,
        dribbles: 1.0,
        tackles: 1.0,
        interceptions: 1.0,
        saves: 1.0,
        savePercentage: 1.0,
        rating: 0.5,
      });

      // Portero: 0.55*0.5 + 0.30*1.0 + 0.15*1.0 = 0.275 + 0.30 + 0.15 = 0.725
      const res = posicional.calcular(arquero, 'Portero');
      expect(res.score).toBe(0.725);
      expect(res.valor).toBe(1.73);
    });

    it('No Clasificado: debe usar el fallback de EstrategiaGlobal', () => {
      const metricas = MetricasJugadorParaCotizacion.desdeMetricasDirectas({
        goals: 0.5,
        assists: 0.5,
        shots: 0.5,
        keyPasses: 0.5,
        dribbles: 0.5,
        tackles: 0.5,
        interceptions: 0.5,
        saves: 0.5,
        savePercentage: 0.5,
        rating: 0.5,
      });

      const resGlobal = global.calcular(metricas, 'No Clasificado');
      const resPos = posicional.calcular(metricas, 'No Clasificado');

      expect(resPos.score).toBe(resGlobal.score);
      expect(resPos.valor).toBe(resGlobal.valor);
    });
  });
});
