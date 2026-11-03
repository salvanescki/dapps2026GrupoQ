import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HttpError } from '../api/http-client';
import {
  obtenerEquipoVigente,
  obtenerSemanasDisponibles,
  obtenerEquipoPorSemana,
  generarEquipoManual,
} from '../api/teamOfTheWeekApi';
import type {
  EquipoSemanalUI,
  SemanaDisponibleUI,
  UseTeamOfTheWeekReturn,
} from '../types/team-of-the-week.types';

const RUTA_BASE = '/team-of-the-week';

function esAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function esSemanaInexistente(err: unknown): boolean {
  return (
    err instanceof HttpError &&
    (err.codigoEstado === 404 || err.codigoEstado === 400)
  );
}

export function useTeamOfTheWeek(): UseTeamOfTheWeekReturn {
  const auth = useContext(AuthContext);
  const token = auth?.tokenDeAcceso ?? null;
  const esAdmin = auth?.usuario?.rol === 'ADMIN';
  const navigate = useNavigate();
  const { year, week } = useParams();

  const [equipo, setEquipo] = useState<EquipoSemanalUI | null>(null);
  const [semanasDisponibles, setSemanasDisponibles] = useState<
    SemanaDisponibleUI[]
  >([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [semanaNoEncontrada, setSemanaNoEncontrada] = useState<boolean>(false);
  const [jugadorModalId, setJugadorModalId] = useState<string | null>(null);

  const [generandoManual, setGenerandoManual] = useState<boolean>(false);
  const [mensajeAdmin, setMensajeAdmin] = useState<{
    texto: string;
    tipo: 'exito' | 'error';
  } | null>(null);

  const cargarEquipoSolicitado = useCallback(
    async (
      signal?: AbortSignal,
    ): Promise<{ equipo: EquipoSemanalUI | null; noEncontrada: boolean }> => {
      if (year === undefined || week === undefined) {
        return { equipo: await obtenerEquipoVigente(token, signal), noEncontrada: false };
      }

      const ano = Number(year);
      const semanaIso = Number(week);
      if (!Number.isInteger(ano) || !Number.isInteger(semanaIso)) {
        return { equipo: null, noEncontrada: true };
      }

      try {
        return {
          equipo: await obtenerEquipoPorSemana(ano, semanaIso, token, signal),
          noEncontrada: false,
        };
      } catch (err) {
        if (esSemanaInexistente(err)) {
          return { equipo: null, noEncontrada: true };
        }
        throw err;
      }
    },
    [token, year, week],
  );

  const cargarDatos = useCallback(
    async (signal?: AbortSignal) => {
      setCargando(true);
      setError(null);

      try {
        const [resultado, semanas] = await Promise.all([
          cargarEquipoSolicitado(signal),
          obtenerSemanasDisponibles(token, signal),
        ]);

        if (signal?.aborted) return;

        setEquipo(resultado.equipo);
        setSemanaNoEncontrada(resultado.noEncontrada);
        setSemanasDisponibles(semanas);
      } catch (err) {
        if (esAbortError(err)) return;
        setError(
          (err as Error).message ||
            'Error al cargar el Equipo de la Semana. Intente nuevamente.',
        );
      } finally {
        if (!signal?.aborted) {
          setCargando(false);
        }
      }
    },
    [token, cargarEquipoSolicitado],
  );

  useEffect(() => {
    const controller = new AbortController();
    void cargarDatos(controller.signal);

    return () => {
      controller.abort();
    };
  }, [cargarDatos]);

  const seleccionarSemana = useCallback(
    (ano: number, semanaIso: number) => {
      navigate(`${RUTA_BASE}/${ano}/${semanaIso}`);
    },
    [navigate],
  );

  const volverALaMasReciente = useCallback(() => {
    navigate(RUTA_BASE);
  }, [navigate]);

  const recargar = useCallback(async () => {
    await cargarDatos();
  }, [cargarDatos]);

  const abrirModalJugador = useCallback((jugadorId: string) => {
    setJugadorModalId(jugadorId);
  }, []);

  const cerrarModalJugador = useCallback(() => {
    setJugadorModalId(null);
  }, []);

  const dispararGeneracionManual = useCallback(async () => {
    if (!token) return;
    setGenerandoManual(true);
    setMensajeAdmin(null);

    try {
      const res = await generarEquipoManual(token);
      setEquipo(res.equipo);
      setSemanaNoEncontrada(false);

      const semanas = await obtenerSemanasDisponibles(token);
      setSemanasDisponibles(semanas);

      navigate(`${RUTA_BASE}/${res.equipo.ano}/${res.equipo.semanaIso}`, {
        replace: true,
      });

      setMensajeAdmin({
        texto: res.mensaje || 'Equipo de la Semana generado exitosamente.',
        tipo: 'exito',
      });
    } catch (err) {
      setMensajeAdmin({
        texto:
          (err as Error).message ||
          'Error al generar manualmente el Equipo de la Semana.',
        tipo: 'error',
      });
    } finally {
      setGenerandoManual(false);
      setTimeout(() => {
        setMensajeAdmin(null);
      }, 5000);
    }
  }, [token, navigate]);

  const semanaSeleccionada = equipo
    ? { ano: equipo.ano, semanaIso: equipo.semanaIso }
    : null;

  return {
    equipo,
    semanasDisponibles,
    semanaSeleccionada,
    cargando,
    error,
    semanaNoEncontrada,
    esAdmin,
    generandoManual,
    mensajeAdmin,
    seleccionarSemana,
    volverALaMasReciente,
    recargar,
    dispararGeneracionManual,
    jugadorModalId,
    abrirModalJugador,
    cerrarModalJugador,
  };
}
