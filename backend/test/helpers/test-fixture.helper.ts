import { DataSource } from 'typeorm';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';
import { UsuarioOrmEntity } from '../../src/data-access/usuario.orm-entity';

export class TestFixtureHelper {
  static async seedLiga(
    dataSource: DataSource,
    overrides?: Partial<LigaOrmEntity>
  ): Promise<LigaOrmEntity> {
    const repo = dataSource.getRepository(LigaOrmEntity);
    const suffix = Math.floor(Math.random() * 100000);
    const liga = repo.create({
      id: overrides?.id || `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`,
      codigo: overrides?.codigo || `LIG${suffix}`,
      nombre: overrides?.nombre || `Liga Test ${suffix}`,
      pais: overrides?.pais || 'Espana',
      emblemaUrl: overrides?.emblemaUrl || null,
      activo: overrides?.activo ?? true,
      ...overrides,
    });
    return repo.save(liga);
  }

  static async seedEquipo(
    dataSource: DataSource,
    overrides?: Partial<EquipoOrmEntity> & { ligaId?: string }
  ): Promise<EquipoOrmEntity> {
    const repo = dataSource.getRepository(EquipoOrmEntity);
    const suffix = Math.floor(Math.random() * 100000);

    let ligaId = overrides?.ligaId;
    if (!ligaId && !overrides?.liga) {
      const liga = await this.seedLiga(dataSource);
      ligaId = liga.id;
    }

    const equipo = repo.create({
      id: overrides?.id || `00000000-0000-4000-8000-${String(suffix).padStart(12, '1')}`,
      externalId: overrides?.externalId || suffix,
      nombre: overrides?.nombre || `Equipo Test ${suffix}`,
      nombreCorto: overrides?.nombreCorto || `Eq${suffix}`,
      tla: overrides?.tla || `E${suffix % 100}`,
      escudoUrl: overrides?.escudoUrl || null,
      ligaId: ligaId || overrides?.liga?.id,
      ...overrides,
    });
    return repo.save(equipo);
  }

  static async seedJugador(
    dataSource: DataSource,
    overrides?: Partial<JugadorOrmEntity> & { equipoId?: string; ligaId?: string }
  ): Promise<JugadorOrmEntity> {
    const repo = dataSource.getRepository(JugadorOrmEntity);
    const suffix = Math.floor(Math.random() * 100000);

    let ligaId = overrides?.ligaId;
    let equipoId = overrides?.equipoId;

    if (!ligaId && !overrides?.liga) {
      const liga = await this.seedLiga(dataSource);
      ligaId = liga.id;
    }

    if (!equipoId && !overrides?.equipo) {
      const equipo = await this.seedEquipo(dataSource, { ligaId });
      equipoId = equipo.id;
    }

    const jugador = repo.create({
      id: overrides?.id || `00000000-0000-4000-8000-${String(suffix).padStart(12, '2')}`,
      externalId: overrides?.externalId || suffix,
      nombre: overrides?.nombre || `Jugador Test ${suffix}`,
      posicion: overrides?.posicion || 'Delantero',
      posicionOriginal: overrides?.posicionOriginal || 'Attacking Midfield',
      fechaNacimiento: overrides?.fechaNacimiento || '1995-05-15',
      nacionalidad: overrides?.nacionalidad || 'Argentina',
      dorsal: overrides?.dorsal ?? 10,
      equipoId: equipoId || overrides?.equipo?.id,
      ligaId: ligaId || overrides?.liga?.id,
      activo: overrides?.activo ?? true,
      ...overrides,
    });
    return repo.save(jugador);
  }

  static async seedUsuario(
    dataSource: DataSource,
    overrides?: Partial<UsuarioOrmEntity>
  ): Promise<UsuarioOrmEntity> {
    const repo = dataSource.getRepository(UsuarioOrmEntity);
    const suffix = Math.floor(Math.random() * 100000);
    const usuario = repo.create({
      id: overrides?.id || `00000000-0000-4000-8000-${String(suffix).padStart(12, '3')}`,
      nombre: overrides?.nombre || `Usuario Test ${suffix}`,
      correo: overrides?.correo || `test${suffix}@ejemplo.com`,
      contrasenaHash:
        overrides?.contrasenaHash ||
        '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      activo: overrides?.activo ?? true,
      ...overrides,
    });
    return repo.save(usuario);
  }
}
