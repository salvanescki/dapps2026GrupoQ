import {
  EjecucionScraping,
  EstadoEjecucion,
  ErrorScrapingDetalle,
} from '../../../src/scraping/domain/ejecucion-scraping.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EjecucionScraping Domain Entity', () => {
  it('debe iniciar una nueva ejecución en estado en_progreso con valores por defecto válidos', () => {
    const ejecucion = EjecucionScraping.iniciar();

    expect(ejecucion.id).toBeDefined();
    expect(ejecucion.inicio).toBeInstanceOf(Date);
    expect(ejecucion.fin).toBeNull();
    expect(ejecucion.estado).toBe('en_progreso');
    expect(ejecucion.jugadoresProcesados).toBe(0);
    expect(ejecucion.errores).toBe(0);
    expect(ejecucion.detalle).toEqual([]);
  });

  describe('Invariantes y validaciones', () => {
    it('debe fallar si jugadoresProcesados es negativo', () => {
      expect(() =>
        EjecucionScraping.reconstituir({
          id: '550e8400-e29b-41d4-a716-446655440000',
          inicio: new Date(),
          fin: null,
          estado: 'en_progreso',
          jugadoresProcesados: -1,
          errores: 0,
          detalle: [],
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si errores es negativo', () => {
      expect(() =>
        EjecucionScraping.reconstituir({
          id: '550e8400-e29b-41d4-a716-446655440000',
          inicio: new Date(),
          fin: null,
          estado: 'en_progreso',
          jugadoresProcesados: 10,
          errores: -1,
          detalle: [],
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si estado es exitoso pero fin es null', () => {
      expect(() =>
        EjecucionScraping.reconstituir({
          id: '550e8400-e29b-41d4-a716-446655440000',
          inicio: new Date(),
          fin: null,
          estado: 'exitoso',
          jugadoresProcesados: 100,
          errores: 0,
          detalle: [],
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si estado es fallido pero fin es null', () => {
      expect(() =>
        EjecucionScraping.reconstituir({
          id: '550e8400-e29b-41d4-a716-446655440000',
          inicio: new Date(),
          fin: null,
          estado: 'fallido',
          jugadoresProcesados: 0,
          errores: 1,
          detalle: [],
        }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('debe fallar si fin es anterior a inicio', () => {
      const inicio = new Date('2026-10-20T20:00:00.000Z');
      const finAnterior = new Date('2026-10-20T19:59:59.000Z');

      expect(() =>
        EjecucionScraping.reconstituir({
          id: '550e8400-e29b-41d4-a716-446655440000',
          inicio,
          fin: finAnterior,
          estado: 'exitoso',
          jugadoresProcesados: 50,
          errores: 0,
          detalle: [],
        }),
      ).toThrow(ReglaDeNegocioException);
    });
  });

  describe('Transiciones de estado y métodos de dominio', () => {
    it('debe registrar jugadores procesados incrementando el contador', () => {
      const ejecucion = EjecucionScraping.iniciar();
      ejecucion.incrementarJugadoresProcesados(5);
      expect(ejecucion.jugadoresProcesados).toBe(5);
      ejecucion.incrementarJugadoresProcesados();
      expect(ejecucion.jugadoresProcesados).toBe(6);
    });

    it('debe registrar error individual agregándolo al detalle e incrementando errores', () => {
      const ejecucion = EjecucionScraping.iniciar();
      const error: ErrorScrapingDetalle = {
        liga: 'PL',
        jugadorNombre: 'Player X',
        mensaje: 'No coincide con la base local',
        timestamp: new Date(),
      };

      ejecucion.registrarError(error);
      expect(ejecucion.errores).toBe(1);
      expect(ejecucion.detalle).toHaveLength(1);
      expect(ejecucion.detalle[0]).toEqual(error);
    });

    it('debe finalizar exitosamente asignando fecha de fin y estado exitoso', () => {
      const ejecucion = EjecucionScraping.iniciar();
      ejecucion.incrementarJugadoresProcesados(200);
      ejecucion.finalizarExitoso();

      expect(ejecucion.estado).toBe('exitoso');
      expect(ejecucion.fin).toBeInstanceOf(Date);
      expect(ejecucion.fin!.getTime()).toBeGreaterThanOrEqual(ejecucion.inicio.getTime());
    });

    it('debe finalizar como fallido asignando fecha de fin y registrando motivo', () => {
      const ejecucion = EjecucionScraping.iniciar();
      const errorGlobal: ErrorScrapingDetalle = {
        liga: 'ALL',
        mensaje: 'Bloqueo Cloudflare crítico no superado',
        timestamp: new Date(),
      };

      ejecucion.finalizarFallido(errorGlobal);

      expect(ejecucion.estado).toBe('fallido');
      expect(ejecucion.fin).toBeInstanceOf(Date);
      expect(ejecucion.errores).toBe(1);
      expect(ejecucion.detalle).toContainEqual(errorGlobal);
    });

    it('no debe permitir finalizar una ejecución que ya no está en_progreso', () => {
      const ejecucion = EjecucionScraping.iniciar();
      ejecucion.finalizarExitoso();

      expect(() => ejecucion.finalizarExitoso()).toThrow(ReglaDeNegocioException);
      expect(() => ejecucion.finalizarFallido({ liga: 'PL', mensaje: 'Error', timestamp: new Date() })).toThrow(
        ReglaDeNegocioException,
      );
      expect(() => ejecucion.incrementarJugadoresProcesados(1)).toThrow(
        ReglaDeNegocioException,
      );
      expect(() =>
        ejecucion.registrarError({ liga: 'PL', mensaje: 'Error', timestamp: new Date() }),
      ).toThrow(ReglaDeNegocioException);
    });

    it('no debe permitir incrementar jugadores con cantidad negativa', () => {
      const ejecucion = EjecucionScraping.iniciar();
      expect(() => ejecucion.incrementarJugadoresProcesados(-1)).toThrow(
        ReglaDeNegocioException,
      );
    });
  });
});
