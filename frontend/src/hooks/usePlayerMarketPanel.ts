import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  obtenerHistorialCotizaciones,
  obtenerRankingJugadores,
} from '../api/marketplaceApi';
import {
  cancelarOrdenVenta,
  comprarTokens,
  listarOrdenesVenta,
  publicarOrdenVenta,
} from '../api/ordersApi';
import { obtenerPortfolioUsuario } from '../api/portfolioApi';
import type { RolUsuario } from '../types/auth.types';
import type {
  CotizacionJugador,
  OrdenVenta,
  PosicionPortafolio,
  ResultadoCompra,
} from '../types/marketplace.types';

export interface PlayerMarketPanelState {
  usuarioId?: string;
  rol?: RolUsuario;
  estaAutenticado: boolean;
  saldoDisponible?: number;
  cotizaciones: CotizacionJugador[];
  ordenesSecundarias: OrdenVenta[];
  posicionUsuario: PosicionPortafolio | null;
  tokensDisponiblesTotal: number | null;
  stockPrimarioConocido: number | null;
  cargando: boolean;
  operando: boolean;
  errorCarga: string | null;
  comprarPrimario: (
    cantidad: number,
    precioMaximoUnitario?: number,
  ) => Promise<ResultadoCompra>;
  comprarSecundario: (
    ordenVentaId: string,
    cantidad: number,
    precioMaximoUnitario?: number,
  ) => Promise<ResultadoCompra>;
  publicarVenta: (cantidad: number, precioUnitario: number) => Promise<OrdenVenta>;
  cancelarOrden: (ordenId: string) => Promise<OrdenVenta>;
  recargar: () => Promise<void>;
}

function esAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function ordenarLibroSecundario(ordenes: OrdenVenta[]): OrdenVenta[] {
  return [...ordenes]
    .filter((o) => o.estado === 'PENDIENTE' || o.estado === 'PARCIAL')
    .sort((a, b) => {
      const diffPrecio =
        Math.round(a.precioUnitario * 100) - Math.round(b.precioUnitario * 100);
      if (diffPrecio !== 0) return diffPrecio;
      return Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
    });
}

function buscarTokensDisponibles<
  T extends { jugadorId: string; tokensDisponibles: number },
>(ranking: T[] | null, jugadorId: string): number | null {
  if (!Array.isArray(ranking)) return null;
  const item = ranking.find((r) => r.jugadorId === jugadorId);
  return item ? item.tokensDisponibles : null;
}

export function usePlayerMarketPanel(
  jugadorId: string | null,
  onMarketMutation?: () => void,
): PlayerMarketPanelState {
  const auth = useContext(AuthContext);
  const usuario = auth?.usuario ?? null;
  const tokenDeAcceso = auth?.tokenDeAcceso ?? null;
  const refrescarPerfil = auth?.refrescarPerfil;

  const [cotizaciones, setCotizaciones] = useState<CotizacionJugador[]>([]);
  const [ordenesSecundarias, setOrdenesSecundarias] = useState<OrdenVenta[]>([]);
  const [posicionUsuario, setPosicionUsuario] = useState<PosicionPortafolio | null>(
    null,
  );
  const [saldoPortfolio, setSaldoPortfolio] = useState<number | undefined>(
    undefined,
  );
  const [tokensDisponiblesRanking, setTokensDisponiblesRanking] = useState<
    number | null
  >(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [operando, setOperando] = useState<boolean>(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarPanel = useCallback(
    async (signal?: AbortSignal) => {
      if (!jugadorId) {
        return;
      }

      setCargando(true);
      setErrorCarga(null);

      try {
        const promesasBase = Promise.all([
          obtenerHistorialCotizaciones(jugadorId, 50, signal),
          listarOrdenesVenta(
            { jugadorId, estado: 'ACTIVA', limite: 100 },
            signal,
          ),
          Promise.resolve(obtenerRankingJugadores({ limite: 50 }, signal)).catch(
            () => null,
          ),
          usuario?.id && tokenDeAcceso
            ? Promise.resolve(
                obtenerPortfolioUsuario(tokenDeAcceso, usuario.id, signal),
              ).catch(() => null)
            : Promise.resolve(null),
        ]);

        const [resCotizaciones, resOrdenes, resRanking, resPortfolio] =
          await promesasBase;

        if (signal?.aborted) return;

        setCotizaciones(Array.isArray(resCotizaciones) ? resCotizaciones : []);
        setOrdenesSecundarias(
          Array.isArray(resOrdenes) ? ordenarLibroSecundario(resOrdenes) : [],
        );

        setTokensDisponiblesRanking(
          buscarTokensDisponibles(resRanking, jugadorId),
        );

        if (resPortfolio) {
          setSaldoPortfolio(resPortfolio.saldoBilletera);
          const pos =
            resPortfolio.posiciones.find((p) => p.jugadorId === jugadorId) ?? null;
          setPosicionUsuario(pos);
        } else {
          setPosicionUsuario(null);
        }
      } catch (err) {
        if (signal?.aborted || esAbortError(err)) {
          return;
        }
        const mensaje =
          err instanceof Error
            ? err.message
            : 'No fue posible sincronizar los datos de mercado del jugador.';
        setErrorCarga(mensaje);
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [jugadorId, usuario?.id, tokenDeAcceso],
  );

  useEffect(() => {
    if (!jugadorId) return;
    const controller = new AbortController();
    void cargarPanel(controller.signal);
    return () => {
      controller.abort();
    };
  }, [jugadorId, cargarPanel]);

  const sincronizarTrasMutacion = useCallback(async () => {
    await Promise.allSettled([
      cargarPanel(),
      refrescarPerfil ? refrescarPerfil() : Promise.resolve(),
    ]);
    onMarketMutation?.();
  }, [cargarPanel, refrescarPerfil, onMarketMutation]);

  const comprarPrimario = useCallback(
    async (
      cantidad: number,
      precioMaximoUnitario?: number,
    ): Promise<ResultadoCompra> => {
      if (!jugadorId || !tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para operar en el mercado.');
      }
      setOperando(true);
      try {
        const res = await comprarTokens(tokenDeAcceso, {
          jugadorId,
          cantidad,
          ...(precioMaximoUnitario !== undefined ? { precioMaximoUnitario } : {}),
        });
        await sincronizarTrasMutacion();
        return res;
      } finally {
        setOperando(false);
      }
    },
    [jugadorId, tokenDeAcceso, sincronizarTrasMutacion],
  );

  const comprarSecundario = useCallback(
    async (
      ordenVentaId: string,
      cantidad: number,
      precioMaximoUnitario?: number,
    ): Promise<ResultadoCompra> => {
      if (!jugadorId || !tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para operar en el mercado secundario.');
      }
      setOperando(true);
      try {
        const res = await comprarTokens(tokenDeAcceso, {
          jugadorId,
          cantidad,
          ordenVentaId,
          ...(precioMaximoUnitario !== undefined ? { precioMaximoUnitario } : {}),
        });
        await sincronizarTrasMutacion();
        return res;
      } catch (err) {
        await cargarPanel().catch(() => undefined);
        throw err;
      } finally {
        setOperando(false);
      }
    },
    [jugadorId, tokenDeAcceso, sincronizarTrasMutacion, cargarPanel],
  );

  const publicarVenta = useCallback(
    async (cantidad: number, precioUnitario: number): Promise<OrdenVenta> => {
      if (!jugadorId || !tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para publicar una orden de venta.');
      }
      setOperando(true);
      try {
        const res = await publicarOrdenVenta(tokenDeAcceso, {
          jugadorId,
          cantidad,
          precioUnitario,
        });
        await sincronizarTrasMutacion();
        return res;
      } finally {
        setOperando(false);
      }
    },
    [jugadorId, tokenDeAcceso, sincronizarTrasMutacion],
  );

  const cancelarOrden = useCallback(
    async (ordenId: string): Promise<OrdenVenta> => {
      if (!tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para cancelar la orden.');
      }
      setOperando(true);
      try {
        const res = await cancelarOrdenVenta(tokenDeAcceso, ordenId);
        await sincronizarTrasMutacion();
        return res;
      } catch (err) {
        await cargarPanel().catch(() => undefined);
        throw err;
      } finally {
        setOperando(false);
      }
    },
    [tokenDeAcceso, sincronizarTrasMutacion, cargarPanel],
  );

  const sumaSecundario = ordenesSecundarias.reduce(
    (acc, o) => acc + o.cantidadRestante,
    0,
  );

  const stockPrimarioConocido =
    tokensDisponiblesRanking !== null
      ? Math.max(0, tokensDisponiblesRanking - sumaSecundario)
      : null;

  const saldoDisponible = saldoPortfolio ?? usuario?.saldo;

  return {
    usuarioId: usuario?.id,
    rol: usuario?.rol,
    estaAutenticado: Boolean(auth?.estaAutenticado && tokenDeAcceso),
    saldoDisponible,
    cotizaciones,
    ordenesSecundarias,
    posicionUsuario,
    tokensDisponiblesTotal: tokensDisponiblesRanking,
    stockPrimarioConocido,
    cargando,
    operando,
    errorCarga,
    comprarPrimario,
    comprarSecundario,
    publicarVenta,
    cancelarOrden,
    recargar: () => cargarPanel(),
  };
}
