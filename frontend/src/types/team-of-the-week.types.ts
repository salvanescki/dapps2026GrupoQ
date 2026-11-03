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

export interface UseTeamOfTheWeekReturn {
  equipo: EquipoSemanalUI | null;
  semanasDisponibles: SemanaDisponibleUI[];
  semanaSeleccionada: { ano: number; semanaIso: number } | null;
  cargando: boolean;
  error: string | null;
  esAdmin: boolean;
  generandoManual: boolean;
  mensajeAdmin: { texto: string; tipo: 'exito' | 'error' } | null;
  semanaNoEncontrada: boolean;
  seleccionarSemana: (ano: number, semanaIso: number) => void;
  volverALaMasReciente: () => void;
  recargar: () => Promise<void>;
  dispararGeneracionManual: () => Promise<void>;
  jugadorModalId: string | null;
  abrirModalJugador: (jugadorId: string) => void;
  cerrarModalJugador: () => void;
}

