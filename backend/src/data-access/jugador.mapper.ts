import { Jugador, PosicionJugador } from '../domain/jugador.entity';
import { JugadorOrmEntity } from './jugador.orm-entity';
import { EquipoMapper } from './equipo.mapper';
import { LigaMapper } from './liga.mapper';

export class JugadorMapper {
  public static toDomain(orm: JugadorOrmEntity): Jugador | null {
    if (!orm) return null;
    return Jugador.crear({
      id: orm.id,
      externalId: orm.externalId,
      nombre: orm.nombre,
      posicion: orm.posicion as PosicionJugador,
      posicionOriginal: orm.posicionOriginal,
      fechaNacimiento: orm.fechaNacimiento,
      nacionalidad: orm.nacionalidad,
      dorsal: orm.dorsal,
      equipoId: orm.equipoId,
      ligaId: orm.ligaId,
      activo: orm.activo,
      creadoEn: orm.creadoEn,
      actualizadoEn: orm.actualizadoEn,
      equipo: orm.equipo ? EquipoMapper.toDomain(orm.equipo) : null,
      liga: orm.liga ? LigaMapper.toDomain(orm.liga) : null,
    });
  }

  public static toOrm(domain: Jugador): JugadorOrmEntity | null {
    if (!domain) return null;
    const orm = new JugadorOrmEntity();
    orm.id = domain.id;
    orm.externalId = domain.externalId;
    orm.nombre = domain.nombre;
    orm.posicion = domain.posicion;
    orm.posicionOriginal = domain.posicionOriginal;
    orm.fechaNacimiento = domain.fechaNacimiento;
    orm.nacionalidad = domain.nacionalidad;
    orm.dorsal = domain.dorsal;
    orm.equipoId = domain.equipoId;
    orm.ligaId = domain.ligaId;
    orm.activo = domain.activo;
    orm.creadoEn = domain.creadoEn;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
