import { httpRequest } from './http-client';
import type {
  CrearOrdenCompraPayload,
  CrearOrdenVentaPayload,
  FiltroOrdenesVenta,
  OrdenVenta,
  ResultadoCompra,
} from '../types/marketplace.types';

export async function listarOrdenesVenta(
  filtros?: FiltroOrdenesVenta,
  signal?: AbortSignal,
): Promise<OrdenVenta[]> {
  const query = new URLSearchParams();

  if (filtros?.jugadorId?.trim()) {
    query.set('jugadorId', filtros.jugadorId.trim());
  }
  if (filtros?.vendedorId?.trim()) {
    query.set('vendedorId', filtros.vendedorId.trim());
  }
  if (filtros?.estado) {
    query.set('estado', filtros.estado);
  }
  if (filtros?.limite !== undefined && Number.isFinite(filtros.limite)) {
    const limite = Math.min(Math.max(1, Math.trunc(filtros.limite)), 100);
    query.set('limite', String(limite));
  }

  const qs = query.toString();
  const endpoint = qs ? `/orders?${qs}` : '/orders';

  return httpRequest<OrdenVenta[]>(endpoint, {
    method: 'GET',
    signal,
  });
}

export async function comprarTokens(
  token: string,
  payload: CrearOrdenCompraPayload,
): Promise<ResultadoCompra> {
  const bodyLimpio: Record<string, unknown> = {
    jugadorId: payload.jugadorId,
    cantidad: Math.trunc(payload.cantidad),
  };

  if (payload.ordenVentaId?.trim()) {
    bodyLimpio.ordenVentaId = payload.ordenVentaId.trim();
  }

  if (
    payload.precioMaximoUnitario !== undefined &&
    Number.isFinite(payload.precioMaximoUnitario) &&
    payload.precioMaximoUnitario > 0
  ) {
    bodyLimpio.precioMaximoUnitario = payload.precioMaximoUnitario;
  }

  return httpRequest<ResultadoCompra>('/orders/buy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bodyLimpio),
  });
}

export async function publicarOrdenVenta(
  token: string,
  payload: CrearOrdenVentaPayload,
): Promise<OrdenVenta> {
  return httpRequest<OrdenVenta>('/orders/sell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jugadorId: payload.jugadorId,
      cantidad: Math.trunc(payload.cantidad),
      precioUnitario: payload.precioUnitario,
    }),
  });
}

export async function cancelarOrdenVenta(
  token: string,
  ordenId: string,
): Promise<OrdenVenta> {
  return httpRequest<OrdenVenta>(`/orders/${encodeURIComponent(ordenId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

