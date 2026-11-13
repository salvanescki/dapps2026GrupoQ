import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  obtenerPortfolioUsuario,
  obtenerTransaccionesUsuario,
} from '../api/portfolioApi';
import {
  cancelarOrdenVenta,
  listarOrdenesVenta,
  publicarOrdenVenta,
} from '../api/ordersApi';
import {
  construirResumenPatrimonial,
  type ResumenPatrimonialConsolidado,
} from '../utils/portfolio-chart';
import type {
  FiltroTransaccionesUsuario,
  OrdenVenta,
  PortfolioUsuario,
  TipoOperacionUsuario,
  TransaccionUsuario,
} from '../types/marketplace.types';

export interface FiltrosHistorialUi {
  tipo: 'Todas' | TipoOperacionUsuario;
  jugadorId: string;
  desde: string;
  hasta: string;
}

export interface UsePortfolioResult {
  portfolio: PortfolioUsuario | null;
  resumen: ResumenPatrimonialConsolidado | null;
  transaccionesFiltradas: TransaccionUsuario[];
  ordenesAbiertas: OrdenVenta[];
  filtrosHistorial: FiltrosHistorialUi;
  errorValidacionFiltros: string | null;
  cargando: boolean;
  cargandoHistorial: boolean;
  operando: boolean;
  error: string | null;
  actualizarFiltroHistorial: (parcial: Partial<FiltrosHistorialUi>) => void;
  limpiarFiltrosHistorial: () => void;
  publicarVenta: (
    jugadorId: string,
    cantidad: number,
    precioUnitario: number,
  ) => Promise<OrdenVenta>;
  cancelarOrden: (ordenId: string) => Promise<OrdenVenta>;
  recargar: () => Promise<void>;
}

const FILTROS_INICIALES: FiltrosHistorialUi = {
  tipo: 'Todas',
  jugadorId: '',
  desde: '',
  hasta: '',
};

function esAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function hayFiltrosActivos(f: FiltrosHistorialUi): boolean {
  return (
    f.tipo !== 'Todas' ||
    Boolean(f.jugadorId.trim()) ||
    Boolean(f.desde.trim()) ||
    Boolean(f.hasta.trim())
  );
}

function comoLista<T>(valor: T[]): T[] {
  return Array.isArray(valor) ? valor : [];
}

function filtrarOrdenesAbiertas(ordenes: OrdenVenta[]): OrdenVenta[] {
  return comoLista(ordenes).filter(
    (o) => o.estado === 'PENDIENTE' || o.estado === 'PARCIAL',
  );
}

function mensajeDeError(err: unknown, mensajePorDefecto: string): string {
  return err instanceof Error ? err.message : mensajePorDefecto;
}

export function usePortfolio(): UsePortfolioResult {
  const auth = useContext(AuthContext);
  const usuarioId = auth?.usuario?.id;
  const tokenDeAcceso = auth?.tokenDeAcceso ?? null;
  const refrescarPerfil = auth?.refrescarPerfil;

  const [portfolio, setPortfolio] = useState<PortfolioUsuario | null>(null);
  const [transaccionesBase, setTransaccionesBase] = useState<
    TransaccionUsuario[]
  >([]);
  const [transaccionesFiltradas, setTransaccionesFiltradas] = useState<
    TransaccionUsuario[]
  >([]);
  const [ordenesAbiertas, setOrdenesAbiertas] = useState<OrdenVenta[]>([]);
  const [filtrosHistorial, setFiltrosHistorial] =
    useState<FiltrosHistorialUi>(FILTROS_INICIALES);
  const [cargando, setCargando] = useState<boolean>(true);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);
  const [operando, setOperando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const errorValidacionFiltros = useMemo(() => {
    if (
      filtrosHistorial.desde.trim() &&
      filtrosHistorial.hasta.trim() &&
      filtrosHistorial.desde.trim() > filtrosHistorial.hasta.trim()
    ) {
      return "La fecha inicial 'Desde' no puede ser posterior a la fecha 'Hasta'.";
    }
    return null;
  }, [filtrosHistorial.desde, filtrosHistorial.hasta]);

  const construirPayloadFiltros = useCallback(
    (f: FiltrosHistorialUi): FiltroTransaccionesUsuario => {
      const payload: FiltroTransaccionesUsuario = { limite: 100 };
      if (f.tipo !== 'Todas') payload.tipo = f.tipo;
      if (f.jugadorId.trim()) payload.jugadorId = f.jugadorId.trim();
      if (f.desde.trim()) payload.desde = f.desde.trim();
      if (f.hasta.trim()) payload.hasta = f.hasta.trim();
      return payload;
    },
    [],
  );

  const sincronizarTransaccionesFiltradas = useCallback(
    async (
      token: string,
      uid: string,
      listaBase: TransaccionUsuario[],
      signal?: AbortSignal,
    ) => {
      if (errorValidacionFiltros) return;

      if (!hayFiltrosActivos(filtrosHistorial)) {
        setTransaccionesFiltradas(listaBase);
        return;
      }

      const resFiltradas = await obtenerTransaccionesUsuario(
        token,
        uid,
        construirPayloadFiltros(filtrosHistorial),
        signal,
      );
      if (!signal?.aborted) {
        setTransaccionesFiltradas(comoLista(resFiltradas));
      }
    },
    [filtrosHistorial, errorValidacionFiltros, construirPayloadFiltros],
  );

  const cargarTodo = useCallback(
    async (signal?: AbortSignal) => {
      if (!usuarioId || !tokenDeAcceso) {
        setCargando(false);
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const [resPortfolio, resTxBase, resOrdenes] = await Promise.all([
          obtenerPortfolioUsuario(tokenDeAcceso, usuarioId, signal),
          obtenerTransaccionesUsuario(
            tokenDeAcceso,
            usuarioId,
            { limite: 100 },
            signal,
          ),
          Promise.resolve(
            listarOrdenesVenta(
              { vendedorId: usuarioId, estado: 'ACTIVA', limite: 100 },
              signal,
            ),
          ).catch(() => []),
        ]);

        if (signal?.aborted) return;

        setPortfolio(resPortfolio);
        const listaBase = comoLista(resTxBase);
        setTransaccionesBase(listaBase);
        setOrdenesAbiertas(filtrarOrdenesAbiertas(resOrdenes));

        await sincronizarTransaccionesFiltradas(
          tokenDeAcceso,
          usuarioId,
          listaBase,
          signal,
        );
      } catch (err) {
        if (signal?.aborted || esAbortError(err)) return;
        setError(
          mensajeDeError(
            err,
            'No fue posible obtener los datos de tu Portfolio Personal.',
          ),
        );
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [usuarioId, tokenDeAcceso, sincronizarTransaccionesFiltradas],
  );

  useEffect(() => {
    const controller = new AbortController();
    void cargarTodo(controller.signal);
    return () => {
      controller.abort();
    };
  }, [cargarTodo]);

  const actualizarFiltroHistorial = useCallback(
    (parcial: Partial<FiltrosHistorialUi>) => {
      setFiltrosHistorial((prev) => ({ ...prev, ...parcial }));
    },
    [],
  );

  const limpiarFiltrosHistorial = useCallback(() => {
    setFiltrosHistorial(FILTROS_INICIALES);
    setCargandoHistorial(false);
  }, []);

  const publicarVenta = useCallback(
    async (
      jugadorId: string,
      cantidad: number,
      precioUnitario: number,
    ): Promise<OrdenVenta> => {
      if (!tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para ofertar tokens en venta.');
      }
      setOperando(true);
      try {
        const orden = await publicarOrdenVenta(tokenDeAcceso, {
          jugadorId,
          cantidad,
          precioUnitario,
        });
        await Promise.allSettled([
          cargarTodo(),
          refrescarPerfil ? refrescarPerfil() : Promise.resolve(),
        ]);
        return orden;
      } finally {
        setOperando(false);
      }
    },
    [tokenDeAcceso, cargarTodo, refrescarPerfil],
  );

  const cancelarOrden = useCallback(
    async (ordenId: string): Promise<OrdenVenta> => {
      if (!tokenDeAcceso) {
        throw new Error('Debes iniciar sesión para cancelar la orden.');
      }
      setOperando(true);
      try {
        const cancelada = await cancelarOrdenVenta(tokenDeAcceso, ordenId);
        await Promise.allSettled([
          cargarTodo(),
          refrescarPerfil ? refrescarPerfil() : Promise.resolve(),
        ]);
        return cancelada;
      } catch (err) {
        await cargarTodo().catch(() => undefined);
        throw err;
      } finally {
        setOperando(false);
      }
    },
    [tokenDeAcceso, cargarTodo, refrescarPerfil],
  );

  const resumen = useMemo(
    () =>
      portfolio
        ? construirResumenPatrimonial(portfolio, transaccionesBase)
        : null,
    [portfolio, transaccionesBase],
  );

  return {
    portfolio,
    resumen,
    transaccionesFiltradas,
    ordenesAbiertas,
    filtrosHistorial,
    errorValidacionFiltros,
    cargando,
    cargandoHistorial,
    operando,
    error,
    actualizarFiltroHistorial,
    limpiarFiltrosHistorial,
    publicarVenta,
    cancelarOrden,
    recargar: () => cargarTodo(),
  };
}

