import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from './test-database.helper';
import { JugadorService } from '../../src/services/jugador.service';
import { SincronizacionJugadoresService } from '../../src/services/sincronizacion-jugadores.service';
import { FootballDataClient } from '../../src/services/clients/football-data.client';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import {
  I_LIGA_REPOSITORY,
  I_EQUIPO_REPOSITORY,
  I_JUGADOR_REPOSITORY,
} from '../../src/domain/jugador.repository.interface';

export interface PlayersTestContext {
  jugadorService: JugadorService;
  ligaRepo: LigaTypeOrmRepository;
  equipoRepo: EquipoTypeOrmRepository;
  jugadorRepo: JugadorTypeOrmRepository;
  mockFootballDataClient: Partial<FootballDataClient>;
}

export async function createPlayersTestContext(
  dataSource: DataSource
): Promise<PlayersTestContext> {
  const ligaRepo = new LigaTypeOrmRepository(dataSource.getRepository(LigaOrmEntity));
  const equipoRepo = new EquipoTypeOrmRepository(
    dataSource.getRepository(EquipoOrmEntity)
  );
  const jugadorRepo = new JugadorTypeOrmRepository(
    dataSource.getRepository(JugadorOrmEntity)
  );

  const mockFootballDataClient: Partial<FootballDataClient> = {
    obtenerEquiposYJugadoresPorLiga: jest.fn().mockResolvedValue({
      competition: { id: 2021, name: 'Premier League', code: 'PL' },
      teams: [],
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      JugadorService,
      SincronizacionJugadoresService,
      {
        provide: FootballDataClient,
        useValue: mockFootballDataClient,
      },
      {
        provide: I_LIGA_REPOSITORY,
        useValue: ligaRepo,
      },
      {
        provide: I_EQUIPO_REPOSITORY,
        useValue: equipoRepo,
      },
      {
        provide: I_JUGADOR_REPOSITORY,
        useValue: jugadorRepo,
      },
    ],
  }).compile();

  const jugadorService = module.get<JugadorService>(JugadorService);

  return {
    jugadorService,
    ligaRepo,
    equipoRepo,
    jugadorRepo,
    mockFootballDataClient,
  };
}

export function registrarHooksContextoJugadores(
  alPrepararContexto: (contexto: PlayersTestContext) => void
): void {
  beforeAll(async () => {
    const { dataSource } = await TestDatabaseHelper.start();
    alPrepararContexto(await createPlayersTestContext(dataSource));
  }, 90000);

  afterAll(async () => {
    await TestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanDatabase();
  });
}
