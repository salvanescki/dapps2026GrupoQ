import { Cotizacion } from '../../../src/domain/cotizacion.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Cotizacion Entity (Domain Unit Tests)', () => {
  const jugadorId = 'j1000000-0000-0000-0000-000000000001';

  it('debe crear cotización inicial con score 0.00, valor 1.00 y sinEstadisticas = true', () => {
    const cotizacion = Cotizacion.crearInicial({ jugadorId });
    expect(cotizacion.id).toBeDefined();
    expect(cotizacion.jugadorId).toBe(jugadorId);
    expect(cotizacion.score).toBe(0.0);
    expect(cotizacion.valor).toBe(1.0);
    expect(cotizacion.sinEstadisticas).toBe(true);
    expect(cotizacion.metricas).toBeNull();
    expect(cotizacion.estrategiaId).toBe('GLOBAL');
    expect(cotizacion.estrategiaVersion).toBe('GLOBAL_v1');
    expect(cotizacion.fechaCotizacion).toBeInstanceOf(Date);
  });

  it('debe permitir crear cotización desde cálculo con métricas y estrategia posicional', () => {
    const metricas = {
      goals: 0.8,
      assists: 0.5,
      rating: 0.9,
    };
    const cotizacion = Cotizacion.crearDesdeCalculo({
      jugadorId,
      score: 0.75,
      valor: 1.75,
      estrategiaId: 'POSICIONAL',
      estrategiaVersion: 'POSICIONAL_v1',
      sinEstadisticas: false,
      metricas,
    });

    expect(cotizacion.score).toBe(0.75);
    expect(cotizacion.valor).toBe(1.75);
    expect(cotizacion.estrategiaId).toBe('POSICIONAL');
    expect(cotizacion.estrategiaVersion).toBe('POSICIONAL_v1');
    expect(cotizacion.sinEstadisticas).toBe(false);
    expect(cotizacion.metricas).toEqual(metricas);
  });

  it('debe rechazar cotización si jugadorId está vacío', () => {
    expect(() =>
      Cotizacion.crearInicial({ jugadorId: '' }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar cotización si score está fuera de [0, 1]', () => {
    expect(() =>
      Cotizacion.crearDesdeCalculo({
        jugadorId,
        score: -0.01,
        valor: 1.0,
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Cotizacion.crearDesdeCalculo({
        jugadorId,
        score: 1.0001,
        valor: 2.0,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar cotización si valor es menor a 1.00', () => {
    expect(() =>
      Cotizacion.crearDesdeCalculo({
        jugadorId,
        score: 0.0,
        valor: 0.99,
      }),
    ).toThrow(ReglaDeNegocioException);
  });

  it('debe rechazar versiones incompatibles de estrategia', () => {
    expect(() =>
      Cotizacion.crearDesdeCalculo({
        jugadorId,
        score: 0.5,
        valor: 1.5,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'POSICIONAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);

    expect(() =>
      Cotizacion.crearDesdeCalculo({
        jugadorId,
        score: 0.5,
        valor: 1.5,
        estrategiaId: 'POSICIONAL',
        estrategiaVersion: 'GLOBAL_v1',
      }),
    ).toThrow(ReglaDeNegocioException);
  });
});
