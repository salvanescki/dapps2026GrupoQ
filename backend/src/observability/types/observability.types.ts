/**
 * Tipos e interfaces fuertemente tipados para el sistema de Observabilidad y Health Checks.
 */

export const PROMETHEUS_METRIC_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
export const COUNTER_SUFFIX = '_total';
export const HISTOGRAM_SUFFIX = '_seconds';

export enum TipoMetrica {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
}

export interface MetricaDefinicion {
  nombre: string;
  descripcion: string;
  tipo: TipoMetrica;
  etiquetas?: string[];
  buckets?: number[];
}

export interface RegistroMetrica {
  nombre: string;
  etiquetas: Record<string, string>;
  valor: number;
  timestamp?: Date;
}

export interface ComponenteSalud {
  status: 'up' | 'down';
  mensaje?: string;
  [key: string]: any;
}

export interface ResultadoSondaSalud {
  status: 'ok' | 'error';
  info?: Record<string, ComponenteSalud>;
  error?: Record<string, ComponenteSalud>;
  details: Record<string, ComponenteSalud>;
}

/**
 * Valida si un nombre de métrica cumple con los estándares canónicos de Prometheus.
 */
export function validarNombreMetrica(nombre: string, tipo?: TipoMetrica): boolean {
  if (!PROMETHEUS_METRIC_NAME_REGEX.test(nombre)) {
    return false;
  }
  if (tipo === TipoMetrica.COUNTER && !nombre.endsWith(COUNTER_SUFFIX)) {
    return false;
  }
  if (tipo === TipoMetrica.HISTOGRAM && !nombre.endsWith(HISTOGRAM_SUFFIX)) {
    return false;
  }
  return true;
}
