import { Liga } from '../domain/liga.entity';
import { LigaOrmEntity } from './liga.orm-entity';

export class LigaMapper {
  public static toDomain(orm: LigaOrmEntity): Liga | null {
    if (!orm) return null;
    return Liga.crear({
      id: orm.id,
      codigo: orm.codigo,
      nombre: orm.nombre,
      pais: orm.pais,
      emblemaUrl: orm.emblemaUrl,
      activo: orm.activo,
      creadoEn: orm.creadoEn,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(domain: Liga): LigaOrmEntity | null {
    if (!domain) return null;
    const orm = new LigaOrmEntity();
    orm.id = domain.id;
    orm.codigo = domain.codigo;
    orm.nombre = domain.nombre;
    orm.pais = domain.pais;
    orm.emblemaUrl = domain.emblemaUrl;
    orm.activo = domain.activo;
    orm.creadoEn = domain.creadoEn;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
