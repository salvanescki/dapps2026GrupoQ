import {
  EquipoSemanal,
  MINUTOS_MINIMOS_ELEGIBILIDAD,
  obtenerAnoYSemanaIso,
} from '../../../src/domain/equipo-semanal.entity';
import { Jugador } from '../../../src/domain/jugador.entity';
import { Cotizacion } from '../../../src/domain/cotizacion.entity';
import { MiembroEquipoSemanal } from '../../../src/domain/miembro-equipo-semanal.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EquipoSemanal Entity (Domain Unit Tests)', () => {
  const conMinutos = (jugadores: Jugador[], minutos = 900): Map<string, number> =>
    new Map(jugadores.map((j) => [j.id, minutos]));

  const crearJugadorMock = (
    id: string,
    nombre: string,
    posicion: 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero' | 'No Clasificado',
    activo = true,
  ): Jugador => {
    return Jugador.crear({
      id,
      externalId: Math.floor(Math.random() * 100000),
      nombre,
      posicion,
      equipoId: 'eq-club-1',
      ligaId: 'liga-1',
      activo,
      equipo: { nombre: 'Club de Prueba' } as any,
    });
  };

  const crearCotizacionMock = (
    jugadorId: string,
    valor: number,
    score: number,
    sinEstadisticas = false,
  ): Cotizacion => {
    return Cotizacion.crearDesdeCalculo({
      jugadorId,
      valor,
      score,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      sinEstadisticas,
    });
  };

  const crear11MiembrosValidos = (variacion?: Partial<{ pos: string; count: number }>): MiembroEquipoSemanal[] => {
    const miembros: MiembroEquipoSemanal[] = [];
    const posiciones: ('Portero' | 'Defensa' | 'Mediocampista' | 'Delantero')[] = [
      'Portero',
      'Defensa',
      'Defensa',
      'Defensa',
      'Defensa',
      'Mediocampista',
      'Mediocampista',
      'Mediocampista',
      'Delantero',
      'Delantero',
      'Delantero',
    ];

    for (let i = 0; i < 11; i++) {
      miembros.push(
        MiembroEquipoSemanal.crear({
          equipoSemanalId: 'eq-1',
          jugadorId: `j-${i + 1}`,
          nombre: `Jugador ${i + 1}`,
          equipoNombre: 'Club FC',
          posicion: posiciones[i],
          cotizacion: 10 + i,
          score: 0.5,
          orden: i + 1,
        }),
      );
    }
    return miembros;
  };

  it('Happy path: seleccionarOnceIdeal con exactamente 11 candidatos elegibles genera equipo con invariantes correctas', () => {
    const jugadores: Jugador[] = [
      crearJugadorMock('p1', 'Emiliano Martinez', 'Portero'),
      crearJugadorMock('d1', 'Cristian Romero', 'Defensa'),
      crearJugadorMock('d2', 'Nicolas Otamendi', 'Defensa'),
      crearJugadorMock('d3', 'Lisandro Martinez', 'Defensa'),
      crearJugadorMock('d4', 'Nahuel Molina', 'Defensa'),
      crearJugadorMock('m1', 'Rodrigo De Paul', 'Mediocampista'),
      crearJugadorMock('m2', 'Enzo Fernandez', 'Mediocampista'),
      crearJugadorMock('m3', 'Alexis Mac Allister', 'Mediocampista'),
      crearJugadorMock('f1', 'Lionel Messi', 'Delantero'),
      crearJugadorMock('f2', 'Julian Alvarez', 'Delantero'),
      crearJugadorMock('f3', 'Lautaro Martinez', 'Delantero'),
    ];

    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j, idx) => {
      cotizaciones.set(j.id, crearCotizacionMock(j.id, 10 + idx, 0.8));
    });

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      jugadoresActivos: jugadores,
      minutosPorJugador: conMinutos(jugadores),
      cotizacionesPorJugador: cotizaciones,
    });

    expect(equipo).toBeDefined();
    expect(equipo.id).toBeDefined();
    expect(equipo.ano).toBe(2026);
    expect(equipo.semanaIso).toBe(44);
    expect(equipo.formacion).toBe('4-3-3');
    expect(equipo.estrategiaId).toBe('GLOBAL');
    expect(equipo.estrategiaVersion).toBe('GLOBAL_v1');
    expect(equipo.fechaGeneracion).toBeInstanceOf(Date);
    expect(equipo.miembros).toHaveLength(11);

    const por = equipo.miembros.filter((m) => m.posicion === 'Portero');
    const def = equipo.miembros.filter((m) => m.posicion === 'Defensa');
    const med = equipo.miembros.filter((m) => m.posicion === 'Mediocampista');
    const del = equipo.miembros.filter((m) => m.posicion === 'Delantero');

    expect(por).toHaveLength(1);
    expect(def).toHaveLength(4);
    expect(med).toHaveLength(3);
    expect(del).toHaveLength(3);

    // Verificar orden
    expect(equipo.miembros.map((m) => m.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('Desempate por valor DESC -> score DESC -> nombre ASC', () => {
    const p1 = crearJugadorMock('p1', 'Beto', 'Portero');
    const p2 = crearJugadorMock('p2', 'Alberto', 'Portero');

    const d1 = crearJugadorMock('d1', 'Zacarias', 'Defensa');
    const d2 = crearJugadorMock('d2', 'Carlos', 'Defensa');
    const d3 = crearJugadorMock('d3', 'Bernardo', 'Defensa');
    const d4 = crearJugadorMock('d4', 'Alejandro', 'Defensa');
    const d5 = crearJugadorMock('d5', 'Walter', 'Defensa');

    const m1 = crearJugadorMock('m1', 'Medio 1', 'Mediocampista');
    const m2 = crearJugadorMock('m2', 'Medio 2', 'Mediocampista');
    const m3 = crearJugadorMock('m3', 'Medio 3', 'Mediocampista');

    const f1 = crearJugadorMock('f1', 'Del 1', 'Delantero');
    const f2 = crearJugadorMock('f2', 'Del 2', 'Delantero');
    const f3 = crearJugadorMock('f3', 'Del 3', 'Delantero');

    const jugadores = [p1, p2, d1, d2, d3, d4, d5, m1, m2, m3, f1, f2, f3];
    const cotizaciones = new Map<string, Cotizacion>();

    cotizaciones.set('p1', crearCotizacionMock('p1', 15.0, 0.8));
    cotizaciones.set('p2', crearCotizacionMock('p2', 15.0, 0.9));

    ['d1', 'd2', 'd3', 'd4', 'd5'].forEach((id) => {
      cotizaciones.set(id, crearCotizacionMock(id, 10.0, 0.5));
    });

    ['m1', 'm2', 'm3', 'f1', 'f2', 'f3'].forEach((id) => {
      cotizaciones.set(id, crearCotizacionMock(id, 12.0, 0.6));
    });

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      jugadoresActivos: jugadores,
      minutosPorJugador: conMinutos(jugadores),
      cotizacionesPorJugador: cotizaciones,
    });

    const porteroElegido = equipo.miembros.find((m) => m.posicion === 'Portero');
    expect(porteroElegido?.jugadorId).toBe('p2');

    const defensasElegidos = equipo.miembros
      .filter((m) => m.posicion === 'Defensa')
      .map((m) => m.nombre);
    expect(defensasElegidos).toEqual(['Alejandro', 'Bernardo', 'Carlos', 'Walter']);
  });

  it('Ignora jugadores con posición No Clasificado', () => {
    const noClasificado = crearJugadorMock('nc1', 'Desconocido', 'No Clasificado');
    const portero = crearJugadorMock('p1', 'Portero', 'Portero');
    const defensas = [
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
    ];
    const medios = [
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
    ];
    const delanteros = [
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];

    const cotizaciones = new Map<string, Cotizacion>();
    cotizaciones.set('nc1', crearCotizacionMock('nc1', 999.0, 1.0));
    [portero, ...defensas, ...medios, ...delanteros].forEach((j) =>
      cotizaciones.set(j.id, crearCotizacionMock(j.id, 10.0, 0.5)),
    );

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      jugadoresActivos: [noClasificado, portero, ...defensas, ...medios, ...delanteros],
      minutosPorJugador: conMinutos([noClasificado, portero, ...defensas, ...medios, ...delanteros]),
      cotizacionesPorJugador: cotizaciones,
    });

    const ids = equipo.miembros.map((m) => m.jugadorId);
    expect(ids).not.toContain('nc1');
  });

  it('Exclusión correcta de jugadores con activo === false', () => {
    const p1Inactivo = crearJugadorMock('p1', 'Inactivo', 'Portero', false);
    const p2Activo = crearJugadorMock('p2', 'Activo', 'Portero', true);

    const defensas = [
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
    ];
    const medios = [
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
    ];
    const delanteros = [
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];

    const cotizaciones = new Map<string, Cotizacion>();
    cotizaciones.set('p1', crearCotizacionMock('p1', 50.0, 1.0));
    cotizaciones.set('p2', crearCotizacionMock('p2', 10.0, 0.5));
    [...defensas, ...medios, ...delanteros].forEach((j) =>
      cotizaciones.set(j.id, crearCotizacionMock(j.id, 10.0, 0.5)),
    );

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      jugadoresActivos: [p1Inactivo, p2Activo, ...defensas, ...medios, ...delanteros],
      minutosPorJugador: conMinutos([p1Inactivo, p2Activo, ...defensas, ...medios, ...delanteros]),
      cotizacionesPorJugador: cotizaciones,
    });

    const portero = equipo.miembros.find((m) => m.posicion === 'Portero');
    expect(portero?.jugadorId).toBe('p2');
  });

  it('Exclusión correcta de jugadores con cotizacion.sinEstadisticas === true', () => {
    const p1SinStats = crearJugadorMock('p1', 'Sin Stats', 'Portero', true);
    const p2ConStats = crearJugadorMock('p2', 'Con Stats', 'Portero', true);

    const defensas = [
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
    ];
    const medios = [
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
    ];
    const delanteros = [
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];

    const cotizaciones = new Map<string, Cotizacion>();
    cotizaciones.set('p1', crearCotizacionMock('p1', 50.0, 1.0, true));
    cotizaciones.set('p2', crearCotizacionMock('p2', 10.0, 0.5, false));
    [...defensas, ...medios, ...delanteros].forEach((j) =>
      cotizaciones.set(j.id, crearCotizacionMock(j.id, 10.0, 0.5, false)),
    );

    const equipo = EquipoSemanal.seleccionarOnceIdeal({
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      jugadoresActivos: [p1SinStats, p2ConStats, ...defensas, ...medios, ...delanteros],
      minutosPorJugador: conMinutos([p1SinStats, p2ConStats, ...defensas, ...medios, ...delanteros]),
      cotizacionesPorJugador: cotizaciones,
    });

    const portero = equipo.miembros.find((m) => m.posicion === 'Portero');
    expect(portero?.jugadorId).toBe('p2');
  });

  it('Edge case: cupo insuficiente en Porteros arroja ReglaDeNegocioException', () => {
    const jugadores = [
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];
    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));

    expect(() =>
      EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        minutosPorJugador: conMinutos(jugadores),
        cotizacionesPorJugador: cotizaciones,
      }),
    ).toThrow('No hay suficientes jugadores elegibles en la posición Portero');
  });

  it('Edge case: cupo insuficiente en Defensas arroja ReglaDeNegocioException', () => {
    const jugadores = [
      crearJugadorMock('p1', 'P1', 'Portero'),
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];
    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));

    expect(() =>
      EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        minutosPorJugador: conMinutos(jugadores),
        cotizacionesPorJugador: cotizaciones,
      }),
    ).toThrow('No hay suficientes jugadores elegibles en la posición Defensa');
  });

  it('Edge case: cupo insuficiente en Mediocampistas arroja ReglaDeNegocioException', () => {
    const jugadores = [
      crearJugadorMock('p1', 'P1', 'Portero'),
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];
    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));

    expect(() =>
      EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        minutosPorJugador: conMinutos(jugadores),
        cotizacionesPorJugador: cotizaciones,
      }),
    ).toThrow('No hay suficientes jugadores elegibles en la posición Mediocampista');
  });

  it('Edge case: cupo insuficiente en Delanteros arroja ReglaDeNegocioException', () => {
    const jugadores = [
      crearJugadorMock('p1', 'P1', 'Portero'),
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
    ];
    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));

    expect(() =>
      EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        minutosPorJugador: conMinutos(jugadores),
        cotizacionesPorJugador: cotizaciones,
      }),
    ).toThrow('No hay suficientes jugadores elegibles en la posición Delantero');
  });

  it('Resultado determinista: misma entrada genera la misma alineación', () => {
    const jugadores = [
      crearJugadorMock('p1', 'P1', 'Portero'),
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];
    const cotizaciones = new Map<string, Cotizacion>();
    jugadores.forEach((j, i) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10 + i, 0.5)));

    const params = {
      ano: 2026,
      semanaIso: 44,
      estrategiaId: 'GLOBAL' as const,
      estrategiaVersion: 'GLOBAL_v1' as const,
      jugadoresActivos: jugadores,
      minutosPorJugador: conMinutos(jugadores),
      cotizacionesPorJugador: cotizaciones,
    };

    const eq1 = EquipoSemanal.seleccionarOnceIdeal(params);
    const eq2 = EquipoSemanal.seleccionarOnceIdeal(params);

    expect(eq1.miembros.map((m) => m.jugadorId)).toEqual(
      eq2.miembros.map((m) => m.jugadorId),
    );
  });

  describe('validarInvariantes exhaustivo', () => {
    it('arroja ReglaDeNegocioException si la formación no es 4-3-3', () => {
      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-4-2',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros: crear11MiembrosValidos(),
        }),
      ).toThrow("La formación táctica debe ser '4-3-3'");
    });

    it('arroja ReglaDeNegocioException si estrategiaId o estrategiaVersion están vacías', () => {
      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: '' as any,
          estrategiaVersion: 'GLOBAL_v1',
          miembros: crear11MiembrosValidos(),
        }),
      ).toThrow('El identificador de la estrategia de cotización es obligatorio');

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: '' as any,
          miembros: crear11MiembrosValidos(),
        }),
      ).toThrow('La versión de la estrategia de cotización es obligatoria');
    });

    it('arroja ReglaDeNegocioException si la lista de miembros no tiene exactamente 11', () => {
      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros: crear11MiembrosValidos().slice(0, 10),
        }),
      ).toThrow('El Equipo de la Semana debe contener exactamente 11 jugadores titulares');
    });

    it('arroja ReglaDeNegocioException si hay jugadores duplicados', () => {
      const miembros = crear11MiembrosValidos();
      miembros[10] = MiembroEquipoSemanal.crear({
        equipoSemanalId: 'eq-1',
        jugadorId: miembros[0].jugadorId, // duplicado
        nombre: 'Duplicado',
        equipoNombre: 'Club',
        posicion: 'Delantero',
        cotizacion: 10,
        score: 0.5,
        orden: 11,
      });

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros,
        }),
      ).toThrow('No pueden existir jugadores duplicados');
    });

    it('arroja ReglaDeNegocioException ante distribución posicional incorrecta (ej. sin Portero, 5 Defensas)', () => {
      const miembros = [
        ...Array.from({ length: 5 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `d-${i + 1}`,
            nombre: `Def ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Defensa' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 1,
          }),
        ),
        ...Array.from({ length: 3 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `m-${i + 1}`,
            nombre: `Med ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Mediocampista' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 6,
          }),
        ),
        ...Array.from({ length: 3 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `f-${i + 1}`,
            nombre: `Del ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Delantero' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 9,
          }),
        ),
      ];

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros,
        }),
      ).toThrow('La formación 4-3-3 requiere exactamente 1 Portero');
    });

    it('arroja ReglaDeNegocioException si la cantidad de Mediocampistas o Delanteros es incorrecta', () => {
      // 1 Portero, 4 Defensas, 2 Mediocampistas, 4 Delanteros
      const miembros = [
        MiembroEquipoSemanal.crear({
          equipoSemanalId: 'eq-1',
          jugadorId: 'p-1',
          nombre: 'Port',
          equipoNombre: 'Club',
          posicion: 'Portero',
          cotizacion: 10,
          score: 0.5,
          orden: 1,
        }),
        ...Array.from({ length: 4 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `d-${i + 1}`,
            nombre: `Def ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Defensa' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 2,
          }),
        ),
        ...Array.from({ length: 2 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `m-${i + 1}`,
            nombre: `Med ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Mediocampista' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 6,
          }),
        ),
        ...Array.from({ length: 4 }).map((_, i) =>
          MiembroEquipoSemanal.crear({
            equipoSemanalId: 'eq-1',
            jugadorId: `f-${i + 1}`,
            nombre: `Del ${i + 1}`,
            equipoNombre: 'Club',
            posicion: 'Delantero' as const,
            cotizacion: 10,
            score: 0.5,
            orden: i + 8,
          }),
        ),
      ];

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros,
        }),
      ).toThrow('La formación 4-3-3 requiere exactamente 3 Mediocampistas');
    });

    it('arroja ReglaDeNegocioException si la cantidad de Delanteros es distinta de 3', () => {
      // 1 Portero, 4 Defensas, 3 Mediocampistas, 2 Delanteros, 1 con posición no reconocida
      const miembros = [
        ...crear11MiembrosValidos().slice(0, 10), // 1 POR, 4 DEF, 3 MED, 2 DEL
        {
          id: 'm-extra',
          equipoSemanalId: 'eq-1',
          jugadorId: 'j-extra',
          nombre: 'Extra',
          equipoNombre: 'Club',
          posicion: 'Otro' as any,
          cotizacion: 10,
          score: 0.5,
          orden: 11,
        } as any,
      ];

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 44,
          formacion: '4-3-3',
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros,
        }),
      ).toThrow('La formación 4-3-3 requiere exactamente 3 Delanteros');
    });

    it('arroja ReglaDeNegocioException si año < 2024 o semanaIso fuera de rango', () => {
      expect(() =>
        EquipoSemanal.recrear({
          ano: 2023,
          semanaIso: 44,
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros: crear11MiembrosValidos(),
        }),
      ).toThrow('El año del equipo semanal debe ser mayor o igual a 2024');

      expect(() =>
        EquipoSemanal.recrear({
          ano: 2026,
          semanaIso: 0,
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          miembros: crear11MiembrosValidos(),
        }),
      ).toThrow('La semana ISO debe estar entre 1 y 53');
    });
  });
  describe('Elegibilidad por minutos acumulados', () => {
    const armarPlantel = (): Jugador[] => [
      crearJugadorMock('p1', 'P1', 'Portero'),
      crearJugadorMock('p2', 'P2', 'Portero'),
      crearJugadorMock('d1', 'D1', 'Defensa'),
      crearJugadorMock('d2', 'D2', 'Defensa'),
      crearJugadorMock('d3', 'D3', 'Defensa'),
      crearJugadorMock('d4', 'D4', 'Defensa'),
      crearJugadorMock('m1', 'M1', 'Mediocampista'),
      crearJugadorMock('m2', 'M2', 'Mediocampista'),
      crearJugadorMock('m3', 'M3', 'Mediocampista'),
      crearJugadorMock('f1', 'F1', 'Delantero'),
      crearJugadorMock('f2', 'F2', 'Delantero'),
      crearJugadorMock('f3', 'F3', 'Delantero'),
    ];

    it('excluye al jugador con menos de 270 minutos aunque tenga la mejor cotización', () => {
      const jugadores = armarPlantel();
      const cotizaciones = new Map<string, Cotizacion>();
      jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));
      cotizaciones.set('p2', crearCotizacionMock('p2', 50, 0.9));
      const minutos = conMinutos(jugadores);
      minutos.set('p2', MINUTOS_MINIMOS_ELEGIBILIDAD - 1);

      const equipo = EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        cotizacionesPorJugador: cotizaciones,
        minutosPorJugador: minutos,
      });

      expect(equipo.miembros.find((m) => m.posicion === 'Portero')?.jugadorId).toBe('p1');
    });

    it('acepta al jugador con exactamente 270 minutos', () => {
      const jugadores = armarPlantel();
      const cotizaciones = new Map<string, Cotizacion>();
      jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));
      cotizaciones.set('p2', crearCotizacionMock('p2', 50, 0.9));
      const minutos = conMinutos(jugadores);
      minutos.set('p2', MINUTOS_MINIMOS_ELEGIBILIDAD);

      const equipo = EquipoSemanal.seleccionarOnceIdeal({
        ano: 2026,
        semanaIso: 44,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        jugadoresActivos: jugadores,
        cotizacionesPorJugador: cotizaciones,
        minutosPorJugador: minutos,
      });

      expect(equipo.miembros.find((m) => m.posicion === 'Portero')?.jugadorId).toBe('p2');
    });

    it('trata como no elegible al jugador sin registro de minutos', () => {
      const jugadores = armarPlantel().filter((j) => j.id !== 'p2');
      const cotizaciones = new Map<string, Cotizacion>();
      jugadores.forEach((j) => cotizaciones.set(j.id, crearCotizacionMock(j.id, 10, 0.5)));
      const minutos = conMinutos(jugadores);
      minutos.delete('p1');

      expect(() =>
        EquipoSemanal.seleccionarOnceIdeal({
          ano: 2026,
          semanaIso: 44,
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          jugadoresActivos: jugadores,
          cotizacionesPorJugador: cotizaciones,
          minutosPorJugador: minutos,
        }),
      ).toThrow('No hay suficientes jugadores elegibles en la posición Portero');
    });
  });

  describe('Semana ISO y cierre de semana', () => {
    const crearEquipo = (ano: number, semanaIso: number): EquipoSemanal =>
      EquipoSemanal.recrear({
        ano,
        semanaIso,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        miembros: crear11MiembrosValidos(),
      });

    it('obtenerAnoYSemanaIso usa el año ISO y UTC', () => {
      expect(obtenerAnoYSemanaIso(new Date('2025-12-29T00:00:00Z'))).toEqual({ ano: 2026, semanaIso: 1 });
      expect(obtenerAnoYSemanaIso(new Date('2026-11-02T01:00:00Z'))).toEqual({ ano: 2026, semanaIso: 45 });
      expect(obtenerAnoYSemanaIso(new Date('2026-11-01T23:59:59Z'))).toEqual({ ano: 2026, semanaIso: 44 });
    });

    it('la semana está abierta hasta el lunes siguiente a las 00:00 UTC', () => {
      const equipo = crearEquipo(2026, 45);
      expect(equipo.estaCerrada(new Date('2026-11-08T23:59:59Z'))).toBe(false);
      expect(equipo.estaCerrada(new Date('2026-11-09T00:00:00Z'))).toBe(true);
    });

    it('validarRegenerable rechaza una semana cerrada y acepta una abierta', () => {
      const equipo = crearEquipo(2026, 45);
      expect(() => equipo.validarRegenerable(new Date('2026-11-05T12:00:00Z'))).not.toThrow();
      expect(() => equipo.validarRegenerable(new Date('2026-11-10T12:00:00Z'))).toThrow(
        'ya está cerrada',
      );
    });
  });
});
