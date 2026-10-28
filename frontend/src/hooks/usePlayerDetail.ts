import { useState, useEffect, useCallback, useRef } from 'react';
import type { JugadorDetalle } from '../types/player.types';
import { getPlayerById } from '../api/playersApi';

export interface UsePlayerDetailState {
  jugador: JugadorDetalle | null;
  loading: boolean;
  error: string | null;
}

export interface UsePlayerDetailReturn extends UsePlayerDetailState {
  retry: () => void;
}

export function usePlayerDetail(playerId: string | null): UsePlayerDetailReturn {
  const [jugador, setJugador] = useState<JugadorDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => {
    setError(null);
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!playerId) {
      setJugador(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    getPlayerById(playerId, abortController.signal)
      .then((data) => {
        if (!abortController.signal.aborted) {
          setJugador(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const mensaje =
          err instanceof Error
            ? err.message
            : 'Error inesperado al cargar el detalle del jugador.';

        setJugador(null);
        setLoading(false);
        setError(mensaje);
      });

    return () => {
      abortController.abort();
    };
  }, [playerId, retryCount]);

  return {
    jugador,
    loading,
    error,
    retry,
  };
}
