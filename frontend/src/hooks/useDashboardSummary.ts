import { useCallback, useEffect, useState } from 'react';
import {
  obtenerEstrategiaActiva,
  obtenerRankingJugadores,
} from '../api/marketplaceApi';
import {
  obtenerPortfolioUsuario,
  obtenerTransaccionesUsuario,
} from '../api/portfolioApi';
import { obtenerVarianteTendencia } from '../utils/formato-mercado';
import type {
  ConfiguracionEstrategia,
  JugadorRanking,
  PortfolioUsuario,
  TransaccionUsuario,
  VarianteTendencia,
} from '../types/marketplace.types';

export interface DashboardSummaryData {
  portfolio: PortfolioUsuario | null;
  transacciones: TransaccionUsuario[];
  estrategia: ConfiguracionEstrategia | null;
  topRanking: JugadorRanking[];
  gananciaLatenteCreditos: number;
  gananciaLatentePorcentaje: number;
  tendenciaLatente: VarianteTendencia;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

function calcularRendimientoConsolidado(portfolio: PortfolioUsuario | null): {
  creditos: number;
  porcentaje: number;
  tendencia: VarianteTendencia;
} {
  if (!portfolio || portfolio.posiciones.length === 0) {
    return { creditos: 0, porcentaje: 0, tendencia: 'neutra' };
  }

  let costoCentavos = 0;
  let valoracionCentavos = 0;

  for (const pos of portfolio.posiciones) {
    const totalTokens = pos.cantidadTokensDisponibles + pos.cantidadTokensEnVenta;
    costoCentavos += Math.round(totalTokens * pos.precioPromedioAdquisicion * 100);
    valoracionCentavos += Math.round(pos.valoracionTotalPosicion * 100);
  }

  const diffCentavos = valoracionCentavos - costoCentavos;
  const creditos = diffCentavos / 100;
  const porcentaje =
    costoCentavos > 0 ? Math.round((diffCentavos / costoCentavos) * 10000) / 100 : 0;

  return {
    creditos,
    porcentaje,
    tendencia: obtenerVarianteTendencia(creditos),
  };
}

export function useDashboardSummary(
  usuarioId?: string,
  tokenDeAcceso?: string | null,
): DashboardSummaryData {
  const [portfolio, setPortfolio] = useState<PortfolioUsuario | null>(null);
  const [transacciones, setTransacciones] = useState<TransaccionUsuario[]>([]);
  const [estrategia, setEstrategia] = useState<ConfiguracionEstrategia | null>(null);
  const [topRanking, setTopRanking] = useState<JugadorRanking[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarResumen = useCallback(
    async (signal?: AbortSignal) => {
      if (!usuarioId || !tokenDeAcceso) {
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const [resPortfolio, resTransacciones, resEstrategia, resRanking] =
          await Promise.all([
            obtenerPortfolioUsuario(tokenDeAcceso, usuarioId, signal),
            obtenerTransaccionesUsuario(
              tokenDeAcceso,
              usuarioId,
              { limite: 100 },
              signal,
            ),
            obtenerEstrategiaActiva(signal),
            obtenerRankingJugadores({ limite: 5 }, signal),
          ]);

        if (signal?.aborted) return;

        setPortfolio(resPortfolio);
        setTransacciones(resTransacciones);
        setEstrategia(resEstrategia);
        setTopRanking(resRanking);
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
            : 'No se pudo sincronizar el resumen del mercado.';
        setError(mensaje);
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [usuarioId, tokenDeAcceso],
  );

  useEffect(() => {
    const controller = new AbortController();
    void cargarResumen(controller.signal);
    return () => {
      controller.abort();
    };
  }, [cargarResumen]);

  const rendimiento = calcularRendimientoConsolidado(portfolio);

  return {
    portfolio,
    transacciones,
    estrategia,
    topRanking,
    gananciaLatenteCreditos: rendimiento.creditos,
    gananciaLatentePorcentaje: rendimiento.porcentaje,
    tendenciaLatente: rendimiento.tendencia,
    cargando,
    error,
    recargar: () => cargarResumen(),
  };
}

