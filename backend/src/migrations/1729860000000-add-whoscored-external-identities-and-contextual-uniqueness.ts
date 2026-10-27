import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000
  implements MigrationInterface
{
  name = 'AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columnas nullable e índices en jugadores y equipos
    await queryRunner.query(`
      ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS who_scored_player_id VARCHAR(50) NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_jugadores_whoscored_id ON jugadores (who_scored_player_id);
    `);

    await queryRunner.query(`
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS who_scored_team_id VARCHAR(50) NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipos_whoscored_id ON equipos (who_scored_team_id);
    `);

    // 2. Agregar columnas de procedencia nullable en estadisticas_jugadores
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores ADD COLUMN IF NOT EXISTS competencia VARCHAR(100) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores ADD COLUMN IF NOT EXISTS etapa VARCHAR(50) NULL;
    `);

    // 3. Detección explícita de conflictos: ABORTAR si existen duplicados legacy sin borrado silencioso
    await queryRunner.query(`
      DO $$
      DECLARE
        conflict_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO conflict_count
        FROM (
          SELECT jugador_id, COALESCE(fuente, ''), COALESCE(competencia, ''), COALESCE(liga, ''), COALESCE(temporada, ''), COALESCE(etapa, '')
          FROM estadisticas_jugadores
          GROUP BY jugador_id, COALESCE(fuente, ''), COALESCE(competencia, ''), COALESCE(liga, ''), COALESCE(temporada, ''), COALESCE(etapa, '')
          HAVING COUNT(*) > 1
        ) c;

        IF conflict_count > 0 THEN
          RAISE EXCEPTION 'Migración abortada: se detectaron % grupos de registros duplicados en estadisticas_jugadores. Se requiere saneamiento manual previo.', conflict_count;
        END IF;
      END $$;
    `);

    // 4. Reemplazar restricción única antigua por índice funcional único con COALESCE
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores DROP CONSTRAINT IF EXISTS uq_estadistica_jugador_temporada;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_estadistica_jugador_contexto ON estadisticas_jugadores (
        jugador_id,
        COALESCE(fuente, ''),
        COALESCE(competencia, ''),
        COALESCE(liga, ''),
        COALESCE(temporada, ''),
        COALESCE(etapa, '')
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índice funcional único
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_estadistica_jugador_contexto;
    `);

    // 2. Restaurar restricción previa
    // NOTA DE ROLLBACK: Restaurar la restricción 'uq_estadistica_jugador_temporada' fallará con un error
    // si existen múltiples registros para una misma tupla (jugador_id, temporada) con diferentes contextos
    // (por ejemplo, distintas etapas o competencias en una misma temporada). En tal caso, se requerirá
    // saneamiento previo de los registros multi-contexto antes de completar el rollback.
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores 
        ADD CONSTRAINT uq_estadistica_jugador_temporada UNIQUE (jugador_id, temporada);
    `);

    // 3. Eliminar columnas agregadas
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS etapa;
    `);
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS competencia;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipos_whoscored_id;
    `);
    await queryRunner.query(`
      ALTER TABLE equipos DROP COLUMN IF EXISTS who_scored_team_id;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_jugadores_whoscored_id;
    `);
    await queryRunner.query(`
      ALTER TABLE jugadores DROP COLUMN IF EXISTS who_scored_player_id;
    `);
  }
}
