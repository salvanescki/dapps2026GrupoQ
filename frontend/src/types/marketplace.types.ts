import type { PosicionJugador } from './player.types';

export type EstrategiaId = 'GLOBAL' | 'POSICIONAL';
export type EstrategiaVersion = 'GLOBAL_v1' | 'POSICIONAL_v1' | string;
export type PosicionFiltroRanking = Exclude<PosicionJugador, 'No Clasificado'>;
export type TipoMercado = 'PRIMARIO' | 'SECUNDARIO';
export type TipoOperacionUsuario = 'COMPRA' | 'VENTA';
export type EstadoOrdenVenta = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';
export type EstadoFiltroOrdenes = 'ACTIVA' | EstadoOrdenVenta;
export type VarianteTendencia = 'positiva' | 'negativa' | 'neutra';

export interface EstrategiaDisponible {
  id: EstrategiaId;
  version: EstrategiaVersion;
  descripcion: string;
}

export interface ConfiguracionEstrategia {
  estrategiaActivaId: EstrategiaId;
  estrategiaActivaVersion: EstrategiaVersion;
  actualizadoEn: string;
  estrategiasDisponibles: EstrategiaDisponible[];
}

export interface JugadorRanking {
  posicionRanking: number;
  jugadorId: string;
  nombre: string;
  posicion: PosicionJugador;
  equipoNombre: string;
  score: number;
  cotizacionActual: number;
  variacionPorcentual: number;
  estrategiaId: EstrategiaId;
  estrategiaVersion: EstrategiaVersion;
  tokensDisponibles: number;
}

export interface SnapshotMetricasNormalizadas {
  goals?: number;
  assists?: number;
  shots?: number;
  keyPasses?: number;
  dribbles?: number;
  tackles?: number;
  interceptions?: number;
  saves?: number;
  savePercentage?: number;
  rating?: number;
}

export interface CotizacionJugador {
  id: string;
  jugadorId: string;
  score: number;
  valor: number;
  estrategiaId: EstrategiaId;
  estrategiaVersion: EstrategiaVersion;
  sinEstadisticas: boolean;
  metricas: SnapshotMetricasNormalizadas | null;
  fechaCotizacion: string;
}

export interface CrearOrdenCompraPayload {
  jugadorId: string;
  cantidad: number;
  ordenVentaId?: string;
  precioMaximoUnitario?: number;
}

export interface ResultadoCompra {
  transaccionId: string;
  ordenId: string;
  jugadorId: string;
  cantidadTokensComprados: number;
  precioUnitarioPagado: number;
  montoTotalDebitado: number;
  saldoRestanteUsuario: number;
  tipoMercado: TipoMercado;
  estrategiaCotizacion: string;
  fecha: string;
}

export interface CrearOrdenVentaPayload {
  jugadorId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface OrdenVenta {
  ordenId: string;
  jugadorId: string;
  vendedorId: string;
  cantidad: number;
  cantidadRestante: number;
  precioUnitario: number;
  estado: EstadoOrdenVenta;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltroOrdenesVenta {
  jugadorId?: string;
  vendedorId?: string;
  estado?: EstadoFiltroOrdenes;
  limite?: number;
}

export interface PosicionPortafolio {
  jugadorId: string;
  nombreJugador: string;
  posicion: string;
  equipoNombre: string;
  cantidadTokensDisponibles: number;
  cantidadTokensEnVenta: number;
  precioPromedioAdquisicion: number;
  cotizacionActual: number;
  valoracionTotalPosicion: number;
}

export interface PortfolioUsuario {
  usuarioId: string;
  saldoBilletera: number;
  valoracionTotalTokens: number;
  patrimonioNetoTotal: number;
  posiciones: PosicionPortafolio[];
}

export interface TransaccionUsuario {
  transaccionId: string;
  ordenId: string;
  tipoOperacion: TipoOperacionUsuario;
  tipoMercado: TipoMercado;
  jugadorId: string;
  nombreJugador: string;
  cantidadTokens: number;
  precioUnitario: number;
  montoTotal: number;
  estrategiaCotizacion: string;
  contraparte: string;
  fecha: string;
}

export interface FiltroTransaccionesUsuario {
  jugadorId?: string;
  tipo?: TipoOperacionUsuario;
  desde?: string;
  hasta?: string;
  limite?: number;
}

export interface ResumenRecalculo {
  mensaje: string;
  totalJugadoresProcesados: number;
  exitosos: number;
  fallidos: number;
  sinEstadisticas: number;
  estrategiaAplicada: EstrategiaId;
  versionEstrategia: EstrategiaVersion;
  duracionMs: number;
}

export interface TransaccionAuditoria {
  transaccionId: string;
  ordenId: string;
  tipoMercado: TipoMercado;
  jugadorId: string;
  nombreJugador: string;
  compradorId: string;
  vendedorId: string;
  cantidadTokens: number;
  precioUnitario: number;
  montoTotal: number;
  estrategiaCotizacion: string;
  fecha: string;
}

export interface FiltroTransaccionesAdmin {
  jugadorId?: string;
  usuarioId?: string;
  tipoMercado?: TipoMercado;
  desde?: string;
  hasta?: string;
  limite?: number;
}

