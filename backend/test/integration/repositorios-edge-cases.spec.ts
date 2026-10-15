import { TestDatabaseHelper } from './test-database.helper';
import { DataSource } from 'typeorm';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import { LigaOrmEntity } from '../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../src/data-access/jugador.orm-entity';
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador, CriterioFiltroJugador } from '../../src/domain/jugador.entity';
import { LigaMapper } from '../../src/data-access/liga.mapper';
import { EquipoMapper } from '../../src/data-access/equipo.mapper';
import { JugadorMapper } from '../../src/data-access/jugador.mapper';

describe('TypeORM Repositories and Mappers - Edge Cases (Integration)', () => {
  let dataSource: DataSource;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  beforeAll(async () => {
    const context = await TestDatabaseHelper.start();
    dataSource = context.dataSource;
    ligaRepo = new LigaTypeOrmRepository(dataSource.getRepository(LigaOrmEntity));
    equipoRepo = new EquipoTypeOrmRepository(dataSource.getRepository(EquipoOrmEntity));
    jugadorRepo = new JugadorTypeOrmRepository(dataSource.getRepository(JugadorOrmEntity));
  }, 90000);

  afterAll(async () => {
    await TestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await TestDatabaseHelper.cleanDatabase();
  });

  describe('LigaTypeOrmRepository', () => {
    it('debe retornar null cuando no encuentra la liga por id o por codigo', async () => {
      const porId = await ligaRepo.buscarPorId('00000000-0000-0000-0000-000000000000');
      expect(porId).toBeNull();

      const porCodigo = await ligaRepo.buscarPorCodigo('INEXISTENTE');
      expect(porCodigo).toBeNull();
    });

    it('debe guardar múltiples ligas y listarlas ordenadas por nombre', async () => {
      const ligas = [
        Liga.crear({ codigo: 'FL1', nombre: 'Ligue 1', pais: 'Francia' }),
        Liga.crear({ codigo: 'BL1', nombre: 'Bundesliga', pais: 'Alemania' }),
      ];

      await ligaRepo.guardarMuchos(ligas);

      const todas = await ligaRepo.listarTodas();
      expect(todas.length).toBe(2);
      expect(todas[0].nombre).toBe('Bundesliga');
      expect(todas[1].nombre).toBe('Ligue 1');
    });
  });

  describe('EquipoTypeOrmRepository', () => {
    it('debe retornar null cuando un equipo no existe por id o por externalId', async () => {
      const porId = await equipoRepo.buscarPorId('00000000-0000-0000-0000-000000000000');
      expect(porId).toBeNull();

      const porExternal = await equipoRepo.buscarPorExternalId(9999999);
      expect(porExternal).toBeNull();
    });

    it('debe guardar múltiples equipos y listar por liga', async () => {
      const liga = await ligaRepo.guardar(
        Liga.crear({ codigo: 'PL', nombre: 'Premier League', pais: 'Inglaterra' })
      );

      const equipos = [
        Equipo.crear({ externalId: 101, nombre: 'Chelsea FC', ligaId: liga.id }),
        Equipo.crear({ externalId: 102, nombre: 'Liverpool FC', ligaId: liga.id }),
      ];

      await equipoRepo.guardarMuchos(equipos);

      const equiposLiga = await equipoRepo.listarPorLiga(liga.id);
      expect(equiposLiga.length).toBe(2);
      expect(equiposLiga[0].nombre).toBe('Chelsea FC');

      const todos = await equipoRepo.listarTodos();
      expect(todos.length).toBe(2);
    });
  });

  describe('JugadorTypeOrmRepository', () => {
    it('debe retornar null al buscar por id o externalId inexistente', async () => {
      const porId = await jugadorRepo.buscarPorId('00000000-0000-0000-0000-000000000000');
      expect(porId).toBeNull();

      const porExternal = await jugadorRepo.buscarPorExternalId(9999999);
      expect(porExternal).toBeNull();
    });

    it('debe guardar jugadores en lote masivo y contar total', async () => {
      const liga = await ligaRepo.guardar(
        Liga.crear({ codigo: 'PL', nombre: 'Premier League', pais: 'Inglaterra' })
      );
      const equipo = await equipoRepo.guardar(
        Equipo.crear({ externalId: 201, nombre: 'Arsenal FC', ligaId: liga.id })
      );

      const jugadores: Jugador[] = [];
      for (let i = 1; i <= 105; i++) {
        jugadores.push(
          Jugador.crear({
            externalId: 1000 + i,
            nombre: `Jugador Lote ${i}`,
            posicionOriginal: 'Attacking Midfield',
            equipoId: equipo.id,
            ligaId: liga.id,
          })
        );
      }

      await jugadorRepo.guardarMuchos(jugadores);

      const total = await jugadorRepo.contarTotal();
      expect(total).toBe(105);

      const busqueda = await jugadorRepo.buscarConFiltros(
        new CriterioFiltroJugador({
          ligaCodigo: 'PL',
          equipoId: equipo.id,
          posicion: 'Mediocampista',
          busqueda: 'Lote 10',
          pagina: 1,
          limite: 10,
        })
      );

      expect(busqueda.total).toBeGreaterThan(0);
      expect(busqueda.items.length).toBeGreaterThan(0);
    });
  });

  describe('Mappers Null and Edge Cases', () => {
    it('debe retornar null cuando las entidades o modelos son nulos en LigaMapper', () => {
      expect(LigaMapper.toDomain(null as unknown as LigaOrmEntity)).toBeNull();
      expect(LigaMapper.toOrm(null as unknown as Liga)).toBeNull();
    });

    it('debe retornar null cuando las entidades o modelos son nulos en EquipoMapper', () => {
      expect(EquipoMapper.toDomain(null as unknown as EquipoOrmEntity)).toBeNull();
      expect(EquipoMapper.toOrm(null as unknown as Equipo)).toBeNull();
    });

    it('debe retornar null cuando las entidades o modelos son nulos en JugadorMapper', () => {
      expect(JugadorMapper.toDomain(null as unknown as JugadorOrmEntity)).toBeNull();
      expect(JugadorMapper.toOrm(null as unknown as Jugador)).toBeNull();
    });
  });
});
