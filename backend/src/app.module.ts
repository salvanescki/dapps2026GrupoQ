import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ScrapingModule } from './scraping/scraping.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    PlayersModule,
    ScrapingModule,
    MarketplaceModule,
  ],
})
export class AppModule {}

