import { useCallback, useEffect, useState } from 'react';
import {
  obtenerEstrategiaActiva,
  obtenerRankingJugadores,
} from '../api/marketplaceApi';
import type {
  ConfiguracionEstrategia,
  JugadorRanking,
  PosicionFiltroRanking,
} from '../types/marketplace.types';

export type FiltroDemarcacion = PosicionFiltroRanking | 'Todas';

export interface UseMarketplaceRankingReturn {
  ranking: JugadorRanking[];
  estrategia: ConfiguracionEstrategia | null;
  posicionFiltro: FiltroDemarcacion;
  cambiarPosicion: (nuevaPosicion: FiltroDemarcacion) => void;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

export function useMarketplaceRanking(
  posicionInicial: FiltroDemarcacion = 'Todas',
): UseMarketplaceRankingReturn {
  const [posicionFiltro, setPosicionFiltro] =
    useState<FiltroDemarcacion>(posicionInicial);
  const [ranking, setRanking] = useState<JugadorRanking[]>([]);
  const [estrategia, setEstrategia] = useState<ConfiguracionEstrategia | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const ejecutarCarga = useCallback(
    async (demarcacion: FiltroDemarcacion, signal?: AbortSignal) => {
      setCargando(true);
      setError(null);

      try {
        const [resEstrategia, resRanking] = await Promise.all([
          obtenerEstrategiaActiva(signal),
          obtenerRankingJugadores({ limite: 50, posicion: demarcacion }, signal),
        ]);

        if (signal?.aborted) return;

        setEstrategia(resEstrategia);
        setRanking(resRanking);
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name?: string }).name === 'AbortError'
        ) {
          return;
        }
        const mensaje =
          err instanceof Error
            ? err.message
            : 'No fue posible cargar la cartelera del Marketplace.';
        setError(mensaje);
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void ejecutarCarga(posicionFiltro, controller.signal);
    return () => {
      controller.abort();
    };
  }, [posicionFiltro, ejecutarCarga]);

  const cambiarPosicion = useCallback((nuevaPosicion: FiltroDemarcacion) => {
    setPosicionFiltro(nuevaPosicion);
  }, []);

  const recargar = useCallback(async () => {
    await ejecutarCarga(posicionFiltro);
  }, [ejecutarCarga, posicionFiltro]);

  return {
    ranking,
    estrategia,
    posicionFiltro,
    cambiarPosicion,
    cargando,
    error,
    recargar,
  };
}

