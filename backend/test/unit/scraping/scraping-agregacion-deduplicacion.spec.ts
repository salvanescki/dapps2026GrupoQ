import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { RawWhoScoredPlayerStats } from '../../../src/scraping/services/whoscored-playwright.service';

describe('ScrapingService - Agregación, Deduplicación y Cobertura (Bloque 5)', () => {
  let service: ScrapingService;

  beforeEach(() => {
    service = new ScrapingService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('Deduplicación por whoScoredPlayerId', () => {
    it('debe conservar acumulados oficiales y resolver club por mayor cantidad de minutos para jugador transferido', () => {
      const records: RawWhoScoredPlayerStats[] = [
        {
          whoScoredId: '5001',
          nombre: 'Raheem Sterling',
          equipoNombre: 'Chelsea',
          minutosJugados: 200,
          goles: 1,
          asistencias: 0,
          rating: 6.8,
        },
        {
          whoScoredId: '5001',
          nombre: 'Raheem Sterling',
          equipoNombre: 'Arsenal',
          minutosJugados: 750,
          goles: 4,
          asistencias: 3,
          rating: 7.3,
        },
      ];

      const { deduplicados, incidencias } = service.deduplicarYConsolidarJugadores(records);

      expect(deduplicados.length).toBe(1);
      expect(deduplicados[0].whoScoredId).toBe('5001');
      expect(deduplicados[0].equipoNombre).toBe('Arsenal'); // Mayor cantidad de minutos (750 > 200)
      expect(deduplicados[0].minutosJugados).toBe(750);
      expect(deduplicados[0].goles).toBe(4);
      expect(incidencias.length).toBe(0);
    });

    it('debe excluir preventivamente y registrar incidencia ante jugador transferido ambiguo con minutos idénticos', () => {
      const recordsAmbiguos: RawWhoScoredPlayerStats[] = [
        {
          whoScoredId: '5002',
          nombre: 'Jugador Ambiguo',
          equipoNombre: 'Club A',
          minutosJugados: 400,
          goles: 2,
          rating: 7.0,
        },
        {
          whoScoredId: '5002',
          nombre: 'Jugador Ambiguo',
          equipoNombre: 'Club B',
          minutosJugados: 400,
          goles: 3,
          rating: 7.2,
        },
      ];

      const { deduplicados, incidencias } =
        service.deduplicarYConsolidarJugadores(recordsAmbiguos);

      expect(deduplicados.length).toBe(0); // Excluido preventivamente
      expect(incidencias.length).toBe(1);
      expect(incidencias[0].tipo).toBe('TRANSFERENCIA_AMBIGUA_EXCLUIDA');
      expect(incidencias[0].equipoId).toBe('5002');
    });
  });

  describe('Validación de Cobertura de Salvaguarda', () => {
    it('debe rechazar una liga con 349 jugadores con minutos por cobertura insuficiente', () => {
      const jugadores: RawWhoScoredPlayerStats[] = Array.from({ length: 349 }, (_, i) => ({
        whoScoredId: `ws_${i}`,
        nombre: `Jugador ${i}`,
        minutosJugados: 90,
      }));

      const resultado = service.validarCoberturaLiga(jugadores, 350);
      expect(resultado.valida).toBe(false);
      expect(resultado.totalConMinutos).toBe(349);
      expect(resultado.motivo).toBe('rechazada_cobertura_insuficiente');
    });

    it('debe aprobar una liga con al menos 350 jugadores con minutos', () => {
      const jugadores: RawWhoScoredPlayerStats[] = Array.from({ length: 350 }, (_, i) => ({
        whoScoredId: `ws_${i}`,
        nombre: `Jugador ${i}`,
        minutosJugados: 10 + i,
      }));

      const resultado = service.validarCoberturaLiga(jugadores, 350);
      expect(resultado.valida).toBe(true);
      expect(resultado.totalConMinutos).toBe(350);
    });

    it('no debe contar jugadores con 0 minutos para el umbral de cobertura', () => {
      const jugadores: RawWhoScoredPlayerStats[] = [
        ...Array.from({ length: 349 }, (_, i) => ({
          whoScoredId: `ws_${i}`,
          nombre: `Jugador ${i}`,
          minutosJugados: 90,
        })),
        {
          whoScoredId: 'ws_sin_minutos',
          nombre: 'Suplente sin minutos',
          minutosJugados: 0,
        },
      ];

      const resultado = service.validarCoberturaLiga(jugadores, 350);
      expect(resultado.valida).toBe(false);
      expect(resultado.totalConMinutos).toBe(349);
    });

    it('debe validar la salvaguarda global de al menos 2000 jugadores en corrida de 5 ligas', () => {
      expect(service.validarCoberturaGlobal(1999, 2000).valida).toBe(false);
      expect(service.validarCoberturaGlobal(2000, 2000).valida).toBe(true);
      expect(service.validarCoberturaGlobal(2150, 2000).valida).toBe(true);
    });
  });
});
