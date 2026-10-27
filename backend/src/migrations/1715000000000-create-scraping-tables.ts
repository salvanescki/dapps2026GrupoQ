import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScrapingTables1715000000000 implements MigrationInterface {
  name = 'CreateScrapingTables1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS estadisticas_jugadores (
        id UUID PRIMARY KEY,
        jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        temporada VARCHAR(20) NOT NULL,
        liga VARCHAR(10) NOT NULL,
        fuente VARCHAR(50) NOT NULL DEFAULT 'whoscored',
        fecha_actualizacion TIMESTAMPTZ NOT NULL,
        partidos_jugados INTEGER NOT NULL DEFAULT 0,
        minutos_jugados INTEGER NOT NULL DEFAULT 0,
        goles INTEGER NOT NULL DEFAULT 0,
        asistencias INTEGER NOT NULL DEFAULT 0,
        tiros_por_partido NUMERIC(5,2),
        precision_pase NUMERIC(5,2),
        duelos_aereos_ganados_por_partido NUMERIC(5,2),
        rating NUMERIC(4,2),
        tarjetas_amarillas INTEGER NOT NULL DEFAULT 0,
        tarjetas_rojas INTEGER NOT NULL DEFAULT 0,
        regates_completados_por_partido NUMERIC(5,2),
        pases_clave_por_partido NUMERIC(5,2),
        xg_por_partido NUMERIC(5,3),
        xa_por_partido NUMERIC(5,3),
        grandes_ocasiones_por_partido NUMERIC(5,2),
        entradas_por_partido NUMERIC(5,2),
        intercepcciones_por_partido NUMERIC(5,2),
        despejes_por_partido NUMERIC(5,2),
        pases_por_partido NUMERIC(5,2),
        centros_por_partido NUMERIC(5,2),
        atajadas NUMERIC(5,2),
        goles_recibidos INTEGER,
        porcentaje_atajadas NUMERIC(5,2),
        errores_que_generaron_gol INTEGER,
        autogoles INTEGER,
        CONSTRAINT uq_estadistica_jugador_temporada UNIQUE (jugador_id, temporada)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_estadisticas_jugador_id ON estadisticas_jugadores (jugador_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_estadisticas_temporada ON estadisticas_jugadores (temporada);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_estadisticas_liga ON estadisticas_jugadores (liga);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ejecuciones_scraping (
        id UUID PRIMARY KEY,
        inicio TIMESTAMPTZ NOT NULL,
        fin TIMESTAMPTZ,
        jugadores_procesados INTEGER NOT NULL DEFAULT 0,
        errores INTEGER NOT NULL DEFAULT 0,
        estado VARCHAR(20) NOT NULL DEFAULT 'en_progreso',
        detalle JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ejecuciones_estado ON ejecuciones_scraping (estado);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ejecuciones_inicio ON ejecuciones_scraping (inicio DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ejecuciones_inicio;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ejecuciones_estado;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ejecuciones_scraping;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_estadisticas_liga;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_estadisticas_temporada;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_estadisticas_jugador_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS estadisticas_jugadores;`);
  }
}
