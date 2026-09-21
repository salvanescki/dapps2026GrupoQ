import { Jugador, CriterioFiltroJugador } from './jugador.entity';
import { Equipo } from './equipo.entity';
import { Liga } from './liga.entity';

export interface ResultadoBusquedaJugadores {
  items: Jugador[];
  total: number;
}

export interface IJugadorRepository {
  guardar(jugador: Jugador): Promise<Jugador>;
  guardarMuchos(jugadores: Jugador[]): Promise<void>;
  buscarPorId(id: string): Promise<Jugador | null>;
  buscarPorExternalId(externalId: number): Promise<Jugador | null>;
  buscarConFiltros(criterio: CriterioFiltroJugador): Promise<ResultadoBusquedaJugadores>;
  contarTotal(): Promise<number>;
}

export interface IEquipoRepository {
  guardar(equipo: Equipo): Promise<Equipo>;
  guardarMuchos(equipos: Equipo[]): Promise<void>;
  buscarPorId(id: string): Promise<Equipo | null>;
  buscarPorExternalId(externalId: number): Promise<Equipo | null>;
  listarTodos(): Promise<Equipo[]>;
  listarPorLiga(ligaId: string): Promise<Equipo[]>;
}

export interface ILigaRepository {
  guardar(liga: Liga): Promise<Liga>;
  guardarMuchos(ligas: Liga[]): Promise<void>;
  buscarPorId(id: string): Promise<Liga | null>;
  buscarPorCodigo(codigo: string): Promise<Liga | null>;
  listarTodas(): Promise<Liga[]>;
}

export const I_JUGADOR_REPOSITORY = 'IJugadorRepository';
export const I_EQUIPO_REPOSITORY = 'IEquipoRepository';
export const I_LIGA_REPOSITORY = 'ILigaRepository';
