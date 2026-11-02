import { MetricasJugadorParaCotizacion } from '../../../src/domain/strategies/metricas-jugador-cotizacion.value-object';
import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';

describe('MetricasJugadorParaCotizacion Normalización y Agregación Contextual (T024)', () => {
  const jugadorId = 'j1000000-0000-0000-0000-000000000001';

  it('debe marcar sinEstadisticas si array es vacío o todos tienen 0 partidos', () => {
    expect(MetricasJugadorParaCotizacion.desdeEstadisticas([]).sinEstadisticas).toBe(true);

    const estCero = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 0,
    });
    expect(MetricasJugadorParaCotizacion.desdeEstadisticas([estCero]).sinEstadisticas).toBe(true);
  });

  it('debe seleccionar la temporada más reciente cuando hay varias temporadas', () => {
    const est2024 = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2024/2025',
      liga: 'PL',
      partidosJugados: 30,
      goles: 25,
    });
    const est2025 = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 10,
      goles: 6,
    });

    const m = MetricasJugadorParaCotizacion.desdeEstadisticas([est2024, est2025]);
    expect(m.sinEstadisticas).toBe(false);
    // Para 2025/2026: 6 goles / 30 max = 0.2
    expect(m.metricas!.goals).toBe(0.2);
  });

  it('debe agregar acumulados y ponderar métricas por partido en múltiples filas de la misma temporada', () => {
    // Fila 1: liga (20 partidos, 10 goles, rating 8.0, tiros 4.0)
    const fila1 = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Premier League',
      partidosJugados: 20,
      goles: 10,
      tirosPorPartido: 4.0,
      rating: 8.0,
      entradasPorPartido: 2.0,
      intercepccionesPorPartido: 1.0,
    });

    // Fila 2: copa (10 partidos, 5 goles, rating 7.0, tiros 1.0)
    const fila2 = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      competencia: 'Champions League',
      partidosJugados: 10,
      goles: 5,
      tirosPorPartido: 1.0,
      rating: 7.0,
      entradasPorPartido: 2.0,
      intercepccionesPorPartido: 1.0,
    });

    const m = MetricasJugadorParaCotizacion.desdeEstadisticas([fila1, fila2]);
    expect(m.sinEstadisticas).toBe(false);

    // Goles acumulados = 10 + 5 = 15; Max goles = 30 -> 15 / 30 = 0.5
    expect(m.metricas!.goals).toBe(0.5);

    // Tiros ponderados = (4.0 * 20 + 1.0 * 10) / 30 = (80 + 10) / 30 = 3.0; Max tiros = 5.0 -> 3.0 / 5.0 = 0.6
    expect(m.metricas!.shots).toBe(0.6);

    // Rating ponderado = (8.0 * 20 + 7.0 * 10) / 30 = (160 + 70) / 30 = 230 / 30 = 7.6667; Max = 10.0 -> 0.7667
    expect(m.metricas!.rating).toBe(0.7667);
  });

  it('debe aplicar clamp [0, 1] ante valores extremos o superiores al límite de referencia', () => {
    const filaExtrema = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 38,
      goles: 50, // mayor que 30 max
      tirosPorPartido: 10.0, // mayor que 5.0 max
      rating: 10.0, // límite superior exacto
    });

    const m = MetricasJugadorParaCotizacion.desdeEstadisticas([filaExtrema]);
    expect(m.metricas!.goals).toBe(1.0);
    expect(m.metricas!.shots).toBe(1.0);
    expect(m.metricas!.rating).toBe(1.0);
  });

  it('debe tratar valores null o indefinidos como 0 sin arrojar error', () => {
    const filaNula = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 5,
      goles: 0,
      asistencias: 0,
      tirosPorPartido: null,
      rating: null,
      entradasPorPartido: null,
      intercepccionesPorPartido: null,
    });

    const m = MetricasJugadorParaCotizacion.desdeEstadisticas([filaNula]);
    expect(m.metricas!.shots).toBe(0.0);
    expect(m.metricas!.rating).toBe(0.0);
    expect(m.metricas!.tackles).toBe(0.0);
    expect(m.metricas!.interceptions).toBe(0.0);

    const filaTotalmenteVacia = EstadisticaJugador.crear({
      jugadorId,
      temporada: '2025/2026',
      liga: 'PL',
      partidosJugados: 5,
    });
    const mVacia = MetricasJugadorParaCotizacion.desdeEstadisticas([filaTotalmenteVacia]);
    expect(mVacia.metricas!.goals).toBe(0);
    expect(mVacia.metricas!.assists).toBe(0);
    expect(mVacia.metricas!.saves).toBe(0);
    expect(mVacia.metricas!.keyPasses).toBe(0);
    expect(mVacia.metricas!.dribbles).toBe(0);
    expect(mVacia.metricas!.savePercentage).toBe(0);

    expect(MetricasJugadorParaCotizacion.vacio().toSnapshot()).toBeNull();
  });
});
