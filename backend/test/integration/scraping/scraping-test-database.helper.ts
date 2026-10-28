import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EjecucionScrapingOrmEntity } from '../../../src/scraping/data-access/ejecucion-scraping.orm-entity';

export class ScrapingTestDatabaseHelper {
  private static container: StartedPostgreSqlContainer | null = null;
  private static dataSource: DataSource | null = null;

  public static async start(): Promise<{
    container: StartedPostgreSqlContainer;
    dataSource: DataSource;
  }> {
    if (!this.container) {
      this.container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('test_scraping_db')
        .withUsername('test_user')
        .withPassword('test_password')
        .start();

      this.dataSource = new DataSource({
        type: 'postgres',
        host: this.container.getHost(),
        port: this.container.getPort(),
        username: this.container.getUsername(),
        password: this.container.getPassword(),
        database: this.container.getDatabase(),
        entities: [
          UsuarioOrmEntity,
          LigaOrmEntity,
          EquipoOrmEntity,
          JugadorOrmEntity,
          EstadisticaJugadorOrmEntity,
          EjecucionScrapingOrmEntity,
        ],
        synchronize: true,
      });

      await this.dataSource.initialize();

      await this.dataSource.query(`
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

    return {
      container: this.container,
      dataSource: this.dataSource!,
    };
  }

  public static async cleanDatabase(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.query(
        'TRUNCATE TABLE estadisticas_jugadores, ejecuciones_scraping, jugadores, equipos, ligas, usuarios CASCADE;',
      );
    }
  }

  public static async stop(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
    if (this.container) {
      await this.container.stop();
      this.container = null;
    }
  }
}
