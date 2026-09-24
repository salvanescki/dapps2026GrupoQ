import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  FootballDataClient,
  FootballDataSquadMember,
  FootballDataTeam,
} from './clients/football-data.client';
import {
  IJugadorRepository,
  IEquipoRepository,
  ILigaRepository,
  I_JUGADOR_REPOSITORY,
  I_EQUIPO_REPOSITORY,
  I_LIGA_REPOSITORY,
} from '../domain/jugador.repository.interface';
import { Liga } from '../domain/liga.entity';
import { Equipo } from '../domain/equipo.entity';
import { Jugador } from '../domain/jugador.entity';

export interface SincronizacionResultado {
  mensaje: string;
  totalLigas: number;
  totalEquipos: number;
  totalJugadores: number;
}

interface MetaLiga {
  codigo: 'PL' | 'PD' | 'SA' | 'BL1' | 'FL1';
  nombre: string;
  pais: string;
  emblemaUrl?: string;
}

const LIGAS_DEFINIDAS: MetaLiga[] = [
  {
    codigo: 'PL',
    nombre: 'Premier League',
    pais: 'Inglaterra',
    emblemaUrl: 'https://crests.football-data.org/PL.png',
  },
  {
    codigo: 'PD',
    nombre: 'La Liga',
    pais: 'España',
    emblemaUrl: 'https://crests.football-data.org/PD.png',
  },
  {
    codigo: 'SA',
    nombre: 'Serie A',
    pais: 'Italia',
    emblemaUrl: 'https://crests.football-data.org/SA.png',
  },
  {
    codigo: 'BL1',
    nombre: 'Bundesliga',
    pais: 'Alemania',
    emblemaUrl: 'https://crests.football-data.org/BL1.png',
  },
  {
    codigo: 'FL1',
    nombre: 'Ligue 1',
    pais: 'Francia',
    emblemaUrl: 'https://crests.football-data.org/FL1.png',
  },
];

@Injectable()
export class SincronizacionJugadoresService {
  private readonly logger = new Logger(SincronizacionJugadoresService.name);

  constructor(
    private readonly footballDataClient: FootballDataClient,
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepository: IJugadorRepository,
    @Inject(I_EQUIPO_REPOSITORY)
    private readonly equipoRepository: IEquipoRepository,
    @Inject(I_LIGA_REPOSITORY)
    private readonly ligaRepository: ILigaRepository,
  ) {}

  async sincronizarSiEsNecesario(): Promise<boolean> {
    const totalJugadores = await this.jugadorRepository.contarTotal();
    if (totalJugadores > 0) {
      this.logger.log(
        `La base de datos ya cuenta con ${totalJugadores} jugadores. Sincronización omitida.`,
      );
      return false;
    }

    this.logger.log('Base de datos sin jugadores. Iniciando sincronización inicial...');
    await this.sincronizarLigasYPlanteles();
    return true;
  }

  async sincronizarLigasYPlanteles(): Promise<SincronizacionResultado> {
    let totalLigas = 0;
    let totalEquipos = 0;
    let totalJugadores = 0;

    for (const metaLiga of LIGAS_DEFINIDAS) {
      try {
        this.logger.log(`Sincronizando liga ${metaLiga.nombre} (${metaLiga.codigo})...`);

        const liga = await this.obtenerOCrearLiga(metaLiga);
        totalLigas++;

        const response =
          await this.footballDataClient.obtenerEquiposYJugadoresPorLiga(
            metaLiga.codigo,
          );

        if (!response?.teams || !Array.isArray(response.teams)) {
          continue;
        }

        const resultadoEquipos = await this.sincronizarEquipos(
          response.teams,
          liga,
        );
        totalEquipos += resultadoEquipos.totalEquipos;
        totalJugadores += resultadoEquipos.totalJugadores;
      } catch (error) {
        const mensajeError = error instanceof Error ? error.message : String(error);
        const pilaError = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Error al sincronizar liga ${metaLiga.codigo}: ${mensajeError}`,
          pilaError,
        );
      }
    }

    this.logger.log(
      `Sincronización completada. Ligas: ${totalLigas}, Equipos: ${totalEquipos}, Jugadores: ${totalJugadores}`,
    );

    return {
      mensaje: 'Sincronización de jugadores completada exitosamente.',
      totalLigas,
      totalEquipos,
      totalJugadores,
    };
  }

  private async obtenerOCrearLiga(metaLiga: MetaLiga): Promise<Liga> {
    const ligaExistente = await this.ligaRepository.buscarPorCodigo(metaLiga.codigo);
    if (ligaExistente) return ligaExistente;

    return this.ligaRepository.guardar(
      Liga.crear({
        codigo: metaLiga.codigo,
        nombre: metaLiga.nombre,
        pais: metaLiga.pais,
        emblemaUrl: metaLiga.emblemaUrl,
      }),
    );
  }

  private async sincronizarEquipos(
    teams: FootballDataTeam[],
    liga: Liga,
  ): Promise<{ totalEquipos: number; totalJugadores: number }> {
    let totalJugadores = 0;

    for (const team of teams) {
      if (!team.id || !team.name) continue;

      totalJugadores += await this.sincronizarEquipo(team, liga);
    }

    return {
      totalEquipos: teams.filter((team) => team.id && team.name).length,
      totalJugadores,
    };
  }

  private async sincronizarEquipo(
    team: FootballDataTeam,
    liga: Liga,
  ): Promise<number> {
    let equipo = await this.equipoRepository.buscarPorExternalId(team.id);
    if (!equipo) {
      equipo = await this.equipoRepository.guardar(
        Equipo.crear({
          externalId: team.id,
          nombre: team.name,
          nombreCorto: team.shortName || null,
          tla: team.tla || null,
          escudoUrl: team.crest || null,
          ligaId: liga.id,
        }),
      );
    }

    if (!team.squad || !Array.isArray(team.squad)) return 0;

    const jugadores = await this.crearJugadoresNuevos(team.squad, equipo, liga);
    if (jugadores.length > 0) {
      await this.jugadorRepository.guardarMuchos(jugadores);
    }

    return jugadores.length;
  }

  private async crearJugadoresNuevos(
    squad: FootballDataSquadMember[],
    equipo: Equipo,
    liga: Liga,
  ): Promise<Jugador[]> {
    const jugadores: Jugador[] = [];

    for (const member of squad) {
      if (!member.id || !member.name) continue;

      const existente = await this.jugadorRepository.buscarPorExternalId(member.id);
      if (existente) continue;

      try {
        jugadores.push(
          Jugador.crear({
            externalId: member.id,
            nombre: member.name,
            posicion: Jugador.normalizarPosicion(member.position),
            posicionOriginal: member.position || null,
            fechaNacimiento: member.dateOfBirth || null,
            nacionalidad: member.nationality || 'Desconocida',
            dorsal: member.shirtNumber || null,
            equipoId: equipo.id,
            ligaId: liga.id,
          }),
        );
      } catch (err) {
        const mensajeError = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Invariante no cumplida para jugador ${member.name}: ${mensajeError}`,
        );
      }
    }

    return jugadores;
  }
}
