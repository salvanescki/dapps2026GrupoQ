import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { obtenerEstrategiaActiva } from '../api/marketplaceApi';
import {
  cambiarEstrategiaMercado,
  ejecutarRecalculoManual,
  obtenerTransaccionesAuditoria,
} from '../api/adminApi';
import {
  validarCambioEstrategia,
  validarFiltrosAuditoriaAdmin,
} from '../utils/validaciones-mercado';
import type {
  ConfiguracionEstrategia,
  EstrategiaId,
  FiltroTransaccionesAdmin,
  ResumenRecalculo,
  TipoMercado,
  TransaccionAuditoria,
} from '../types/marketplace.types';

export interface FiltrosAuditoriaUi {
  jugadorId: string;
  usuarioId: string;
  tipoMercado: 'Todos' | TipoMercado;
  desde: string;
  hasta: string;
  limite: number;
}

export interface UseAdminGovernanceResult {
  estrategia: ConfiguracionEstrategia | null;
  transacciones: TransaccionAuditoria[];
  ultimoRecalculo: ResumenRecalculo | null;
  filtrosAuditoria: FiltrosAuditoriaUi;
  errorValidacionFiltros: string | null;
  cargando: boolean;
  cambiandoEstrategia: boolean;
  recalculando: boolean;
  error: string | null;
  cambiarEstrategia: (estrategiaId: EstrategiaId) => Promise<ConfiguracionEstrategia>;
  dispararRecalculo: () => Promise<ResumenRecalculo | null>;
  actualizarBorradorFiltro: (parcial: Partial<FiltrosAuditoriaUi>) => void;
  aplicarFiltrosAuditoria: () => Promise<void>;
  limpiarFiltrosAuditoria: () => Promise<void>;
  recargar: () => Promise<void>;
}

const FILTROS_INICIALES: FiltrosAuditoriaUi = {
  jugadorId: '',
  usuarioId: '',
  tipoMercado: 'Todos',
  desde: '',
  hasta: '',
  limite: 100,
};

function esAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function aFiltroApi(f: FiltrosAuditoriaUi): FiltroTransaccionesAdmin {
  return {
    ...(f.jugadorId.trim() ? { jugadorId: f.jugadorId.trim() } : {}),
    ...(f.usuarioId.trim() ? { usuarioId: f.usuarioId.trim() } : {}),
    ...(f.tipoMercado !== 'Todos' ? { tipoMercado: f.tipoMercado } : {}),
    ...(f.desde.trim() ? { desde: f.desde.trim() } : {}),
    ...(f.hasta.trim() ? { hasta: f.hasta.trim() } : {}),
    limite: f.limite,
  };
}

export function useAdminGovernance(): UseAdminGovernanceResult {
  const auth = useContext(AuthContext);
  const tokenDeAcceso = auth?.tokenDeAcceso ?? null;
  const esAdmin = auth?.usuario?.rol === 'ADMIN';

  const [estrategia, setEstrategia] =
    useState<ConfiguracionEstrategia | null>(null);
  const [transacciones, setTransacciones] = useState<TransaccionAuditoria[]>([]);
  const [ultimoRecalculo, setUltimoRecalculo] =
    useState<ResumenRecalculo | null>(null);
  const [filtrosAuditoria, setFiltrosAuditoria] =
    useState<FiltrosAuditoriaUi>(FILTROS_INICIALES);
  const [errorValidacionFiltros, setErrorValidacionFiltros] = useState<
    string | null
  >(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [cambiandoEstrategia, setCambiandoEstrategia] =
    useState<boolean>(false);
  const [recalculando, setRecalculando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarInicial = useCallback(
    async (filtros: FiltrosAuditoriaUi, signal?: AbortSignal) => {
      if (!tokenDeAcceso || !esAdmin) {
        setCargando(false);
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const [resEstrategia, resAuditoria] = await Promise.all([
          obtenerEstrategiaActiva(signal),
          obtenerTransaccionesAuditoria(
            tokenDeAcceso,
            aFiltroApi(filtros),
            signal,
          ),
        ]);

        if (signal?.aborted) return;

        setEstrategia(resEstrategia);
        setTransacciones(Array.isArray(resAuditoria) ? resAuditoria : []);
      } catch (err) {
        if (signal?.aborted || esAbortError(err)) return;
        setError(
          err instanceof Error
            ? err.message
            : 'No fue posible sincronizar el Panel de Gobernanza.',
        );
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [tokenDeAcceso, esAdmin],
  );

  useEffect(() => {
    const controller = new AbortController();
    void cargarInicial(FILTROS_INICIALES, controller.signal);
    return () => {
      controller.abort();
    };
  }, [cargarInicial]);

  const cambiarEstrategia = useCallback(
    async (estrategiaId: EstrategiaId): Promise<ConfiguracionEstrategia> => {
      if (!tokenDeAcceso) {
        throw new Error('Credenciales de administrador requeridas.');
      }

      const validacion = validarCambioEstrategia(
        estrategiaId,
        estrategia?.estrategiaActivaId,
      );
      if (!validacion.esValido) {
        throw new Error(validacion.error ?? 'Estrategia inválida.');
      }

      setCambiandoEstrategia(true);
      setError(null);
      try {
        const actualizada = await cambiarEstrategiaMercado(
          tokenDeAcceso,
          estrategiaId,
        );
        setEstrategia(actualizada);
        return actualizada;
      } finally {
        setCambiandoEstrategia(false);
      }
    },
    [tokenDeAcceso, estrategia?.estrategiaActivaId],
  );

  const dispararRecalculo = useCallback(async (): Promise<ResumenRecalculo | null> => {
    if (!tokenDeAcceso || recalculando) {
      return null;
    }

    setRecalculando(true);
    setError(null);
    try {
      const resumen = await ejecutarRecalculoManual(tokenDeAcceso);
      setUltimoRecalculo(resumen);
      const actualizada = await obtenerEstrategiaActiva().catch(() => null);
      if (actualizada) setEstrategia(actualizada);
      return resumen;
    } finally {
      setRecalculando(false);
    }
  }, [tokenDeAcceso, recalculando]);

  const actualizarBorradorFiltro = useCallback(
    (parcial: Partial<FiltrosAuditoriaUi>) => {
      setFiltrosAuditoria((prev) => ({ ...prev, ...parcial }));
      setErrorValidacionFiltros(null);
    },
    [],
  );

  const aplicarFiltrosAuditoria = useCallback(async () => {
    if (!tokenDeAcceso || !esAdmin) return;
    const payload = aFiltroApi(filtrosAuditoria);
    const val = validarFiltrosAuditoriaAdmin(payload);
    if (!val.esValido) {
      setErrorValidacionFiltros(val.error);
      return;
    }

    setErrorValidacionFiltros(null);
    setCargando(true);
    setError(null);
    try {
      const res = await obtenerTransaccionesAuditoria(tokenDeAcceso, payload);
      setTransacciones(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo filtrar el registro de auditoría.',
      );
    } finally {
      setCargando(false);
    }
  }, [tokenDeAcceso, esAdmin, filtrosAuditoria]);

  const limpiarFiltrosAuditoria = useCallback(async () => {
    setFiltrosAuditoria(FILTROS_INICIALES);
    setErrorValidacionFiltros(null);
    await cargarInicial(FILTROS_INICIALES);
  }, [cargarInicial]);

  return {
    estrategia,
    transacciones,
    ultimoRecalculo,
    filtrosAuditoria,
    errorValidacionFiltros,
    cargando,
    cambiandoEstrategia,
    recalculando,
    error,
    cambiarEstrategia,
    dispararRecalculo,
    actualizarBorradorFiltro,
    aplicarFiltrosAuditoria,
    limpiarFiltrosAuditoria,
    recargar: () => cargarInicial(filtrosAuditoria),
  };
}

