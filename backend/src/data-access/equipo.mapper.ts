import { Equipo } from '../domain/equipo.entity';
import { EquipoOrmEntity } from './equipo.orm-entity';

export class EquipoMapper {
  public static toDomain(orm: EquipoOrmEntity): Equipo | null {
    if (!orm) return null;
    return Equipo.crear({
      id: orm.id,
      externalId: orm.externalId,
      nombre: orm.nombre,
      nombreCorto: orm.nombreCorto,
      tla: orm.tla,
      escudoUrl: orm.escudoUrl,
      ligaId: orm.ligaId,
      creadoEn: orm.creadoEn,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(domain: Equipo): EquipoOrmEntity | null {
    if (!domain) return null;
    const orm = new EquipoOrmEntity();
    orm.id = domain.id;
    orm.externalId = domain.externalId;
    orm.nombre = domain.nombre;
    orm.nombreCorto = domain.nombreCorto;
    orm.tla = domain.tla;
    orm.escudoUrl = domain.escudoUrl;
    orm.ligaId = domain.ligaId;
    orm.creadoEn = domain.creadoEn;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
