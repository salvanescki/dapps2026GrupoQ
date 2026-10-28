import { EstadisticaJugador } from '../../../src/scraping/domain/estadistica-jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EstadisticaJugador - Procedencia Contextual (Feature 01 Unit Tests)', () => {
  const validProps = {
    jugadorId: '11111111-1111-4111-8111-111111111111',
    temporada: '2025/2026',
    liga: 'PL',
    fuente: 'whoscored',
    partidosJugados: 10,
    minutosJugados: 900,
    goles: 5,
    asistencias: 3,
    tarjetasAmarillas: 1,
    tarjetasRojas: 0,
  };

  it('debe permitir instanciar con competencia y etapa nulas (retrocompatibilidad)', () => {
    const stat = EstadisticaJugador.crear(validProps);
    expect(stat.competencia).toBeNull();
    expect(stat.etapa).toBeNull();
    expect(stat.fuente).toBe('whoscored');
  });

  it('debe admitir y recortar/almacenar competencia y etapa válidas', () => {
    const stat = EstadisticaJugador.crear({
      ...validProps,
      competencia: 'Premier League',
      etapa: 'Regular Season',
    });
    expect(stat.competencia).toBe('Premier League');
    expect(stat.etapa).toBe('Regular Season');
  });

  it('debe validar límites de longitud para competencia (max 100) y etapa (max 50)', () => {
    expect(() =>
      EstadisticaJugador.crear({
        ...validProps,
        competencia: 'A'.repeat(101),
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      EstadisticaJugador.crear({
        ...validProps,
        etapa: 'B'.repeat(51),
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe actualizar estadísticas permitiendo modificar o preservar competencia y etapa de forma retrocompatible', () => {
    const stat = EstadisticaJugador.crear({
      ...validProps,
      competencia: 'Premier League',
      etapa: 'Stage 1',
    });

    // Actualización legacy sin pasar competencia/etapa
    stat.actualizarEstadisticas({
      goles: 6,
      minutosJugados: 990,
    });
    expect(stat.goles).toBe(6);
    expect(stat.minutosJugados).toBe(990);
    expect(stat.competencia).toBe('Premier League');
    expect(stat.etapa).toBe('Stage 1');

    // Actualización con nueva etapa
    stat.actualizarEstadisticas({
      etapa: 'Stage 2',
    });
    expect(stat.etapa).toBe('Stage 2');
  });
});
