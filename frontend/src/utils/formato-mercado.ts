import type { VarianteTendencia } from '../types/marketplace.types';

function formatearMilesConPunto(parteEntera: string): string {
  const longitud = parteEntera.length;
  if (longitud <= 3) {
    return parteEntera;
  }
  const bloques: string[] = [];
  let fin = longitud;
  while (fin > 0) {
    const inicio = Math.max(0, fin - 3);
    bloques.unshift(parteEntera.slice(inicio, fin));
    fin = inicio;
  }
  return bloques.join('.');
}

export function formatearCreditos(valor: number): string {
  if (!Number.isFinite(valor)) {
    return '0,00';
  }
  const centavos = Math.round(valor * 100);
  const signo = centavos < 0 ? '-' : '';
  const absoluto = (Math.abs(centavos) / 100).toFixed(2);
  const [parteEntera, parteDecimal] = absoluto.split('.');
  const enteraConMiles = formatearMilesConPunto(parteEntera);
  return `${signo}${enteraConMiles},${parteDecimal}`;
}

export function obtenerVarianteTendencia(valor: number): VarianteTendencia {
  if (!Number.isFinite(valor)) {
    return 'neutra';
  }
  const centesimas = Math.round(valor * 100);
  if (centesimas > 0) return 'positiva';
  if (centesimas < 0) return 'negativa';
  return 'neutra';
}

export function formatearPorcentajeVariacion(valor: number): string {
  if (!Number.isFinite(valor)) {
    return '0,00%';
  }
  const centesimas = Math.round(valor * 100);
  if (centesimas === 0) {
    return '0,00%';
  }
  const signo = centesimas > 0 ? '+' : '-';
  const textoAbsoluto = (Math.abs(centesimas) / 100).toFixed(2).replace('.', ',');
  return `${signo}${textoAbsoluto}%`;
}

export function normalizarFechaDesdeIso(fechaYmd: string): string {
  const limpia = fechaYmd.trim();
  if (!limpia) return '';
  if (limpia.includes('T')) return limpia;
  return `${limpia}T00:00:00.000Z`;
}

export function normalizarFechaHastaIso(fechaYmd: string): string {
  const limpia = fechaYmd.trim();
  if (!limpia) return '';
  if (limpia.includes('T')) return limpia;
  return `${limpia}T23:59:59.999Z`;
}

export function formatearFechaHoraCorta(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return '—';
  }
  const fecha = new Date(timestamp);
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const anio = fecha.getUTCFullYear();
  const horas = String(fecha.getUTCHours()).padStart(2, '0');
  const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

export function formatearContraparte(contraparte: string): string {
  const limpia = contraparte.trim();
  if (!limpia) return '—';
  if (limpia === 'MERCADO_PRIMARIO') {
    return 'Mercado Primario (Emisión Oficial)';
  }
  if (limpia.length > 12 && limpia.includes('-')) {
    return `Inversor (${limpia.slice(0, 8)}…)`;
  }
  return limpia;
}

export function formatearNombreEstrategia(estrategiaId: string): string {
  if (estrategiaId === 'GLOBAL') return 'Ponderación Global';
  if (estrategiaId === 'POSICIONAL') return 'Ponderación Posicional';
  return estrategiaId;
}

