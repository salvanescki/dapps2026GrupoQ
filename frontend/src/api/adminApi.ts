import { httpRequest } from './http-client';
import {
  normalizarFechaDesdeIso,
  normalizarFechaHastaIso,
} from '../utils/formato-mercado';
import type {
  ConfiguracionEstrategia,
  EstrategiaId,
  FiltroTransaccionesAdmin,
  ResumenRecalculo,
  TransaccionAuditoria,
} from '../types/marketplace.types';

export async function cambiarEstrategiaMercado(
  token: string,
  estrategiaId: EstrategiaId,
): Promise<ConfiguracionEstrategia> {
  return httpRequest<ConfiguracionEstrategia>('/quotes/strategy', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ estrategiaId }),
  });
}

export async function ejecutarRecalculoManual(
  token: string,
): Promise<ResumenRecalculo> {
  return httpRequest<ResumenRecalculo>('/quotes/recalculate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function obtenerTransaccionesAuditoria(
  token: string,
  filtros?: FiltroTransaccionesAdmin,
  signal?: AbortSignal,
): Promise<TransaccionAuditoria[]> {
  const query = new URLSearchParams();

  if (filtros?.jugadorId?.trim()) {
    query.set('jugadorId', filtros.jugadorId.trim());
  }
  if (filtros?.usuarioId?.trim()) {
    query.set('usuarioId', filtros.usuarioId.trim());
  }
  if (filtros?.tipoMercado) {
    query.set('tipoMercado', filtros.tipoMercado);
  }
  if (filtros?.desde?.trim()) {
    query.set('desde', normalizarFechaDesdeIso(filtros.desde));
  }
  if (filtros?.hasta?.trim()) {
    query.set('hasta', normalizarFechaHastaIso(filtros.hasta));
  }

  const limiteRaw = filtros?.limite ?? 100;
  const limite = Math.min(Math.max(1, Math.trunc(limiteRaw)), 200);
  query.set('limite', String(limite));

  return httpRequest<TransaccionAuditoria[]>(
    `/admin/transactions?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );
}

