import type {
  FiltroJugadoresParams,
  RespuestaCatalogoJugadores,
  Jugador,
  OpcionesFiltroRespuesta,
} from '../types/player.types';
import { httpRequest } from './http-client';

export async function getPlayers(
  params: FiltroJugadoresParams = {},
): Promise<RespuestaCatalogoJugadores> {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.append('page', params.page.toString());
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.league) searchParams.append('league', params.league);
  if (params.teamId) searchParams.append('teamId', params.teamId);
  if (params.position) searchParams.append('position', params.position);
  if (params.search && params.search.trim().length > 0) {
    searchParams.append('search', params.search.trim());
  }

  const query = searchParams.toString();
  const endpoint = `/players${query ? `?${query}` : ''}`;
  return httpRequest<RespuestaCatalogoJugadores>(endpoint);
}

export async function getPlayerById(id: string): Promise<Jugador> {
  return httpRequest<Jugador>(`/players/${id}`);
}

export async function getPlayerFilterOptions(): Promise<OpcionesFiltroRespuesta> {
  return httpRequest<OpcionesFiltroRespuesta>('/players/filters');
}

