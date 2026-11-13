export type PosicionJugador =
  | 'Portero'
  | 'Defensa'
  | 'Mediocampista'
  | 'Delantero'
  | 'No Clasificado';

export type CodigoLiga = 'PL' | 'PD' | 'SA' | 'BL1' | 'FL1';

export interface LigaItem {
  id: string;
  codigo: string;
  nombre: string;
  pais?: string;
  emblemaUrl?: string | null;
}

export interface EquipoItem {
  id: string;
  nombre: string;
  nombreCorto?: string;
  tla?: string;
  escudoUrl?: string | null;
  ligaId?: string;
  ligaCodigo?: string;
}

export interface Jugador {
  id: string;
  externalId?: number;
  nombre: string;
  posicion: PosicionJugador;
  posicionOriginal?: string;
  fechaNacimiento?: string | null;
  nacionalidad: string;
  dorsal?: number | null;
  equipo: {
    id: string;
    nombre: string;
    nombreCorto?: string;
    tla?: string;
    escudoUrl?: string | null;
  };
  liga: {
    id: string;
    codigo: string;
    nombre: string;
    pais?: string;
    emblemaUrl?: string | null;
  };
}

export type CampoMetricaOpcionalJugador =
  | 'rating'
  | 'tirosPorPartido'
  | 'precisionPase'
  | 'duelosAereosGanadosPorPartido'
  | 'regatesCompletadosPorPartido'
  | 'pasesClavePorPartido'
  | 'xgPorPartido'
  | 'xaPorPartido'
  | 'grandesOcasionesPorPartido'
  | 'entradasPorPartido'
  | 'intercepccionesPorPartido'
  | 'despejesPorPartido'
  | 'pasesPorPartido'
  | 'centrosPorPartido'
  | 'atajadas'
  | 'golesRecibidos'
  | 'porcentajeAtajadas'
  | 'erroresQueGeneraronGol'
  | 'autogoles';

export interface EstadisticasJugador
  extends Partial<Record<CampoMetricaOpcionalJugador, number | null>> {
  temporada: string;
  liga: string;
  partidosJugados: number;
  minutosJugados: number;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

export interface JugadorDetalle extends Jugador {
  estadisticas?: EstadisticasJugador | null;
}

export interface RespuestaCatalogoJugadores {
  items: Jugador[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FiltroJugadoresParams {
  page?: number;
  limit?: number;
  league?: string;
  teamId?: string;
  position?: string;
  search?: string;
}

export interface OpcionesFiltroRespuesta {
  ligas: LigaItem[];
  equipos: EquipoItem[];
  posiciones: string[];
}
