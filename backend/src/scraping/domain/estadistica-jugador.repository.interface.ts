import { EstadisticaJugador } from './estadistica-jugador.entity';
import type { EntityManager } from 'typeorm';

export const I_ESTADISTICA_JUGADOR_REPOSITORY = 'IEstadisticaJugadorRepository';

export interface IEstadisticaJugadorRepository {
  guardar(
    estadistica: EstadisticaJugador,
    transactionalEntityManager?: EntityManager,
  ): Promise<EstadisticaJugador>;
  guardarMuchos(
    estadisticas: EstadisticaJugador[],
    transactionalEntityManager?: EntityManager,
  ): Promise<void>;
  buscarPorJugadorYTemporada(
    jugadorId: string,
    temporada: string,
  ): Promise<EstadisticaJugador | null>;
  buscarPorJugador(jugadorId: string): Promise<EstadisticaJugador[]>;
}
