import { formatearFechaHoraCorta } from './formato-mercado';
import type {
  CotizacionJugador,
  EstrategiaId,
} from '../types/marketplace.types';

export interface PuntoGraficoCotizacion {
  id: string;
  fechaIso: string;
  etiquetaEjeX: string;
  fechaFormateada: string;
  valor: number;
  score: number;
  estrategiaId: EstrategiaId;
  estrategiaVersion: string;
  sinEstadisticas: boolean;
}

export interface ResultadoSerieCotizaciones {
  puntos: PuntoGraficoCotizacion[];
  cotizacionVigente: CotizacionJugador | null;
  dominioY: [number, number];
  esHistorialUnico: boolean;
}

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function formatearClaveDiaUtc(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const f = new Date(ts);
  const dia = String(f.getUTCDate()).padStart(2, '0');
  const mes = MESES_CORTOS[f.getUTCMonth()] ?? 'ene';
  return `${dia} ${mes}`;
}

function formatearDiaHoraUtc(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const f = new Date(ts);
  const dia = String(f.getUTCDate()).padStart(2, '0');
  const mes = String(f.getUTCMonth() + 1).padStart(2, '0');
  const horas = String(f.getUTCHours()).padStart(2, '0');
  const min = String(f.getUTCMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${horas}:${min}`;
}

export function calcularDominioCotizacion(valores: number[]): [number, number] {
  const validos = valores.filter((v) => Number.isFinite(v));
  if (validos.length === 0) {
    return [0, 1];
  }

  const min = Math.min(...validos);
  const max = Math.max(...validos);

  if (Math.abs(max - min) < 1e-9) {
    const piso = Math.max(0, Math.round((min - 0.1) * 100) / 100);
    const techo = Math.round((max + 0.1) * 100) / 100;
    return [piso, techo];
  }

  const margen = Math.max(0.05, (max - min) * 0.1);
  const piso = Math.max(0, Math.round((min - margen) * 100) / 100);
  const techo = Math.round((max + margen) * 100) / 100;
  return [piso, techo];
}

export function prepararSerieCotizaciones(
  cotizaciones: CotizacionJugador[],
): ResultadoSerieCotizaciones {
  if (!Array.isArray(cotizaciones) || cotizaciones.length === 0) {
    return {
      puntos: [],
      cotizacionVigente: null,
      dominioY: [0, 1],
      esHistorialUnico: false,
    };
  }

  // Clonar sin mutar el arreglo original recibido desde el backend (fechaCotizacion DESC)
  const ordenadasAsc = [...cotizaciones].sort((a, b) => {
    const diff = Date.parse(a.fechaCotizacion) - Date.parse(b.fechaCotizacion);
    if (!Number.isNaN(diff) && diff !== 0) {
      return diff;
    }
    return a.id.localeCompare(b.id);
  });

  const conteoPorDia = new Map<string, number>();
  for (const cot of ordenadasAsc) {
    const claveDia = formatearClaveDiaUtc(cot.fechaCotizacion);
    conteoPorDia.set(claveDia, (conteoPorDia.get(claveDia) ?? 0) + 1);
  }

  const conteoEtiquetaExacta = new Map<string, number>();
  const etiquetasBase = ordenadasAsc.map((cot) => {
    const claveDia = formatearClaveDiaUtc(cot.fechaCotizacion);
    const colisionaDia = (conteoPorDia.get(claveDia) ?? 0) > 1;
    const base = colisionaDia ? formatearDiaHoraUtc(cot.fechaCotizacion) : claveDia;
    conteoEtiquetaExacta.set(base, (conteoEtiquetaExacta.get(base) ?? 0) + 1);
    return base;
  });

  const ocurrenciaActual = new Map<string, number>();
  const puntos: PuntoGraficoCotizacion[] = ordenadasAsc.map((cot, idx) => {
    const base = etiquetasBase[idx];
    const totalConMismaBase = conteoEtiquetaExacta.get(base) ?? 1;
    let etiquetaEjeX = base;
    if (totalConMismaBase > 1) {
      const nro = (ocurrenciaActual.get(base) ?? 0) + 1;
      ocurrenciaActual.set(base, nro);
      etiquetaEjeX = `${base} (#${nro})`;
    }

    return {
      id: cot.id,
      fechaIso: cot.fechaCotizacion,
      etiquetaEjeX,
      fechaFormateada: formatearFechaHoraCorta(cot.fechaCotizacion),
      valor: cot.valor,
      score: cot.score,
      estrategiaId: cot.estrategiaId,
      estrategiaVersion: cot.estrategiaVersion,
      sinEstadisticas: cot.sinEstadisticas,
    };
  });

  const cotizacionVigente = ordenadasAsc[ordenadasAsc.length - 1] ?? null;
  const dominioY = calcularDominioCotizacion(puntos.map((p) => p.valor));

  return {
    puntos,
    cotizacionVigente,
    dominioY,
    esHistorialUnico: puntos.length === 1,
  };
}

