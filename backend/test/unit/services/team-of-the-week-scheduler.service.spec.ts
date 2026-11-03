import { TeamOfTheWeekSchedulerService } from '../../../src/services/scheduler/team-of-the-week-scheduler.service';

describe('TeamOfTheWeekSchedulerService', () => {
  let queryRunner: any;
  let dataSource: any;
  let equipoSemanalService: any;
  let quotesService: any;
  let scheduler: TeamOfTheWeekSchedulerService;
  let orden: string[];

  beforeEach(() => {
    orden = [];
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([{ lock_acquired: true }]),
    };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    equipoSemanalService = {
      existeEquipoSemanaActual: jest.fn().mockResolvedValue(false),
      generarAutomatico: jest.fn().mockImplementation(async () => {
        orden.push('generar');
        return { generado: true, equipo: { ano: 2026, semanaIso: 45 } };
      }),
    };
    quotesService = {
      recalcularCotizacionesActivas: jest.fn().mockImplementation(async () => {
        orden.push('recalcular');
        return { procesados: 1, fallidos: 0, duracionMs: 1 };
      }),
    };
    scheduler = new TeamOfTheWeekSchedulerService(
      dataSource,
      equipoSemanalService,
      quotesService,
    );
  });

  it('recalcula las cotizaciones y después genera el equipo, liberando el lock', async () => {
    const res = await scheduler.ejecutarGeneracionSemanal();

    expect(res.ejecutado).toBe(true);
    expect(orden).toEqual(['recalcular', 'generar']);
    const sqls = queryRunner.query.mock.calls.map((c: any[]) => c[0]);
    expect(sqls.some((q: string) => q.includes('pg_advisory_unlock'))).toBe(true);
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('omite la ejecución si otra instancia tiene el lock', async () => {
    queryRunner.query.mockResolvedValueOnce([{ lock_acquired: false }]);

    const res = await scheduler.ejecutarGeneracionSemanal();

    expect(res.ejecutado).toBe(false);
    expect(quotesService.recalcularCotizacionesActivas).not.toHaveBeenCalled();
    expect(equipoSemanalService.generarAutomatico).not.toHaveBeenCalled();
  });

  it('omite todo (incluido el recálculo) si ya existe equipo para la semana', async () => {
    equipoSemanalService.existeEquipoSemanaActual.mockResolvedValue(true);

    const res = await scheduler.ejecutarGeneracionSemanal();

    expect(res.ejecutado).toBe(false);
    expect(quotesService.recalcularCotizacionesActivas).not.toHaveBeenCalled();
  });

  it('no marca ejecutado si el cupo es insuficiente', async () => {
    equipoSemanalService.generarAutomatico.mockResolvedValue({
      generado: false,
      motivo: 'sin cupo',
    });

    const res = await scheduler.ejecutarGeneracionSemanal();

    expect(res.ejecutado).toBe(false);
  });
});
