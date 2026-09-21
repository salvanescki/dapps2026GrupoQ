import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlayersTestcontainersHelper } from './setup-players-testcontainers';
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
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';

describe('Players Filters (Integration with Testcontainers - US2)', () => {
  let dataSource: DataSource;
  let jugadorService: JugadorService;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  beforeAll(async () => {
    const started = await PlayersTestcontainersHelper.start();
    dataSource = started.dataSource;

    ligaRepo = new LigaTypeOrmRepository(dataSource.getRepository(LigaOrmEntity));
    equipoRepo = new EquipoTypeOrmRepository(
      dataSource.getRepository(EquipoOrmEntity),
    );
    jugadorRepo = new JugadorTypeOrmRepository(
      dataSource.getRepository(JugadorOrmEntity),
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

    jugadorService = module.get<JugadorService>(JugadorService);
  }, 90000);

  afterAll(async () => {
    await PlayersTestcontainersHelper.stop();
  });

  beforeEach(async () => {
    await PlayersTestcontainersHelper.cleanDatabase();
  });

  it('debe retornar las opciones disponibles para filtros (ligas, equipos y posiciones)', async () => {
    const ligaPL = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      }),
    );
    await equipoRepo.guardar(
      Equipo.crear({
        externalId: 57,
        nombre: 'Arsenal FC',
        ligaId: ligaPL.id,
      }),
    );

    const opciones = await jugadorService.obtenerOpcionesFiltro();

    expect(opciones.ligas).toHaveLength(5);
    const plLiga = opciones.ligas.find((l) => l.codigo === 'PL');
    expect(plLiga).toBeDefined();
    expect(plLiga?.nombre).toBe('Premier League');

    expect(opciones.equipos).toHaveLength(1);
    expect(opciones.equipos[0].nombre).toBe('Arsenal FC');
    expect(opciones.equipos[0].ligaCodigo).toBe('PL');
    expect(opciones.posiciones).toContain('Portero');
    expect(opciones.posiciones).toContain('Delantero');
  });

  it('debe filtrar de forma combinada por Liga y Posición', async () => {
    const ligaPL = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      }),
    );
    const ligaPD = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PD',
        nombre: 'La Liga',
        pais: 'España',
      }),
    );

    const equipoArsenal = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 57,
        nombre: 'Arsenal FC',
        ligaId: ligaPL.id,
      }),
    );

    const equipoMadrid = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 86,
        nombre: 'Real Madrid CF',
        ligaId: ligaPD.id,
      }),
    );

    // Arsenal: 1 Delantero, 1 Portero
    await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 3189,
        nombre: 'Bukayo Saka',
        posicionOriginal: 'Right Winger',
        nacionalidad: 'England',
        equipoId: equipoArsenal.id,
        ligaId: ligaPL.id,
      }),
    );
    await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 3192,
        nombre: 'David Raya',
        posicionOriginal: 'Goalkeeper',
        nacionalidad: 'Spain',
        equipoId: equipoArsenal.id,
        ligaId: ligaPL.id,
      }),
    );

    // Madrid: 1 Delantero
    await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 3193,
        nombre: 'Vinicius Junior',
        posicionOriginal: 'Left Winger',
        nacionalidad: 'Brazil',
        equipoId: equipoMadrid.id,
        ligaId: ligaPD.id,
      }),
    );

    // Filtrar solo Delanteros de Premier League
    const resPLDelanteros = await jugadorService.obtenerCatalogo({
      league: 'PL',
      position: 'Delantero',
    });

    expect(resPLDelanteros.total).toBe(1);
    expect(resPLDelanteros.items[0].nombre).toBe('Bukayo Saka');

    // Filtrar solo Porteros de Premier League
    const resPLPorteros = await jugadorService.obtenerCatalogo({
      league: 'PL',
      position: 'Portero',
    });

    expect(resPLPorteros.total).toBe(1);
    expect(resPLPorteros.items[0].nombre).toBe('David Raya');

    // Filtrar La Liga
    const resPD = await jugadorService.obtenerCatalogo({
      league: 'PD',
    });
    expect(resPD.total).toBe(1);
    expect(resPD.items[0].nombre).toBe('Vinicius Junior');
  });

  it('debe rechazar con BadRequestException si el equipo indicado no pertenece a la liga seleccionada', async () => {
    const ligaPL = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      }),
    );
    const ligaPD = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PD',
        nombre: 'La Liga',
        pais: 'España',
      }),
    );

    const equipoArsenal = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 57,
        nombre: 'Arsenal FC',
        ligaId: ligaPL.id,
      }),
    );

    // Solicitar liga La Liga (PD) con equipo Arsenal (perteneciente a PL)
    await expect(
      jugadorService.obtenerCatalogo({
        league: 'PD',
        teamId: equipoArsenal.id,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
