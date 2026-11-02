import { httpRequest } from './http-client';
import type {
  ConfiguracionEstrategia,
  CotizacionJugador,
  JugadorRanking,
  PosicionFiltroRanking,
} from '../types/marketplace.types';

function acotarEntero(valor: number | undefined, defecto: number, max: number): number {
  if (valor === undefined || !Number.isFinite(valor)) {
    return defecto;
  }
  return Math.min(Math.max(1, Math.trunc(valor)), max);
}

export async function obtenerRankingJugadores(
  params?: { limite?: number; posicion?: PosicionFiltroRanking | 'Todas' },
  signal?: AbortSignal,
): Promise<JugadorRanking[]> {
  const query = new URLSearchParams();
  const limite = acotarEntero(params?.limite, 20, 100);
  query.set('limite', String(limite));

  if (params?.posicion && params.posicion !== 'Todas') {
    query.set('posicion', params.posicion);
  }

  return httpRequest<JugadorRanking[]>(`/players/ranking?${query.toString()}`, {
    method: 'GET',
    signal,
  });
}

export async function obtenerHistorialCotizaciones(
  jugadorId: string,
  limite?: number,
  signal?: AbortSignal,
): Promise<CotizacionJugador[]> {
  const query = new URLSearchParams();
  query.set('limite', String(acotarEntero(limite, 50, 100)));

  return httpRequest<CotizacionJugador[]>(
    `/players/${encodeURIComponent(jugadorId)}/quotes?${query.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function obtenerEstrategiaActiva(
  signal?: AbortSignal,
): Promise<ConfiguracionEstrategia> {
  return httpRequest<ConfiguracionEstrategia>('/quotes/strategy', {
    method: 'GET',
    signal,
  });
}

