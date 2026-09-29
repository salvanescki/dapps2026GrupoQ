import { registrarHooksContextoJugadores } from './players-test.context';
import { JugadorService } from '../../src/services/jugador.service';
import { LigaTypeOrmRepository } from '../../src/data-access/liga.typeorm-repository';
import { EquipoTypeOrmRepository } from '../../src/data-access/equipo.typeorm-repository';
import { JugadorTypeOrmRepository } from '../../src/data-access/jugador.typeorm-repository';
import { Liga } from '../../src/domain/liga.entity';
import { Equipo } from '../../src/domain/equipo.entity';
import { Jugador } from '../../src/domain/jugador.entity';

describe('JugadorService (Integration with Testcontainers)', () => {
  let jugadorService: JugadorService;
  let ligaRepo: LigaTypeOrmRepository;
  let equipoRepo: EquipoTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;

  registrarHooksContextoJugadores((contexto) => {
    ({ jugadorService, ligaRepo, equipoRepo, jugadorRepo } = contexto);
  });

  describe('Consulta del Catálogo con Paginación (US1)', () => {
    it('debe retornar catálogo paginado con metadatos y entidades anidadas', async () => {
      // Poblar liga, equipo y jugadores de prueba
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

      const jugadores = [
        Jugador.crear({
          externalId: 3189,
          nombre: 'Bukayo Saka',
          posicionOriginal: 'Right Winger',
          nacionalidad: 'England',
          dorsal: 7,
          equipoId: equipo.id,
          ligaId: liga.id,
        }),
        Jugador.crear({
          externalId: 3190,
          nombre: 'Declan Rice',
          posicionOriginal: 'Defensive Midfield',
          nacionalidad: 'England',
          dorsal: 41,
          equipoId: equipo.id,
          ligaId: liga.id,
        }),
        Jugador.crear({
          externalId: 3191,
          nombre: 'William Saliba',
          posicionOriginal: 'Centre-Back',
          nacionalidad: 'France',
          dorsal: 2,
          equipoId: equipo.id,
          ligaId: liga.id,
        }),
      ];

      await jugadorRepo.guardarMuchos(jugadores);

      const resultado = await jugadorService.obtenerCatalogo({
        page: 1,
        limit: 2,
      });

      expect(resultado.total).toBe(3);
      expect(resultado.page).toBe(1);
      expect(resultado.limit).toBe(2);
      expect(resultado.totalPages).toBe(2);
      expect(resultado.hasMore).toBe(true);
      expect(resultado.items).toHaveLength(2);

      const primerJugador = resultado.items[0];
      expect(primerJugador.id).toBeDefined();
      expect(primerJugador.nombre).toBeDefined();
      expect(primerJugador.equipo).toBeDefined();
      expect(primerJugador.equipo.nombre).toBe('Arsenal FC');
      expect(primerJugador.liga).toBeDefined();
      expect(primerJugador.liga.codigo).toBe('PL');
    });

    it('debe paginar correctamente a la segunda página', async () => {
      const liga = await ligaRepo.guardar(
        Liga.crear({
          codigo: 'PL',
          nombre: 'Premier League',
          pais: 'Inglaterra',
        }),
      );
      const equipo = await equipoRepo.guardar(
        Equipo.crear({
          externalId: 57,
          nombre: 'Arsenal FC',
          ligaId: liga.id,
        }),
      );

      for (let i = 1; i <= 5; i++) {
        await jugadorRepo.guardar(
          Jugador.crear({
            externalId: 100 + i,
            nombre: `Jugador ${i}`,
            posicionOriginal: 'Forward',
            nacionalidad: 'England',
            equipoId: equipo.id,
            ligaId: liga.id,
          }),
        );
      }

      const pagina2 = await jugadorService.obtenerCatalogo({
        page: 2,
        limit: 3,
      });

      expect(pagina2.total).toBe(5);
      expect(pagina2.page).toBe(2);
      expect(pagina2.limit).toBe(3);
      expect(pagina2.totalPages).toBe(2);
      expect(pagina2.hasMore).toBe(false);
      expect(pagina2.items).toHaveLength(2);
    });
  });
});
