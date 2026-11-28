import { SERVICIO_AUDITORIA } from '../constants/audit-events.constant';

export type NivelLogPino = 10 | 20 | 30 | 40 | 50 | 60;

export type ActorAuditoriaHttpAutenticado = {
  autenticado: true;
  id: string;
  email: string | null;
  rol: string | null;
};

export type ActorAuditoriaHttpAnonimo = {
  autenticado: false;
  tipo: 'ANONIMO';
  id: null;
  email: null;
  rol: null;
};

export type ActorAuditoriaHttp =
  | ActorAuditoriaHttpAutenticado
  | ActorAuditoriaHttpAnonimo;

export interface OperacionHttp {
  metodo: string;
  ruta: string;
  controlador: string | null;
}

export interface ParametrosHttpSanitizados {
  ruta: Record<string, unknown>;
  consulta: Record<string, unknown>;
  cuerpo: Record<string, unknown> | null;
}

export interface ResumenErrorHttp {
  codigoEstado: number;
  mensaje: string | string[];
}

export interface RegistroAuditoriaHttp {
  level: NivelLogPino;
  timestamp: string;
  servicio: typeof SERVICIO_AUDITORIA;
  entorno: string;
  tipoEvento: 'HTTP_AUDIT';
  requestId: string;
  usuario: ActorAuditoriaHttp;
  operacion: OperacionHttp;
  parametros: ParametrosHttpSanitizados;
  codigoEstado: number;
  tiempoEjecucion: number;
  error?: ResumenErrorHttp;
  msg: string;
}

export interface EntradaAuditoriaHttp {
  requestId: string;
  usuario: ActorAuditoriaHttp;
  operacion: OperacionHttp;
  parametros: ParametrosHttpSanitizados;
  codigoEstado: number;
  tiempoEjecucion: number;
  error?: ResumenErrorHttp;
  esRutaTecnica?: boolean;
  msg?: string;
}

export type NombreEventoNegocio =
  | 'TRANSACCION_TOKENS'
  | 'ORDEN_MERCADO_SECUNDARIO'
  | 'CALCULO_COTIZACIONES'
  | 'CAMBIO_ESTRATEGIA_COTIZACION'
  | 'CALCULO_TEAM_OF_THE_WEEK'
  | 'SCRAPING_ESTADISTICAS'
  | 'SCRAPING_LIGA';

export type OrigenEventoNegocio =
  | 'HTTP'
  | 'MANUAL'
  | 'PROGRAMADO'
  | 'PROGRAMADO_TOTW'
  | 'STANDALONE'
  | 'SISTEMA';

export type ResultadoAuditoriaNegocio =
  | 'EXITO'
  | 'RECHAZADO'
  | 'OMITIDO'
  | 'FALLIDO';

export interface DatosTransaccionTokens {
  mercado: 'PRIMARIO' | 'SECUNDARIO';
  operacion: 'COMPRA';
  compradorId: string;
  vendedorId: string | null;
  transaccionId: string | null;
  ordenId: string | null;
  jugadorId: string | null;
  cantidad: number;
  precioUnitario: number | null;
  montoTotal: number | null;
  estrategiaCotizacion?: string | null;
}

export interface DatosOrdenMercadoSecundario {
  mercado: 'SECUNDARIO';
  accion: 'CREAR_VENTA' | 'CANCELAR_VENTA';
  vendedorId: string;
  ordenId: string | null;
  jugadorId: string | null;
  cantidad: number | null;
  precioUnitario: number | null;
  estadoOrden: 'PENDIENTE' | 'CANCELADA' | null;
}

export interface DatosCalculoCotizaciones {
  estrategiaId: string | null;
  estrategiaVersion: string | null;
  procesados: number;
  sinEstadisticas: number;
  fallidos: number;
}

export interface DatosCambioEstrategiaCotizacion {
  estrategiaAnterior: string | null;
  estrategiaNueva: string;
  versionNueva: string | null;
}

export interface DatosCalculoTeamOfTheWeek {
  ano: number;
  semanaIso: number;
  estrategiaId?: string | null;
  estrategiaVersion?: string | null;
  cantidadMiembros: number;
}

export type SubtipoScrapingEstadisticas =
  | 'EJECUCION_COMPLETA'
  | 'RECUPERACION_HUERFANA'
  | 'RECUPERACION_ATASCADA'
  | 'RECHAZO_CONCURRENCIA';

export type EstadoFinalScraping =
  | 'EXITOSO'
  | 'FALLIDO'
  | 'RECHAZADO'
  | 'EN_PROGRESO';

export interface DatosScrapingEstadisticas {
  subtipo: SubtipoScrapingEstadisticas;
  ejecucionId: string | null;
  disparador: string;
  ligasProcesadas: string[];
  tasaAsociacion: number | null;
  conteoIncidencias: number;
  jugadoresProcesados: number;
  errores: number;
  estadoFinal: EstadoFinalScraping;
}

export interface DatosScrapingLiga {
  ejecucionId: string;
  liga: string;
  descubiertos: number;
  deduplicados: number;
  asociados: number;
  descartados: number;
  tasaAsociacion: number;
  conteoIncidencias: number;
  rechazadaPorCobertura: boolean;
}

export type DatosEventoNegocio =
  | DatosTransaccionTokens
  | DatosOrdenMercadoSecundario
  | DatosCalculoCotizaciones
  | DatosCambioEstrategiaCotizacion
  | DatosCalculoTeamOfTheWeek
  | DatosScrapingEstadisticas
  | DatosScrapingLiga
  | Record<string, unknown>;

export interface EventoAuditoriaNegocio<
  TDatos extends Record<string, unknown> = Record<string, unknown>,
> {
  level: 30 | 40 | 50;
  timestamp: string;
  servicio: typeof SERVICIO_AUDITORIA;
  entorno: string;
  tipoEvento: 'BUSINESS_AUDIT';
  evento: NombreEventoNegocio;
  requestId: string | null;
  origen: OrigenEventoNegocio;
  usuarioId: string | null;
  resultado: ResultadoAuditoriaNegocio;
  motivo: string | null;
  tiempoEjecucion: number;
  datos: TDatos;
  msg: string;
}

export interface EntradaEventoNegocio {
  evento: NombreEventoNegocio;
  requestId?: string | null;
  origen: OrigenEventoNegocio;
  usuarioId: string | null;
  resultado: ResultadoAuditoriaNegocio;
  motivo: string | null;
  tiempoEjecucion: number;
  datos: Record<string, unknown>;
  msg?: string;
}

export interface ResultadoExtraccionExito {
  resultado: ResultadoAuditoriaNegocio;
  motivo?: string | null;
  datos: Record<string, unknown>;
}

export interface OpcionesAspectoAuditoria<
  TResultado = any,
  TArgs extends unknown[] = any[],
> {
  evento: NombreEventoNegocio;
  origen:
    | OrigenEventoNegocio
    | ((args: TArgs, metadatos: Record<string, unknown>) => OrigenEventoNegocio);
  extraerUsuarioId?: (
    args: TArgs,
    metadatos: Record<string, unknown>,
  ) => string | null;
  debeEmitir?: (
    resultado: TResultado,
    args: TArgs,
    metadatos: Record<string, unknown>,
  ) => boolean;
  debeEmitirError?: (
    error: unknown,
    args: TArgs,
    metadatos: Record<string, unknown>,
  ) => boolean;
  extraerResultadoExito: (
    resultado: TResultado,
    args: TArgs,
    metadatos: Record<string, unknown>,
  ) => ResultadoExtraccionExito;
  extraerDatosError?: (
    error: unknown,
    args: TArgs,
    metadatos: Record<string, unknown>,
  ) => Record<string, unknown>;
}
