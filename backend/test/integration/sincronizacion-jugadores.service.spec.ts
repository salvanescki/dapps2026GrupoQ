import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from './test-database.helper';
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
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';

describe('SincronizacionJugadoresService (Integration with Testcontainers)', () => {
  let sincronizacionService: SincronizacionJugadoresService;
  let mockFootballDataClient: Partial<FootballDataClient>;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  beforeAll(async () => {
    const { dataSource } = await TestDatabaseHelper.start();
    ligaRepo = new LigaTypeOrmRepository(dataSource.getRepository(LigaOrmEntity));
    equipoRepo = new EquipoTypeOrmRepository(dataSource.getRepository(EquipoOrmEntity));
    jugadorRepo = new JugadorTypeOrmRepository(dataSource.getRepository(JugadorOrmEntity));

    mockFootballDataClient = {
      obtenerEquiposYJugadoresPorLiga: jest.fn().mockResolvedValue({
        competition: { id: 2021, name: 'Premier League', code: 'PL' },
        teams: [
          {
            id: 57,
            name: 'Arsenal FC',
            shortName: 'Arsenal',
            tla: 'ARS',
            crest: 'https://crests.football-data.org/57.png',
            squad: [
              {
                id: 3189,
                name: 'Bukayo Saka',
                position: 'Right Winger',
                dateOfBirth: '2001-09-05',
                nationality: 'England',
                shirtNumber: 7,
              },
              {
                id: 9999,
                name: 'A', // Will fail invariant (length < 2) to test catch branch
                position: 'Forward',
                shirtNumber: 999, // Also invalid dorsal
              },
              {
                id: 0, // Invalid member id to test skip
                name: 'Invalid ID Player',
              },
            ],
          },
          {
            id: 0, // Invalid team id to test skip
            name: '',
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    sincronizacionService = module.get<SincronizacionJugadoresService>(
      SincronizacionJugadoresService
    );
  }, 90000);

  afterAll(async () => {
    await TestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanDatabase();
  });

  it('debe sincronizar planteles completos cuando la base de datos esta vacia', async () => {
    const sincronizo = await sincronizacionService.sincronizarSiEsNecesario();
    expect(sincronizo).toBe(true);

    const totalJugadores = await jugadorRepo.contarTotal();
    expect(totalJugadores).toBeGreaterThan(0);

    // Segunda ejecucion inmediata debe omitirse porque ya hay jugadores
    const segundaVez = await sincronizacionService.sincronizarSiEsNecesario();
    expect(segundaVez).toBe(false);
  });

  it('debe reutilizar ligas y equipos existentes sin duplicarlos en sincronizaciones sucesivas', async () => {
    // Crear liga PL previamente
    await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      })
    );

    const resultado = await sincronizacionService.sincronizarLigasYPlanteles();

    expect(resultado.totalLigas).toBe(5);
    expect(resultado.totalEquipos).toBeGreaterThan(0);

    // Re-ejecutar para cubrir ramas donde equipo y jugador ya existen
    const resultado2 = await sincronizacionService.sincronizarLigasYPlanteles();
    expect(resultado2.totalJugadores).toBe(0); // Ninguno nuevo porque ya existian
  });

  it('debe manejar errores en la llamada a la API externa de forma tolerante a fallos', async () => {
    (mockFootballDataClient.obtenerEquiposYJugadoresPorLiga as jest.Mock).mockRejectedValueOnce(
      new Error('API rate limit exceeded')
    );

    const resultado = await sincronizacionService.sincronizarLigasYPlanteles();
    expect(resultado).toBeDefined();
    expect(resultado.mensaje).toBe('Sincronización de jugadores completada exitosamente.');
  });
});
