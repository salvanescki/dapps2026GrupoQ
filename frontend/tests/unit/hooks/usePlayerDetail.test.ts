import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerDetail } from '../../../src/hooks/usePlayerDetail';
import * as playersApi from '../../../src/api/playersApi';
import type { JugadorDetalle } from '../../../src/types/player.types';
import { createMockPlayer } from '../../helpers/test-mock-factories';

vi.mock('../../../src/api/playersApi', () => ({
  getPlayerById: vi.fn(),
}));

describe('usePlayerDetail Hook', () => {
  const mockJugadorDetalle: JugadorDetalle = {
    ...createMockPlayer({
      id: 'p-detail-1',
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
    }),
    estadisticas: {
      temporada: '2024/2025',
      liga: 'Premier League',
      partidosJugados: 35,
      minutosJugados: 2980,
      goles: 14,
      asistencias: 10,
      tarjetasAmarillas: 3,
      tarjetasRojas: 0,
      rating: 7.45,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mantener estado limpio e inactivo cuando playerId es null', () => {
    const { result } = renderHook(() => usePlayerDetail(null));

    expect(result.current.jugador).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(playersApi.getPlayerById).not.toHaveBeenCalled();
  });

  it('debe realizar fetch exitoso y setear jugador cargado', async () => {
    vi.mocked(playersApi.getPlayerById).mockResolvedValueOnce(mockJugadorDetalle);

    const { result } = renderHook(() => usePlayerDetail('p-detail-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.jugador).toEqual(mockJugadorDetalle);
    expect(result.current.error).toBeNull();
    expect(playersApi.getPlayerById).toHaveBeenCalledWith(
      'p-detail-1',
      expect.any(AbortSignal),
    );
  });

  it('debe capturar error de red y exponer mensaje de error amigable', async () => {
    vi.mocked(playersApi.getPlayerById).mockRejectedValueOnce(
      new Error('No fue posible conectar con el servidor.'),
    );

    const { result } = renderHook(() => usePlayerDetail('p-detail-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.jugador).toBeNull();
    expect(result.current.error).toBe('No fue posible conectar con el servidor.');
  });

  it('debe manejar error que no es instancia de Error con mensaje genérico', async () => {
    vi.mocked(playersApi.getPlayerById).mockRejectedValueOnce('Error de red plano');

    const { result } = renderHook(() => usePlayerDetail('p-detail-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.jugador).toBeNull();
    expect(result.current.error).toBe(
      'Error inesperado al cargar el detalle del jugador.',
    );
  });

  it('debe abortar la petición previa cuando cambia el playerId rápidamente', async () => {
    const abortSignals: AbortSignal[] = [];

    vi.mocked(playersApi.getPlayerById).mockImplementation(
      (_id, signal) => {
        if (signal) abortSignals.push(signal);
        return new Promise((resolve) => setTimeout(resolve, 500));
      },
    );

    const { rerender } = renderHook(
      ({ id }: { id: string }) => usePlayerDetail(id),
      { initialProps: { id: 'p-1' } },
    );

    expect(abortSignals[0]?.aborted).toBe(false);

    // Cambiar a p-2 antes de que p-1 termine
    rerender({ id: 'p-2' });

    expect(abortSignals[0]?.aborted).toBe(true);
    expect(abortSignals[1]?.aborted).toBe(false);
  });

  it('debe permitir reintentar con retry() reseteando el error e iniciando nuevo fetch', async () => {
    vi.mocked(playersApi.getPlayerById)
      .mockRejectedValueOnce(new Error('Fallo temporal'))
      .mockResolvedValueOnce(mockJugadorDetalle);

    const { result } = renderHook(() => usePlayerDetail('p-detail-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('Fallo temporal');
    });

    act(() => {
      result.current.retry();
    });

    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.jugador).toEqual(mockJugadorDetalle);
    expect(playersApi.getPlayerById).toHaveBeenCalledTimes(2);
  });
});
