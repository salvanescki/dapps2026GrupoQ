import { useState, useEffect, useRef, useCallback } from 'react';
import type { Jugador, FiltroJugadoresParams } from '../types/player.types';
import { getPlayers } from '../api/playersApi';

export interface UseInfinitePlayersOptions {
  league?: string;
  teamId?: string;
  position?: string;
  search?: string;
  limit?: number;
}

export interface UseInfinitePlayersResult {
  players: Jugador[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  total: number;
  sentinelRef: React.RefObject<HTMLDivElement>;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useInfinitePlayers(
  options: UseInfinitePlayersOptions = {},
): UseInfinitePlayersResult {
  const { league, teamId, position, search, limit = 20 } = options;

  const [players, setPlayers] = useState<Jugador[]>([]);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Carga inicial o recarga por cambio de filtros
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: FiltroJugadoresParams = {
        page: 1,
        limit,
        league: league || undefined,
        teamId: teamId || undefined,
        position: position || undefined,
        search: search || undefined,
      };

      const res = await getPlayers(params);
      setPlayers(res.items);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.hasMore);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los jugadores.');
      setPlayers([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [league, teamId, position, search, limit]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  // Cargar siguiente página
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params: FiltroJugadoresParams = {
        page: nextPage,
        limit,
        league: league || undefined,
        teamId: teamId || undefined,
        position: position || undefined,
        search: search || undefined,
      };

      const res = await getPlayers(params);
      setPlayers((prev) => [...prev, ...res.items]);
      setPage(nextPage);
      setHasMore(res.hasMore);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar más jugadores.');
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, limit, league, teamId, position, search]);

  // Configuración del IntersectionObserver para scroll infinito
  useEffect(() => {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const currentSentinel = sentinelRef.current;
    if (!currentSentinel || !hasMore || loading || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      },
    );

    observerRef.current.observe(currentSentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loading, loadingMore]);

  return {
    players,
    loading,
    loadingMore,
    hasMore,
    error,
    total,
    sentinelRef,
    loadMore,
    reload: fetchFirstPage,
  };
}
