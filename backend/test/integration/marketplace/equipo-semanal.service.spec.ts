import { EquipoSemanalService } from '../../../src/services/equipo-semanal.service';
import { EquipoSemanal } from '../../../src/domain/equipo-semanal.entity';
import { Jugador } from '../../../src/domain/jugador.entity';
import { Cotizacion } from '../../../src/domain/cotizacion.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EquipoSemanalService (Service Integration & Orchestration)', () => {
  let service: EquipoSemanalService;
  let mockJugadorRepo: any;
  let mockCotizacionRepo: any;
  let mockConfigRepo: any;
  let mockEquipoSemanalRepo: any;
  let mockEstadisticaRepo: any;
  let minutosPorJugador: Map<string, number>;
  let mockCacheService: any;

  let baseJugadores: Jugador[];
  let baseCotizaciones: Map<string, Cotizacion>;
  let equiposGuardados: EquipoSemanal[];

  const crearJugador = (
    id: string,
    nombre: string,
    posicion: 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero',
    activo = true,
  ): Jugador => {
    return Jugador.crear({
      id,
      externalId: Math.floor(Math.random() * 100000),
      nombre,
      posicion,
      equipoId: 'eq-1',
      ligaId: 'liga-1',
      activo,
      equipo: { nombre: 'Club de Prueba' } as any,
    });
  };

  const crearCotizacion = (
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

  beforeEach(() => {
    equiposGuardados = [];

    baseJugadores = [
      crearJugador('p1', 'Emiliano Martinez', 'Portero'),
      crearJugador('d1', 'Cristian Romero', 'Defensa'),
      crearJugador('d2', 'Nicolas Otamendi', 'Defensa'),
      crearJugador('d3', 'Lisandro Martinez', 'Defensa'),
      crearJugador('d4', 'Nahuel Molina', 'Defensa'),
      crearJugador('m1', 'Rodrigo De Paul', 'Mediocampista'),
      crearJugador('m2', 'Enzo Fernandez', 'Mediocampista'),
      crearJugador('m3', 'Alexis Mac Allister', 'Mediocampista'),
      crearJugador('f1', 'Lionel Messi', 'Delantero'),
      crearJugador('f2', 'Julian Alvarez', 'Delantero'),
      crearJugador('f3', 'Lautaro Martinez', 'Delantero'),
    ];

    baseCotizaciones = new Map<string, Cotizacion>();
    baseJugadores.forEach((j, i) => {
      baseCotizaciones.set(j.id, crearCotizacion(j.id, 10 + i, 0.8));
    });

    mockJugadorRepo = {
      listarActivos: jest.fn().mockImplementation(async () => baseJugadores.filter((j) => j.activo)),
    };

    mockCotizacionRepo = {
      obtenerUltimasPorJugadores: jest.fn().mockImplementation(async () => baseCotizaciones),
    };

    minutosPorJugador = new Map(baseJugadores.map((j) => [j.id, 900]));
    mockEstadisticaRepo = {
      buscarPorJugadores: jest.fn().mockImplementation(async () =>
        Array.from(minutosPorJugador.entries()).map(([jugadorId, minutosJugados]) => ({
          jugadorId,
          temporada: '2025/2026',
          minutosJugados,
        })),
      ),
    };

    mockConfigRepo = {
      obtenerConfiguracion: jest.fn().mockResolvedValue({
        id: 1,
        estrategiaActivaId: 'GLOBAL',
        estrategiaActivaVersion: 'GLOBAL_v1',
      }),
    };

    mockEquipoSemanalRepo = {
      guardarOSobrescribir: jest.fn().mockImplementation(async (equipo: EquipoSemanal) => {
        const idx = equiposGuardados.findIndex(
          (e) => e.ano === equipo.ano && e.semanaIso === equipo.semanaIso,
        );
        if (idx >= 0) {
          equiposGuardados[idx] = equipo;
        } else {
          equiposGuardados.push(equipo);
        }
      }),
      obtenerVigente: jest.fn().mockImplementation(async () => {
        return equiposGuardados.length > 0
          ? equiposGuardados[equiposGuardados.length - 1]
          : null;
      }),
      obtenerPorSemana: jest.fn().mockImplementation(async (ano: number, semanaIso: number) => {
        return (
          equiposGuardados.find(
            (e) => e.ano === ano && e.semanaIso === semanaIso,
          ) || null
        );
      }),
      listarSemanasDisponibles: jest.fn().mockImplementation(async () => {
        return equiposGuardados.map((e) => ({
          ano: e.ano,
          semanaIso: e.semanaIso,
          fechaGeneracion: e.fechaGeneracion,
        }));
      }),
    };

    const cacheStore = new Map<string, any>();
    mockCacheService = {
      obtenerEquipoSemanal: jest.fn().mockImplementation(async (key: string) => cacheStore.get(key) || null),
      guardarEquipoSemanal: jest.fn().mockImplementation(async (key: string, val: any) => {
        cacheStore.set(key, val);
      }),
      invalidarEquipoSemanal: jest.fn().mockImplementation(async () => {
        cacheStore.clear();
      }),
    };

    service = new EquipoSemanalService(
      mockJugadorRepo,
      mockCotizacionRepo,
      mockConfigRepo,
      mockEquipoSemanalRepo,
      mockEstadisticaRepo,
      mockCacheService,
    );
  });

  it('Happy path: generarEquipoSemanaActual devuelve equipo con 11 miembros en formación 4-3-3 y lo persiste', async () => {
    const equipo = await service.generarEquipoSemanaActual();

    expect(equipo).toBeDefined();
    expect(equipo.formacion).toBe('4-3-3');
    expect(equipo.miembros).toHaveLength(11);
    expect(mockEquipoSemanalRepo.guardarOSobrescribir).toHaveBeenCalledTimes(1);
    expect(mockCacheService.invalidarEquipoSemanal).toHaveBeenCalledTimes(1);
    expect(equiposGuardados).toHaveLength(1);
  });

  it('Idempotencia: segunda llamada para la misma semana sobrescribe el equipo sin duplicar registros', async () => {
    await service.generarEquipoSemanaActual();
    await service.generarEquipoSemanaActual();

    expect(mockEquipoSemanalRepo.guardarOSobrescribir).toHaveBeenCalledTimes(2);
    expect(equiposGuardados).toHaveLength(1);
  });

  it('Exclusión: jugador inactivo no aparece en el once final', async () => {
    const porteroInactivo = crearJugador('p-inactivo', 'Portero Inactivo', 'Portero', false);
    baseJugadores.push(porteroInactivo);
    baseCotizaciones.set(porteroInactivo.id, crearCotizacion(porteroInactivo.id, 999.0, 1.0));

    const equipo = await service.generarEquipoSemanaActual();
    const miembrosIds = equipo.miembros.map((m) => m.jugadorId);

    expect(miembrosIds).not.toContain('p-inactivo');
  });

  it('Cupo insuficiente: si no hay porteros elegibles, el método arroja ReglaDeNegocioException', async () => {
    baseJugadores = baseJugadores.filter((j) => j.posicion !== 'Portero');

    await expect(service.generarEquipoSemanaActual()).rejects.toThrow(
      ReglaDeNegocioException,
    );
  });

  it('obtenerVigente retorna null si la base está vacía y no cachea', async () => {
    const res = await service.obtenerVigente();
    expect(res).toBeNull();
    expect(mockCacheService.guardarEquipoSemanal).not.toHaveBeenCalled();
  });

  it('obtenerVigente recupera de base de datos y cachea en subsiguientes llamadas', async () => {
    await service.generarEquipoSemanaActual();

    const eq1 = await service.obtenerVigente();
    expect(eq1).toBeDefined();
    expect(mockCacheService.guardarEquipoSemanal).toHaveBeenCalledWith(
      'vigente',
      expect.any(Object),
      1800,
    );

    const eq2 = await service.obtenerVigente();
    expect(eq2).toBeDefined();
    expect(eq2?.id).toBe(eq1?.id);
  });

  it('obtenerPorSemana retorna null si no existe o el equipo correspondiente si existe y usa caché', async () => {
    const vacio = await service.obtenerPorSemana(2025, 1);
    expect(vacio).toBeNull();

    const generado = await service.generarEquipoSemanaActual();
    const encontrado = await service.obtenerPorSemana(generado.ano, generado.semanaIso);
    expect(encontrado).toBeDefined();
    expect(encontrado?.id).toBe(generado.id);

    // Segunda llamada lee desde caché
    const desdeCache = await service.obtenerPorSemana(generado.ano, generado.semanaIso);
    expect(desdeCache).toBeDefined();
    expect(desdeCache?.id).toBe(generado.id);
  });

  it('listarSemanasDisponibles retorna semanas disponibles y cachea', async () => {
    await service.generarEquipoSemanaActual();

    const semanas = await service.listarSemanasDisponibles();
    expect(semanas).toHaveLength(1);
    expect(mockCacheService.guardarEquipoSemanal).toHaveBeenCalledWith(
      'semanas',
      expect.any(Array),
      1800,
    );

    // Segunda llamada lee desde caché
    const semanasDesdeCache = await service.listarSemanasDisponibles();
    expect(semanasDesdeCache).toHaveLength(1);
  });

  it('Mínimo de minutos: un portero con menos de 270 minutos no entra aunque tenga la mejor cotización', async () => {
    const suplente = crearJugador('p-suplente', 'Portero Suplente', 'Portero');
    baseJugadores.push(suplente);
    baseCotizaciones.set(suplente.id, crearCotizacion(suplente.id, 999.0, 1.0));
    minutosPorJugador.set(suplente.id, 120);

    const equipo = await service.generarEquipoSemanaActual();

    expect(equipo.miembros.map((m) => m.jugadorId)).not.toContain('p-suplente');
  });

  it('Mínimo de minutos: usa solo la temporada más reciente de cada jugador', async () => {
    mockEstadisticaRepo.buscarPorJugadores.mockImplementation(async () => [
      { jugadorId: 'p1', temporada: '2024/2025', minutosJugados: 3000 },
      { jugadorId: 'p1', temporada: '2025/2026', minutosJugados: 90 },
      ...baseJugadores
        .filter((j) => j.id !== 'p1')
        .map((j) => ({ jugadorId: j.id, temporada: '2025/2026', minutosJugados: 900 })),
    ]);

    await expect(service.generarEquipoSemanaActual()).rejects.toThrow(
      ReglaDeNegocioException,
    );
  });

  describe('generarAutomatico', () => {
    it('genera el equipo cuando no existe para la semana ISO', async () => {
      const res = await service.generarAutomatico(new Date('2026-11-02T01:00:00Z'));

      expect(res.generado).toBe(true);
      expect(res.equipo?.semanaIso).toBe(45);
      expect(equiposGuardados).toHaveLength(1);
    });

    it('es idempotente: si ya existe equipo para la semana no lo modifica', async () => {
      await service.generarAutomatico(new Date('2026-11-02T01:00:00Z'));
      const res = await service.generarAutomatico(new Date('2026-11-02T01:30:00Z'));

      expect(res.generado).toBe(false);
      expect(mockEquipoSemanalRepo.guardarOSobrescribir).toHaveBeenCalledTimes(1);
    });

    it('si falta cupo registra la advertencia y no publica nada', async () => {
      baseJugadores = baseJugadores.filter((j) => j.posicion !== 'Portero');

      const res = await service.generarAutomatico(new Date('2026-11-02T01:00:00Z'));

      expect(res.generado).toBe(false);
      expect(res.motivo).toContain('Portero');
      expect(equiposGuardados).toHaveLength(0);
    });
  });

  describe('calcularAnoYSemanaIso', () => {
    it('calcula semana ISO correctamente en domingos y lunes', () => {
      const { calcularAnoYSemanaIso } = require('../../../src/services/equipo-semanal.service');
      const domingo = new Date(Date.UTC(2026, 10, 8)); // 8 Nov 2026 (Domingo de la misma semana ISO)
      const resDom = calcularAnoYSemanaIso(domingo);
      expect(resDom.ano).toBe(2026);
      expect(resDom.semanaIso).toBe(45);

      const lunes = new Date(Date.UTC(2026, 10, 2)); // 2 Nov 2026 (Lunes)
      const resLun = calcularAnoYSemanaIso(lunes);
      expect(resLun.ano).toBe(2026);
      expect(resLun.semanaIso).toBe(45);

      const porDefecto = calcularAnoYSemanaIso();
      expect(porDefecto.ano).toBeGreaterThanOrEqual(2024);
    });
  });
});
