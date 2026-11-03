import { EquipoSemanal } from '../domain/equipo-semanal.entity';
import { MiembroEquipoSemanal } from '../domain/miembro-equipo-semanal.entity';
import { PosicionJugador } from '../domain/jugador.entity';
import {
  EstrategiaId,
  EstrategiaVersion,
} from '../domain/configuracion-mercado.entity';
import { EquipoSemanalOrmEntity } from './equipo-semanal.orm-entity';
import { MiembroEquipoSemanalOrmEntity } from './miembro-equipo-semanal.orm-entity';

export class EquipoSemanalMapper {
  public static toDomain(orm: EquipoSemanalOrmEntity): EquipoSemanal {
    const miembros = (orm.miembros ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((m) =>
        MiembroEquipoSemanal.crear({
          id: m.id,
          equipoSemanalId: m.equipoSemanalId,
          jugadorId: m.jugadorId,
          nombre: m.nombre,
          equipoNombre: m.equipoNombre,
          posicion: m.posicion as PosicionJugador,
          cotizacion: Number(m.cotizacion),
          score: Number(m.score),
          orden: m.orden,
        }),
      );

    return EquipoSemanal.recrear({
      id: orm.id,
      ano: orm.ano,
      semanaIso: orm.semanaIso,
      formacion: orm.formacion,
      estrategiaId: orm.estrategiaId as EstrategiaId,
      estrategiaVersion: orm.estrategiaVersion as EstrategiaVersion,
      fechaGeneracion: orm.fechaGeneracion,
      miembros,
    });
  }

  public static miembroToOrm(
    miembro: MiembroEquipoSemanal,
    equipoSemanalId: string,
  ): MiembroEquipoSemanalOrmEntity {
    const orm = new MiembroEquipoSemanalOrmEntity();
    orm.id = miembro.id;
    orm.equipoSemanalId = equipoSemanalId;
    orm.jugadorId = miembro.jugadorId;
    orm.nombre = miembro.nombre;
    orm.equipoNombre = miembro.equipoNombre;
    orm.posicion = miembro.posicion;
    orm.cotizacion = miembro.cotizacion;
    orm.score = miembro.score;
    orm.orden = miembro.orden;
    return orm;
  }

  public static toOrm(domain: EquipoSemanal): EquipoSemanalOrmEntity {
    const orm = new EquipoSemanalOrmEntity();
    orm.id = domain.id;
    orm.ano = domain.ano;
    orm.semanaIso = domain.semanaIso;
    orm.formacion = domain.formacion;
    orm.estrategiaId = domain.estrategiaId;
    orm.estrategiaVersion = domain.estrategiaVersion;
    orm.fechaGeneracion = domain.fechaGeneracion;
    orm.miembros = domain.miembros.map((m) =>
      EquipoSemanalMapper.miembroToOrm(m, domain.id),
    );
    return orm;
  }
}
