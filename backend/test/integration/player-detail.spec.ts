import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseHelper } from './test-database.helper';
import { createPlayersTestContext } from './players-test.context';
import { JugadorService } from '../../src/services/jugador.service';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';

describe('Player Detail (Integration with Testcontainers - US5)', () => {
  let dataSource: DataSource;
  let jugadorService: JugadorService;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  beforeAll(async () => {
    const started = await TestDatabaseHelper.start();
    dataSource = started.dataSource;

    const context = await createPlayersTestContext(dataSource);
    jugadorService = context.jugadorService;
    ligaRepo = context.ligaRepo;
    equipoRepo = context.equipoRepo;
    jugadorRepo = context.jugadorRepo;
  }, 90000);

  afterAll(async () => {
    await TestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanDatabase();
  });

  it('debe obtener la ficha detallada de un jugador existente por su ID (200 OK)', async () => {
    const liga = await ligaRepo.guardar(
      Liga.crear({
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
        emblemaUrl: 'https://crests.football-data.org/PL.png',
      }),
    );

    const equipo = await equipoRepo.guardar(
      Equipo.crear({
        externalId: 57,
        nombre: 'Arsenal FC',
        nombreCorto: 'Arsenal',
        tla: 'ARS',
        escudoUrl: 'https://crests.football-data.org/57.png',
        ligaId: liga.id,
      }),
    );

    const jugador = await jugadorRepo.guardar(
      Jugador.crear({
        externalId: 3189,
        nombre: 'Bukayo Saka',
        posicionOriginal: 'Right Winger',
        fechaNacimiento: '2001-09-05',
        nacionalidad: 'England',
        dorsal: 7,
        equipoId: equipo.id,
        ligaId: liga.id,
      }),
    );

    const detalle = await jugadorService.buscarPorId(jugador.id);

    expect(detalle).toBeDefined();
    expect(detalle.id).toBe(jugador.id);
    expect(detalle.externalId).toBe(3189);
    expect(detalle.nombre).toBe('Bukayo Saka');
    expect(detalle.posicion).toBe('Delantero');
    expect(detalle.posicionOriginal).toBe('Right Winger');
    expect(detalle.fechaNacimiento).toBe('2001-09-05');
    expect(detalle.nacionalidad).toBe('England');
    expect(detalle.dorsal).toBe(7);

    expect(detalle.equipo).toBeDefined();
    expect(detalle.equipo.id).toBe(equipo.id);
    expect(detalle.equipo.nombre).toBe('Arsenal FC');
    expect(detalle.equipo.escudoUrl).toBe('https://crests.football-data.org/57.png');

    expect(detalle.liga).toBeDefined();
    expect(detalle.liga.id).toBe(liga.id);
    expect(detalle.liga.codigo).toBe('PL');
    expect(detalle.liga.nombre).toBe('Premier League');
  });

  it('debe lanzar NotFoundException si el ID del jugador no existe (404 Not Found)', async () => {
    const idInexistente = '00000000-0000-4000-8000-000000000000';

    await expect(jugadorService.buscarPorId(idInexistente)).rejects.toThrow(
      NotFoundException,
    );
  });
});
