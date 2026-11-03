import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamOfTheWeekTables1730500000000 implements MigrationInterface {
  name = 'CreateTeamOfTheWeekTables1730500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla Principal: equipos_semanales
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipos_semanales (
        id UUID PRIMARY KEY,
        ano INTEGER NOT NULL CHECK (ano >= 2024),
        semana_iso INTEGER NOT NULL CHECK (semana_iso >= 1 AND semana_iso <= 53),
        formacion VARCHAR(20) NOT NULL DEFAULT '4-3-3',
        estrategia_id VARCHAR(50) NOT NULL,
        estrategia_version VARCHAR(50) NOT NULL,
        fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_equipos_semanales_ano_semana UNIQUE (ano, semana_iso)
      );
    `);

    // 2. Tabla Detalle: miembros_equipos_semanales
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS miembros_equipos_semanales (
        id UUID PRIMARY KEY,
        equipo_semanal_id UUID NOT NULL REFERENCES equipos_semanales(id) ON DELETE CASCADE,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        nombre VARCHAR(150) NOT NULL,
        equipo_nombre VARCHAR(150) NOT NULL,
        posicion VARCHAR(30) NOT NULL CHECK (posicion IN ('Portero', 'Defensa', 'Mediocampista', 'Delantero')),
        cotizacion NUMERIC(12,2) NOT NULL CHECK (cotizacion >= 1.0),
        score NUMERIC(6,4) NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
        orden INTEGER NOT NULL CHECK (orden >= 1 AND orden <= 11),
        CONSTRAINT uq_miembro_equipo_jugador UNIQUE (equipo_semanal_id, jugador_id)
      );
    `);

    // 3. Índices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipos_semanales_fecha 
        ON equipos_semanales(fecha_generacion DESC);
      CREATE INDEX IF NOT EXISTS idx_equipos_semanales_ano_semana 
        ON equipos_semanales(ano DESC, semana_iso DESC);
      CREATE INDEX IF NOT EXISTS idx_miembros_equipo_id 
        ON miembros_equipos_semanales(equipo_semanal_id);
      CREATE INDEX IF NOT EXISTS idx_miembros_jugador_id 
        ON miembros_equipos_semanales(jugador_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS miembros_equipos_semanales CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS equipos_semanales CASCADE;`);
  }
}

