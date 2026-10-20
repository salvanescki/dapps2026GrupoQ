import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadisticaJugadorOrmEntity } from './data-access/estadistica-jugador.orm-entity';
import { EjecucionScrapingOrmEntity } from './data-access/ejecucion-scraping.orm-entity';
import { EstadisticaJugadorTypeOrmRepository } from './data-access/estadistica-jugador.typeorm-repository';
import { EjecucionScrapingTypeOrmRepository } from './data-access/ejecucion-scraping.typeorm-repository';
import { I_ESTADISTICA_JUGADOR_REPOSITORY } from './domain/estadistica-jugador.repository.interface';
import { I_EJECUCION_SCRAPING_REPOSITORY } from './domain/ejecucion-scraping.repository.interface';
import { WhoScoredPlaywrightService } from './services/whoscored-playwright.service';
import { NormalizadorJugadorService } from './services/normalizador-jugador.service';
import { ScrapingService } from './services/scraping.service';
import { ScrapingController } from './controllers/scraping.controller';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstadisticaJugadorOrmEntity,
      EjecucionScrapingOrmEntity,
    ]),
    PlayersModule,
  ],
  controllers: [ScrapingController],
  providers: [
    WhoScoredPlaywrightService,
    NormalizadorJugadorService,
    ScrapingService,
    {
      provide: I_ESTADISTICA_JUGADOR_REPOSITORY,
      useClass: EstadisticaJugadorTypeOrmRepository,
    },
    EstadisticaJugadorTypeOrmRepository,
    {
      provide: I_EJECUCION_SCRAPING_REPOSITORY,
      useClass: EjecucionScrapingTypeOrmRepository,
    },
    EjecucionScrapingTypeOrmRepository,
  ],
  exports: [
    WhoScoredPlaywrightService,
    NormalizadorJugadorService,
    ScrapingService,
    I_ESTADISTICA_JUGADOR_REPOSITORY,
    EstadisticaJugadorTypeOrmRepository,
    I_EJECUCION_SCRAPING_REPOSITORY,
    EjecucionScrapingTypeOrmRepository,
    TypeOrmModule,
  ],
})
export class ScrapingModule {}
