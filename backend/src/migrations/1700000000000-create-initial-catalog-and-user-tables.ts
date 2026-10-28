import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialCatalogAndUserTables1700000000000
  implements MigrationInterface
{
  name = 'CreateInitialCatalogAndUserTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla usuarios
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(255) NOT NULL UNIQUE,
        contrasena_hash VARCHAR(255) NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Tabla ligas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ligas (
        id UUID PRIMARY KEY,
        codigo VARCHAR(10) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        pais VARCHAR(100) NOT NULL,
        emblema_url VARCHAR(500) NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ligas_codigo ON ligas (codigo);
    `);

    // 3. Tabla equipos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id UUID PRIMARY KEY,
        external_id INTEGER NOT NULL UNIQUE,
        nombre VARCHAR(150) NOT NULL,
        nombre_corto VARCHAR(100) NULL,
        tla VARCHAR(10) NULL,
        escudo_url VARCHAR(500) NULL,
        liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_equipos_external_id ON equipos (external_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipos_liga_id ON equipos (liga_id);
    `);

    // 4. Tabla jugadores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jugadores (
        id UUID PRIMARY KEY,
        external_id INTEGER NOT NULL UNIQUE,
        nombre VARCHAR(150) NOT NULL,
        posicion VARCHAR(50) NOT NULL,
        posicion_original VARCHAR(50) NULL,
        fecha_nacimiento DATE NULL,
        nacionalidad VARCHAR(100) NULL,
        dorsal INTEGER NULL,
        equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
        liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
        activo BOOLEAN NOT NULL DEFAULT true,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jugadores_external_id ON jugadores (external_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jugadores_posicion ON jugadores (posicion);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jugadores_equipo_id ON jugadores (equipo_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jugadores_liga_id ON jugadores (liga_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS jugadores;`);
    await queryRunner.query(`DROP TABLE IF EXISTS equipos;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ligas;`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios;`);
  }
}
