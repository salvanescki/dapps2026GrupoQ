import { httpRequest } from './http-client';
import {
  normalizarFechaDesdeIso,
  normalizarFechaHastaIso,
} from '../utils/formato-mercado';
import type {
  FiltroTransaccionesUsuario,
  PortfolioUsuario,
  TransaccionUsuario,
} from '../types/marketplace.types';

export async function obtenerPortfolioUsuario(
  token: string,
  usuarioId: string,
  signal?: AbortSignal,
): Promise<PortfolioUsuario> {
  return httpRequest<PortfolioUsuario>(
    `/users/${encodeURIComponent(usuarioId)}/portfolio`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );
}

export async function obtenerTransaccionesUsuario(
  token: string,
  usuarioId: string,
  filtros?: FiltroTransaccionesUsuario,
  signal?: AbortSignal,
): Promise<TransaccionUsuario[]> {
  const query = new URLSearchParams();

  if (filtros?.jugadorId?.trim()) {
    query.set('jugadorId', filtros.jugadorId.trim());
  }
  if (filtros?.tipo) {
    query.set('tipo', filtros.tipo);
  }
  if (filtros?.desde?.trim()) {
    query.set('desde', normalizarFechaDesdeIso(filtros.desde));
  }
  if (filtros?.hasta?.trim()) {
    query.set('hasta', normalizarFechaHastaIso(filtros.hasta));
  }

  const limiteRaw = filtros?.limite ?? 100;
  const limite = Math.min(Math.max(1, Math.trunc(limiteRaw)), 100);
  query.set('limite', String(limite));

  return httpRequest<TransaccionUsuario[]>(
    `/users/${encodeURIComponent(usuarioId)}/transactions?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );
}

