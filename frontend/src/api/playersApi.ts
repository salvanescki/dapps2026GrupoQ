import type {
  FiltroJugadoresParams,
  RespuestaCatalogoJugadores,
  Jugador,
  OpcionesFiltroRespuesta,
} from '../types/player.types';

const BASE_URL = '/api';

export class PlayersApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlayersApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = 'Error en la petición al servidor.';
    try {
      const data = await response.json();
      if (data.mensaje) {
        errorMsg = Array.isArray(data.mensaje) ? data.mensaje.join(' ') : data.mensaje;
      }
    } catch {
      // Usar mensaje por defecto si no es JSON
    }
    throw new PlayersApiError(response.status, errorMsg);
  }

  return response.json();
}

/**
 * Consulta el catálogo paginado de jugadores con filtros opcionales.
 */
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
  return request<RespuestaCatalogoJugadores>(endpoint);
}

/**
 * Obtiene la ficha de detalle de un futbolista por su ID (UUID).
 */
export async function getPlayerById(id: string): Promise<Jugador> {
  return request<Jugador>(`/players/${id}`);
}

/**
 * Obtiene las opciones disponibles para poblar los filtros dinámicos (ligas, equipos, posiciones).
 */
export async function getPlayerFilterOptions(): Promise<OpcionesFiltroRespuesta> {
  return request<OpcionesFiltroRespuesta>('/players/filters');
}
