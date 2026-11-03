/**
 * Frontend Interfaces and Contracts: Equipo de la Semana (Team of the Week)
 * Feature: 014-team-of-the-week
 */

export type PosicionTactica =
  | 'Portero'
  | 'Defensa'
  | 'Mediocampista'
  | 'Delantero';

export interface MiembroEquipoSemanalUI {
  jugadorId: string;
  nombre: string;
  equipoNombre: string;
  posicion: PosicionTactica;
  cotizacion: number;
  score: number;
  orden: number;
}

export interface EquipoSemanalUI {
  id: string;
  ano: number;
  semanaIso: number;
  formacion: string;
  estrategiaId: string;
  estrategiaVersion: string;
  fechaGeneracion: string;
  miembros: MiembroEquipoSemanalUI[];
}

export interface SemanaDisponibleUI {
  ano: number;
  semanaIso: number;
  fechaGeneracion: string;
}

export interface ResumenGeneracionEquipoUI {
  mensaje: string;
  equipo: EquipoSemanalUI;
}

/**
 * Contrato de Métodos del Cliente HTTP (teamOfTheWeekApi.ts)
 */
export interface TeamOfTheWeekApiClient {
  obtenerEquipoVigente(signal?: AbortSignal): Promise<EquipoSemanalUI | null>;
  obtenerSemanasDisponibles(signal?: AbortSignal): Promise<SemanaDisponibleUI[]>;
  obtenerEquipoPorSemana(
    ano: number,
    semanaIso: number,
    signal?: AbortSignal,
  ): Promise<EquipoSemanalUI>;
  generarEquipoManual(signal?: AbortSignal): Promise<ResumenGeneracionEquipoUI>;
}

/**
 * Contrato del Hook de Presentación (useTeamOfTheWeek.ts)
 * La semana seleccionada se lee de la ruta /team-of-the-week/:year/:week;
 * seleccionarSemana navega a esa ruta.
 */
export interface UseTeamOfTheWeekReturn {
  equipo: EquipoSemanalUI | null;
  semanasDisponibles: SemanaDisponibleUI[];
  semanaSeleccionada: { ano: number; semanaIso: number } | null;
  cargando: boolean;
  error: string | null;
  semanaNoEncontrada: boolean;
  esAdmin: boolean;
  generandoManual: boolean;
  mensajeAdmin: string | null;
  seleccionarSemana: (ano: number, semanaIso: number) => void;
  volverALaMasReciente: () => void;
  recargar: () => Promise<void>;
  dispararGeneracionManual: () => Promise<void>;
  jugadorModalId: string | null;
  abrirModalJugador: (jugadorId: string) => void;
  cerrarModalJugador: () => void;
}

