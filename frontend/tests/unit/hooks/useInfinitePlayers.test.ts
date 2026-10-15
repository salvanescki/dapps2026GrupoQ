import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInfinitePlayers } from '../../../src/hooks/useInfinitePlayers';
import * as playersApi from '../../../src/api/playersApi';
import { createMockPlayer } from '../../helpers/test-mock-factories';

vi.mock('../../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
}));

describe('useInfinitePlayers Hook', () => {
  const p1 = createMockPlayer({ id: 'p-1', nombre: 'Jugador 1' });
  const p2 = createMockPlayer({ id: 'p-2', nombre: 'Jugador 2' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe cargar la primera página de jugadores correctamente', async () => {
    vi.mocked(playersApi.getPlayers).mockResolvedValueOnce({
      items: [p1],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 2,
      hasMore: true,
    });

    const { result } = renderHook(() => useInfinitePlayers({ league: 'PL' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.players).toEqual([p1]);
    expect(result.current.total).toBe(2);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('debe cargar más jugadores y anexarlos a la lista con loadMore()', async () => {
    vi.mocked(playersApi.getPlayers)
      .mockResolvedValueOnce({
        items: [p1],
        total: 2,
        page: 1,
        limit: 1,
        totalPages: 2,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [p2],
        total: 2,
        page: 2,
        limit: 1,
        totalPages: 2,
        hasMore: false,
      });

    const { result } = renderHook(() => useInfinitePlayers({ limit: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.players).toEqual([p1, p2]);
    expect(result.current.hasMore).toBe(false);
  });

  it('no debe disparar loadMore si hasMore es false o ya está cargando', async () => {
    vi.mocked(playersApi.getPlayers).mockResolvedValueOnce({
      items: [p1],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useInfinitePlayers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    // Solo la primera llamada
    expect(playersApi.getPlayers).toHaveBeenCalledTimes(1);
  });

  it('debe capturar errores de carga en la primera página', async () => {
    vi.mocked(playersApi.getPlayers).mockRejectedValueOnce(
      new Error('Fallo de red en catálogo')
    );

    const { result } = renderHook(() => useInfinitePlayers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fallo de red en catálogo');
    expect(result.current.players).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('debe capturar errores en loadMore() sin borrar los jugadores existentes', async () => {
    vi.mocked(playersApi.getPlayers)
      .mockResolvedValueOnce({
        items: [p1],
        total: 5,
        page: 1,
        limit: 1,
        totalPages: 5,
        hasMore: true,
      })
      .mockRejectedValueOnce(new Error('Fallo en paginación'));

    const { result } = renderHook(() => useInfinitePlayers({ limit: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.error).toBe('Fallo en paginación');
    expect(result.current.players).toEqual([p1]);
  });
});
