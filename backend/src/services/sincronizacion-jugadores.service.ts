import { Injectable, Inject, Logger } from '@nestjs/common';
import { FootballDataClient } from './clients/football-data.client';
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

        let liga = await this.ligaRepository.buscarPorCodigo(metaLiga.codigo);
        if (!liga) {
          liga = Liga.crear({
            codigo: metaLiga.codigo,
            nombre: metaLiga.nombre,
            pais: metaLiga.pais,
            emblemaUrl: metaLiga.emblemaUrl,
          });
          liga = await this.ligaRepository.guardar(liga);
        }
        totalLigas++;

        const response =
          await this.footballDataClient.obtenerEquiposYJugadoresPorLiga(
            metaLiga.codigo,
          );

        if (!response?.teams || !Array.isArray(response.teams)) {
          continue;
        }

        for (const team of response.teams) {
          if (!team.id || !team.name) continue;

          let equipo = await this.equipoRepository.buscarPorExternalId(team.id);
          if (!equipo) {
            equipo = Equipo.crear({
              externalId: team.id,
              nombre: team.name,
              nombreCorto: team.shortName || null,
              tla: team.tla || null,
              escudoUrl: team.crest || null,
              ligaId: liga.id,
            });
            equipo = await this.equipoRepository.guardar(equipo);
          }
          totalEquipos++;

          if (team.squad && Array.isArray(team.squad)) {
            const jugadoresParaGuardar: Jugador[] = [];

            for (const member of team.squad) {
              if (!member.id || !member.name) continue;

              const posicionNormalizada = Jugador.normalizarPosicion(member.position);

              const existente =
                await this.jugadorRepository.buscarPorExternalId(member.id);

              if (!existente) {
                try {
                  const nuevoJugador = Jugador.crear({
                    externalId: member.id,
                    nombre: member.name,
                    posicion: posicionNormalizada,
                    posicionOriginal: member.position || null,
                    fechaNacimiento: member.dateOfBirth || null,
                    nacionalidad: member.nationality || 'Desconocida',
                    dorsal: member.shirtNumber || null,
                    equipoId: equipo.id,
                    ligaId: liga.id,
                  });
                  jugadoresParaGuardar.push(nuevoJugador);
                } catch (err) {
                  this.logger.warn(
                    `Invariante no cumplida para jugador ${member.name}: ${err.message}`,
                  );
                }
              }
            }

            if (jugadoresParaGuardar.length > 0) {
              await this.jugadorRepository.guardarMuchos(jugadoresParaGuardar);
              totalJugadores += jugadoresParaGuardar.length;
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error al sincronizar liga ${metaLiga.codigo}: ${error.message}`,
          error.stack,
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
}
