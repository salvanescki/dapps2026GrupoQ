import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ScrapingModule } from './scraping/scraping.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),
    AuthModule,
    PlayersModule,
    ScrapingModule,
  ],
})
export class AppModule {}

