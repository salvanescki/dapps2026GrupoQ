import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { CreateInitialCatalogAndUserTables1700000000000 } from '../../../src/migrations/1700000000000-create-initial-catalog-and-user-tables';
import { CreateScrapingTables1715000000000 } from '../../../src/migrations/1715000000000-create-scraping-tables';
import { AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000 } from '../../../src/migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness';
import { CreateMarketplaceAndOmsTables1730000000000 } from '../../../src/migrations/1730000000000-create-marketplace-and-oms-tables';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { EstadisticaJugadorOrmEntity } from '../../../src/scraping/data-access/estadistica-jugador.orm-entity';
import { EjecucionScrapingOrmEntity } from '../../../src/scraping/data-access/ejecucion-scraping.orm-entity';
import { ConfiguracionMercadoOrmEntity } from '../../../src/data-access/configuracion-mercado.orm-entity';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { OrdenOrmEntity } from '../../../src/data-access/orden.orm-entity';
import { TransaccionOrmEntity } from '../../../src/data-access/transaccion.orm-entity';

export class MarketplaceTestDatabaseHelper {
  private static container: StartedPostgreSqlContainer | null = null;
  private static dataSource: DataSource | null = null;

  public static async start(extraEntities: any[] = []): Promise<{
    container: StartedPostgreSqlContainer;
    dataSource: DataSource;
  }> {
    if (!this.container) {
      this.container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('test_marketplace_db')
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
          ConfiguracionMercadoOrmEntity,
          BalanceTokenOrmEntity,
          CotizacionOrmEntity,
          OrdenOrmEntity,
          TransaccionOrmEntity,
          ...extraEntities,
        ],
        migrations: [
          CreateInitialCatalogAndUserTables1700000000000,
          CreateScrapingTables1715000000000,
          AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000,
          CreateMarketplaceAndOmsTables1730000000000,
        ],
        migrationsRun: true,
        synchronize: false,
      });

      await this.dataSource.initialize();
    }

    return {
      container: this.container,
      dataSource: this.dataSource!,
    };
  }

  public static async cleanDatabase(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.query(`
        TRUNCATE TABLE
          transacciones,
          ordenes,
          cotizaciones,
          balances_tokens,
          estadisticas_jugadores,
          ejecuciones_scraping,
          jugadores,
          equipos,
          ligas,
          usuarios
        CASCADE;
      `);
      // Re-sembrar la configuracion de mercado singleton si fue truncada
      await this.dataSource.query(`
        INSERT INTO configuraciones_mercado (id, estrategia_activa_id, estrategia_activa_version, actualizado_en)
        VALUES (1, 'GLOBAL', 'GLOBAL_v1', now())
        ON CONFLICT (id) DO UPDATE SET
          estrategia_activa_id = 'GLOBAL',
          estrategia_activa_version = 'GLOBAL_v1',
          actualizado_por = NULL,
          actualizado_en = now();
      `);
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
