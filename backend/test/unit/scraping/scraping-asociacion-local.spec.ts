import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { NormalizadorJugadorService } from '../../../src/scraping/services/normalizador-jugador.service';
import { Jugador } from '../../../src/domain/jugador.entity';
import { RawWhoScoredPlayerStats } from '../../../src/scraping/services/whoscored-playwright.service';

describe('ScrapingService - Asociación Local y Umbral >= 85% (Bloque 6)', () => {
  let service: ScrapingService;
  let normalizador: NormalizadorJugadorService;

  beforeEach(() => {
    normalizador = new NormalizadorJugadorService();
    service = new ScrapingService(
      {} as any,
      normalizador,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  const crearJugadorMock = (props: {
    id: string;
    externalId: number;
    nombre: string;
    whoScoredPlayerId?: string | null;
    equipoId?: string;
    equipoNombre?: string;
  }) => {
    return Jugador.crear({
      id: props.id,
      externalId: props.externalId,
      whoScoredPlayerId: props.whoScoredPlayerId || null,
      nombre: props.nombre,
      equipoId: props.equipoId || '11111111-1111-4111-8111-111111111111',
      ligaId: '22222222-2222-4222-8222-222222222222',
      equipo: props.equipoNombre
        ? ({ id: props.equipoId, nombre: props.equipoNombre } as any)
        : null,
    });
  };

  it('debe asociar inmediatamente en Nivel 1 por whoScoredPlayerId sin alterar id', () => {
    const jugadorLocal = crearJugadorMock({
      id: 'j-1',
      externalId: 101,
      nombre: 'Bukayo Saka',
      whoScoredPlayerId: '365409',
    });

    const raw: RawWhoScoredPlayerStats = {
      whoScoredId: '365409',
      nombre: 'B. Saka',
      equipoNombre: 'Arsenal',
      minutosJugados: 850,
      goles: 5,
    };

    const resultado = service.asociarJugadoresLocales([raw], [jugadorLocal], 85);

    expect(resultado.asociados.length).toBe(1);
    expect(resultado.asociados[0].jugador.id).toBe('j-1');
    expect(resultado.enriquecidos.length).toBe(0); // Ya tenía whoScoredPlayerId
    expect(resultado.tasaAsociacion).toBe(100);
    expect(resultado.valida).toBe(true);
  });

  it('debe asociar en Nivel 2 por normalización estricta + equipo local y enriquecer jugador con asociarWhoScored', () => {
    const jugadorLocal = crearJugadorMock({
      id: 'j-2',
      externalId: 102,
      nombre: 'Martin Ødegaard', // Caracteres noruegos
      whoScoredPlayerId: null,
      equipoNombre: 'Arsenal FC',
    });

    const raw: RawWhoScoredPlayerStats = {
      whoScoredId: '80767',
      nombre: 'Martin Odegaard',
      equipoNombre: 'Arsenal',
      minutosJugados: 800,
      goles: 3,
    };

    const resultado = service.asociarJugadoresLocales([raw], [jugadorLocal], 85);

    expect(resultado.asociados.length).toBe(1);
    expect(resultado.asociados[0].jugador.id).toBe('j-2');
    expect(resultado.enriquecidos.length).toBe(1);
    expect(resultado.enriquecidos[0].whoScoredPlayerId).toBe('80767');
  });

  it('debe descartar preventivamente y no asociar ante ambigüedad en el club local sin fuzzy matching', () => {
    const jugadorLocal1 = crearJugadorMock({
      id: 'j-3a',
      externalId: 103,
      nombre: 'Gabriel',
      equipoId: 'eq-arsenal',
      equipoNombre: 'Arsenal',
    });
    const jugadorLocal2 = crearJugadorMock({
      id: 'j-3b',
      externalId: 104,
      nombre: 'Gabriel',
      equipoId: 'eq-arsenal',
      equipoNombre: 'Arsenal',
    });

    const raw: RawWhoScoredPlayerStats = {
      whoScoredId: '99999',
      nombre: 'Gabriel',
      equipoNombre: 'Arsenal',
      minutosJugados: 900,
    };

    const resultado = service.asociarJugadoresLocales(
      [raw],
      [jugadorLocal1, jugadorLocal2],
      85,
    );

    expect(resultado.asociados.length).toBe(0);
    expect(resultado.descartados.length).toBe(1);
    expect(resultado.descartados[0].motivo).toContain('ambigüedad');
  });

  it('debe marcar la liga como rechazada_baja_asociacion si la tasa de asociación es < 85%', () => {
    const jugadoresLocales = [
      crearJugadorMock({ id: 'j-1', externalId: 1, nombre: 'Jugador 1', whoScoredPlayerId: 'ws_1' }),
    ];

    const rawList: RawWhoScoredPlayerStats[] = [
      { whoScoredId: 'ws_1', nombre: 'Jugador 1', minutosJugados: 90 },
      { whoScoredId: 'ws_2', nombre: 'Jugador Desconocido A', minutosJugados: 90 },
      { whoScoredId: 'ws_3', nombre: 'Jugador Desconocido B', minutosJugados: 90 },
    ];

    // 1 de 3 asociados = 33.33% < 85%
    const resultado = service.asociarJugadoresLocales(rawList, jugadoresLocales, 85);

    expect(resultado.valida).toBe(false);
    expect(resultado.motivo).toBe('rechazada_baja_asociacion');
    expect(resultado.tasaAsociacion).toBeCloseTo(33.33, 1);
  });

  it('debe asociar correctamente clubes mediante diccionario de alias (ej: Man Utd <-> Manchester United FC)', () => {
    const jugadorLocal = crearJugadorMock({
      id: 'j-kobbie',
      externalId: 201,
      nombre: 'Kobbie Mainoo',
      equipoNombre: 'Manchester United FC',
    });

    const raw: RawWhoScoredPlayerStats = {
      whoScoredId: '422391',
      nombre: 'Kobbie Mainoo',
      equipoNombre: 'Man Utd',
      minutosJugados: 750,
    };

    const resultado = service.asociarJugadoresLocales([raw], [jugadorLocal], 85);
    expect(resultado.asociados.length).toBe(1);
    expect(resultado.asociados[0].jugador.id).toBe('j-kobbie');
  });

  it('debe resolver discrepancias por sufijo Jr. o hipocorísticos a través del normalizador de respaldo', () => {
    const jugadorLocalCasseres = crearJugadorMock({
      id: 'j-casseres',
      externalId: 301,
      nombre: 'Cristian Cásseres Jr.',
      equipoNombre: 'Toulouse FC',
    });

    const matchCasseres = normalizador.buscarCoincidencia(
      'Cristian Cásseres',
      'Toulouse',
      'FL1',
      [jugadorLocalCasseres],
    );
    expect(matchCasseres).toBeDefined();
    expect(matchCasseres?.id).toBe('j-casseres');

    const jugadorLocalBaena = crearJugadorMock({
      id: 'j-baena',
      externalId: 302,
      nombre: 'Alejandro Baena',
      equipoNombre: 'Club Atlético de Madrid',
    });

    const matchBaena = normalizador.buscarCoincidencia(
      'Álex Baena',
      'Atletico',
      'PD',
      [jugadorLocalBaena],
    );
    expect(matchBaena).toBeDefined();
    expect(matchBaena?.id).toBe('j-baena');
  });
});

