import { EquipoSemanalMapper } from '../../../src/data-access/equipo-semanal.mapper';
import { EquipoSemanalOrmEntity } from '../../../src/data-access/equipo-semanal.orm-entity';
import { MiembroEquipoSemanalOrmEntity } from '../../../src/data-access/miembro-equipo-semanal.orm-entity';
import { EquipoSemanal } from '../../../src/domain/equipo-semanal.entity';
import { MiembroEquipoSemanal } from '../../../src/domain/miembro-equipo-semanal.entity';
import { PosicionJugador } from '../../../src/domain/jugador.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('EquipoSemanalMapper', () => {
  const equipoId = 'e0000000-0000-0000-0000-000000000001';
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

  const crearMiembrosOrm = () =>
    posiciones.map((posicion, i) => {
      const m = new MiembroEquipoSemanalOrmEntity();
      m.id = `m0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      m.equipoSemanalId = equipoId;
      m.jugadorId = `j0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      m.nombre = `Jugador ${i + 1}`;
      m.equipoNombre = 'Club Test';
      m.posicion = posicion;
      m.cotizacion = '12.50' as unknown as number;
      m.score = '0.8000' as unknown as number;
      m.orden = i + 1;
      return m;
    });

  const crearOrm = (miembros?: MiembroEquipoSemanalOrmEntity[]) => {
    const orm = new EquipoSemanalOrmEntity();
    orm.id = equipoId;
    orm.ano = 2026;
    orm.semanaIso = 45;
    orm.formacion = '4-3-3';
    orm.estrategiaId = 'GLOBAL';
    orm.estrategiaVersion = 'GLOBAL_v1';
    orm.fechaGeneracion = new Date('2026-11-02T01:00:00.000Z');
    orm.miembros = miembros as MiembroEquipoSemanalOrmEntity[];
    return orm;
  };

  it('toDomain ordena los miembros por orden y convierte numéricos de texto a número', () => {
    const dominio = EquipoSemanalMapper.toDomain(
      crearOrm(crearMiembrosOrm().reverse()),
    );

    expect(dominio.id).toBe(equipoId);
    expect(dominio.ano).toBe(2026);
    expect(dominio.semanaIso).toBe(45);
    expect(dominio.miembros.map((m) => m.orden)).toEqual(
      posiciones.map((_, i) => i + 1),
    );
    expect(dominio.miembros[0].cotizacion).toBe(12.5);
    expect(dominio.miembros[0].score).toBe(0.8);
  });

  it('toDomain rechaza un equipo sin miembros cargados', () => {
    expect(() => EquipoSemanalMapper.toDomain(crearOrm(undefined))).toThrow(
      ReglaDeNegocioException,
    );
  });

  it('toOrm propaga todos los campos y el id del equipo a cada miembro', () => {
    const dominio = EquipoSemanalMapper.toDomain(crearOrm(crearMiembrosOrm()));

    const orm = EquipoSemanalMapper.toOrm(dominio);

    expect(orm.id).toBe(equipoId);
    expect(orm.formacion).toBe('4-3-3');
    expect(orm.miembros).toHaveLength(11);
    expect(orm.miembros[0]).toMatchObject({
      equipoSemanalId: equipoId,
      nombre: 'Jugador 1',
      posicion: 'Portero',
      cotizacion: 12.5,
      score: 0.8,
      orden: 1,
    });
  });

  it('miembroToOrm usa el id de equipo indicado', () => {
    const miembro = MiembroEquipoSemanal.crear({
      equipoSemanalId: equipoId,
      jugadorId: 'j0000000-0000-0000-0000-000000000099',
      nombre: 'Jugador',
      equipoNombre: 'Club Test',
      posicion: 'Portero',
      cotizacion: 9.99,
      score: 0.5,
      orden: 1,
    });

    const orm = EquipoSemanalMapper.miembroToOrm(miembro, 'otro-equipo');

    expect(orm.equipoSemanalId).toBe('otro-equipo');
    expect(orm.id).toBe(miembro.id);
  });

  it('el dominio reconstruido es una instancia de EquipoSemanal', () => {
    expect(
      EquipoSemanalMapper.toDomain(crearOrm(crearMiembrosOrm())),
    ).toBeInstanceOf(EquipoSemanal);
  });
});
