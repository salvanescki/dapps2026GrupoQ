import { EstadisticaJugador } from './estadistica-jugador.entity';

export const I_ESTADISTICA_JUGADOR_REPOSITORY = 'IEstadisticaJugadorRepository';

export interface IEstadisticaJugadorRepository {
  guardar(estadistica: EstadisticaJugador): Promise<EstadisticaJugador>;
  guardarMuchos(estadisticas: EstadisticaJugador[]): Promise<void>;
  buscarPorJugadorYTemporada(
    jugadorId: string,
    temporada: string,
  ): Promise<EstadisticaJugador | null>;
  buscarPorJugador(jugadorId: string): Promise<EstadisticaJugador[]>;
}
