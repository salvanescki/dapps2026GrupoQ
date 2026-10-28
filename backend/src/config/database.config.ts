import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { CreateInitialCatalogAndUserTables1700000000000 } from '../migrations/1700000000000-create-initial-catalog-and-user-tables';
import { CreateScrapingTables1715000000000 } from '../migrations/1715000000000-create-scraping-tables';
import { AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000 } from '../migrations/1729860000000-add-whoscored-external-identities-and-contextual-uniqueness';

dotenv.config();

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_NAME || 'football_tokens_db',
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: true,
  migrations: [
    CreateInitialCatalogAndUserTables1700000000000,
    CreateScrapingTables1715000000000,
    AddWhoscoredExternalIdentitiesAndContextualUniqueness1729860000000,
  ],
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
