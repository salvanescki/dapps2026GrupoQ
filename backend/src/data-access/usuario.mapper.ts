import { Usuario } from '../domain/usuario.entity';
import { UsuarioOrmEntity } from './usuario.orm-entity';

export class UsuarioMapper {
  public static toDomain(orm: UsuarioOrmEntity): Usuario {
    if (!orm) return null;
    return Usuario.crear({
      id: orm.id,
      nombre: orm.nombre,
      correo: orm.correo,
      contrasenaHash: orm.contrasenaHash,
      activo: orm.activo,
      creadoEn: orm.creadoEn,
      actualizadoEn: orm.actualizadoEn,
    });
  }

  public static toOrm(domain: Usuario): UsuarioOrmEntity {
    if (!domain) return null;
    const orm = new UsuarioOrmEntity();
    orm.id = domain.id;
    orm.nombre = domain.nombre;
    orm.correo = domain.correo;
    orm.contrasenaHash = domain.contrasenaHash;
    orm.activo = domain.activo;
    orm.creadoEn = domain.creadoEn;
    orm.actualizadoEn = domain.actualizadoEn;
    return orm;
  }
}
