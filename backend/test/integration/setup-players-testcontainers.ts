import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';

export class PlayersTestcontainersHelper {
  private static container: StartedPostgreSqlContainer;
  private static dataSource: DataSource;

  public static async start(): Promise<{
    container: StartedPostgreSqlContainer;
    dataSource: DataSource;
  }> {
    if (!this.container) {
      this.container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('players_test_db')
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
        entities: [LigaOrmEntity, EquipoOrmEntity, JugadorOrmEntity],
        synchronize: true,
      });

      await this.dataSource.initialize();
    }

    return {
      container: this.container,
      dataSource: this.dataSource,
    };
  }

  public static async cleanDatabase(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.query('TRUNCATE TABLE jugadores, equipos, ligas CASCADE;');
    }
  }

  public static async stop(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
    if (this.container) {
      await this.container.stop();
      this.container = null;
    }
  }
}
