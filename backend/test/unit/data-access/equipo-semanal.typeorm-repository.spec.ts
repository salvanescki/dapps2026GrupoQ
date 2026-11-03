import { DataSource } from 'typeorm';
import { EquipoSemanalTypeOrmRepository } from '../../../src/data-access/equipo-semanal.typeorm-repository';
import { EquipoSemanalOrmEntity } from '../../../src/data-access/equipo-semanal.orm-entity';
import { MiembroEquipoSemanalOrmEntity } from '../../../src/data-access/miembro-equipo-semanal.orm-entity';
import { EquipoSemanalMapper } from '../../../src/data-access/equipo-semanal.mapper';
import { EquipoSemanal } from '../../../src/domain/equipo-semanal.entity';
import { MiembroEquipoSemanal } from '../../../src/domain/miembro-equipo-semanal.entity';
import { PosicionJugador } from '../../../src/domain/jugador.entity';

describe('EquipoSemanalTypeOrmRepository', () => {
  const equipoId = 'e0000000-0000-0000-0000-000000000001';

  let repoEquipo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let repoMiembro: { delete: jest.Mock; save: jest.Mock };
  let repositorio: EquipoSemanalTypeOrmRepository;

  const posiciones: PosicionJugador[] = [
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

  const crearDominio = () =>
    EquipoSemanal.recrear({
      id: equipoId,
      ano: 2026,
      semanaIso: 45,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      miembros: posiciones.map((posicion, i) =>
        MiembroEquipoSemanal.crear({
          equipoSemanalId: equipoId,
          jugadorId: `j0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
          nombre: `Jugador ${i + 1}`,
          equipoNombre: 'Club Test',
          posicion,
          cotizacion: 5,
          score: 0.5,
          orden: i + 1,
        }),
      ),
    });

  const crearOrm = () => {
    const orm = new EquipoSemanalOrmEntity();
    orm.id = equipoId;
    orm.ano = 2026;
    orm.semanaIso = 45;
    orm.formacion = '4-3-3';
    orm.estrategiaId = 'GLOBAL';
    orm.estrategiaVersion = 'GLOBAL_v1';
    orm.fechaGeneracion = new Date('2026-11-02T01:00:00.000Z');
    orm.miembros = EquipoSemanalMapper.toOrm(crearDominio()).miembros;
    return orm;
  };

  beforeEach(() => {
    repoEquipo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    repoMiembro = { delete: jest.fn(), save: jest.fn() };

    const getRepository = (entidad: unknown) =>
      entidad === EquipoSemanalOrmEntity ? repoEquipo : repoMiembro;
    const manager = { getRepository };
    const dataSource = {
      getRepository,
      transaction: jest.fn((cb: (m: typeof manager) => Promise<void>) =>
        cb(manager),
      ),
    } as unknown as DataSource;

    repositorio = new EquipoSemanalTypeOrmRepository(dataSource);
  });

  describe('guardarOSobrescribir', () => {
    it('crea el equipo cuando la semana no existe', async () => {
      repoEquipo.findOne.mockResolvedValue(null);

      await repositorio.guardarOSobrescribir(crearDominio());

      expect(repoEquipo.save).toHaveBeenCalledTimes(1);
      expect(repoMiembro.delete).not.toHaveBeenCalled();
      expect(repoEquipo.update).not.toHaveBeenCalled();
    });

    it('reemplaza los miembros y actualiza la cabecera cuando la semana ya existe', async () => {
      const existente = crearOrm();
      repoEquipo.findOne.mockResolvedValue(existente);

      await repositorio.guardarOSobrescribir(crearDominio());

      expect(repoMiembro.delete).toHaveBeenCalledWith({
        equipoSemanalId: existente.id,
      });
      expect(repoEquipo.update).toHaveBeenCalledWith(
        existente.id,
        expect.objectContaining({ formacion: '4-3-3', estrategiaId: 'GLOBAL' }),
      );
      const guardados = repoMiembro.save.mock
        .calls[0][0] as MiembroEquipoSemanalOrmEntity[];
      expect(guardados).toHaveLength(11);
      expect(guardados[0].equipoSemanalId).toBe(existente.id);
      expect(repoEquipo.save).not.toHaveBeenCalled();
    });
  });

  describe('obtenerVigente', () => {
    it('devuelve el equipo más reciente', async () => {
      repoEquipo.findOne.mockResolvedValue(crearOrm());

      const resultado = await repositorio.obtenerVigente();

      expect(resultado?.semanaIso).toBe(45);
      expect(repoEquipo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { ano: 'DESC', semanaIso: 'DESC' } }),
      );
    });

    it('devuelve null si no hay equipos', async () => {
      repoEquipo.findOne.mockResolvedValue(null);

      await expect(repositorio.obtenerVigente()).resolves.toBeNull();
    });
  });

  describe('obtenerPorSemana', () => {
    it('devuelve el equipo de la semana pedida', async () => {
      repoEquipo.findOne.mockResolvedValue(crearOrm());

      const resultado = await repositorio.obtenerPorSemana(2026, 45);

      expect(resultado?.ano).toBe(2026);
      expect(repoEquipo.findOne).toHaveBeenCalledWith({
        where: { ano: 2026, semanaIso: 45 },
      });
    });

    it('devuelve null si la semana no existe', async () => {
      repoEquipo.findOne.mockResolvedValue(null);

      await expect(repositorio.obtenerPorSemana(2026, 44)).resolves.toBeNull();
    });
  });

  describe('listarSemanasDisponibles', () => {
    it('convierte las filas crudas a resúmenes tipados', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            ano: '2026',
            semanaIso: '45',
            fechaGeneracion: '2026-11-02T01:00:00.000Z',
          },
        ]),
      };
      repoEquipo.createQueryBuilder.mockReturnValue(qb);

      const resultado = await repositorio.listarSemanasDisponibles();

      expect(resultado).toEqual([
        {
          ano: 2026,
          semanaIso: 45,
          fechaGeneracion: new Date('2026-11-02T01:00:00.000Z'),
        },
      ]);
    });
  });
});
