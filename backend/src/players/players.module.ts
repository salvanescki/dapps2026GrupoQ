import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LigaOrmEntity } from '../data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../data-access/jugador.orm-entity';
import { LigaTypeOrmRepository } from '../data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../data-access/jugador.typeorm-repository';
import {
  I_LIGA_REPOSITORY,
  I_EQUIPO_REPOSITORY,
  I_JUGADOR_REPOSITORY,
} from '../domain/jugador.repository.interface';
import { FootballDataClient } from '../services/clients/football-data.client';
import { SincronizacionJugadoresService } from '../services/sincronizacion-jugadores.service';
import { JugadorService } from '../services/jugador.service';
import { PlayersController } from '../controllers/players.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LigaOrmEntity,
      EquipoOrmEntity,
      JugadorOrmEntity,
    ]),
  ],
  controllers: [PlayersController],
  providers: [
    FootballDataClient,
    SincronizacionJugadoresService,
    JugadorService,
    {
      provide: I_LIGA_REPOSITORY,
      useClass: LigaTypeOrmRepository,
    },
    {
      provide: I_EQUIPO_REPOSITORY,
      useClass: EquipoTypeOrmRepository,
    },
    {
      provide: I_JUGADOR_REPOSITORY,
      useClass: JugadorTypeOrmRepository,
    },
    LigaTypeOrmRepository,
    EquipoTypeOrmRepository,
    JugadorTypeOrmRepository,
  ],
  exports: [
    I_LIGA_REPOSITORY,
    I_EQUIPO_REPOSITORY,
    I_JUGADOR_REPOSITORY,
    FootballDataClient,
    SincronizacionJugadoresService,
    LigaTypeOrmRepository,
    EquipoTypeOrmRepository,
    JugadorTypeOrmRepository,
    JugadorService,
    TypeOrmModule,
  ],
})
export class PlayersModule {}
