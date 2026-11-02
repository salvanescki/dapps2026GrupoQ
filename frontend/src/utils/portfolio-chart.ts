import {
  formatearFechaHoraCorta,
  obtenerVarianteTendencia,
} from './formato-mercado';
import type {
  PortfolioUsuario,
  PosicionPortafolio,
  TransaccionUsuario,
  VarianteTendencia,
} from '../types/marketplace.types';

export interface PuntoGraficoPatrimonio {
  indice: number;
  etiquetaEjeX: string;
  fechaFormateada: string;
  hitoOperativo: string;
  saldoBilletera: number;
  valoracionTokens: number;
  patrimonioNeto: number;
}

export interface PosicionEnriquecida extends PosicionPortafolio {
  cantidadTotalTenencia: number;
  costoTotalAdquisicion: number;
  gananciaLatenteCreditos: number;
  gananciaLatentePorcentaje: number;
  tendencia: VarianteTendencia;
}

export interface ResumenPatrimonialConsolidado {
  saldoBilletera: number;
  valoracionTotalTokens: number;
  patrimonioNetoTotal: number;
  costoTotalAdquisicion: number;
  gananciaLatenteConsolidada: number;
  gananciaLatentePorcentaje: number;
  tendenciaConsolidada: VarianteTendencia;
  posiciones: PosicionEnriquecida[];
  serieTemporal: PuntoGraficoPatrimonio[];
  sinOperaciones: boolean;
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

function etiquetaCortaUtc(iso: string, nro: number): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return `#${nro}`;
  const f = new Date(ts);
  const dia = String(f.getUTCDate()).padStart(2, '0');
  const mes = MESES_CORTOS[f.getUTCMonth()] ?? 'ene';
  return `${dia} ${mes}`;
}

export function enriquecerPosicionesPortfolio(
  posiciones: PosicionPortafolio[],
): PosicionEnriquecida[] {
  return posiciones.map((pos) => {
    const cantidadTotalTenencia =
      pos.cantidadTokensDisponibles + pos.cantidadTokensEnVenta;
    const costoCentavos = Math.round(
      cantidadTotalTenencia * pos.precioPromedioAdquisicion * 100,
    );
    const valoracionCentavos = Math.round(pos.valoracionTotalPosicion * 100);
    const diffCentavos = valoracionCentavos - costoCentavos;
    const gananciaLatenteCreditos = diffCentavos / 100;
    const gananciaLatentePorcentaje =
      costoCentavos > 0
        ? Math.round((diffCentavos / costoCentavos) * 10000) / 100
        : 0;

    return {
      ...pos,
      cantidadTotalTenencia,
      costoTotalAdquisicion: costoCentavos / 100,
      gananciaLatenteCreditos,
      gananciaLatentePorcentaje,
      tendencia: obtenerVarianteTendencia(gananciaLatenteCreditos),
    };
  });
}

export function reconstruirSeriePatrimonial(
  portfolio: PortfolioUsuario,
  transacciones: TransaccionUsuario[],
): PuntoGraficoPatrimonio[] {
  if (!Array.isArray(transacciones) || transacciones.length === 0) {
    return [
      {
        indice: 0,
        etiquetaEjeX: 'Actual',
        fechaFormateada: 'Estado actual',
        hitoOperativo: 'Saldo inicial disponible',
        saldoBilletera: portfolio.saldoBilletera,
        valoracionTokens: portfolio.valoracionTotalTokens,
        patrimonioNeto: portfolio.patrimonioNetoTotal,
      },
    ];
  }

  // 1. Clonar y ordenar ascendentemente por fecha, desempatando por transaccionId
  const ordenadasAsc = [...transacciones].sort((a, b) => {
    const diff = Date.parse(a.fecha) - Date.parse(b.fecha);
    if (!Number.isNaN(diff) && diff !== 0) {
      return diff;
    }
    return a.transaccionId.localeCompare(b.transaccionId);
  });

  const n = ordenadasAsc.length;
  const saldosCentavos: number[] = new Array(n + 1).fill(0);
  saldosCentavos[n] = Math.round(portfolio.saldoBilletera * 100);

  // Tenencias en cada paso k in [0..n]
  const tenenciasActuales = new Map<string, number>();
  const precioInicialFallbackCentavos = new Map<string, number>();

  for (const pos of portfolio.posiciones) {
    tenenciasActuales.set(
      pos.jugadorId,
      pos.cantidadTokensDisponibles + pos.cantidadTokensEnVenta,
    );
    precioInicialFallbackCentavos.set(
      pos.jugadorId,
      Math.round(pos.precioPromedioAdquisicion * 100),
    );
  }

  const snapshotsTenencias: Array<Map<string, number>> = new Array(n + 1);
  snapshotsTenencias[n] = new Map(tenenciasActuales);

  // 2. Reconstrucción exacta hacia atrás en centavos enteros
  for (let k = n; k >= 1; k--) {
    const tx = ordenadasAsc[k - 1];
    const montoCentavos = Math.round(tx.montoTotal * 100);
    const deltaEfectivo =
      tx.tipoOperacion === 'COMPRA' ? -montoCentavos : montoCentavos;
    saldosCentavos[k - 1] = saldosCentavos[k] - deltaEfectivo;

    const tenenciaPrevia = new Map(snapshotsTenencias[k]);
    const actualJugador = tenenciaPrevia.get(tx.jugadorId) ?? 0;
    if (tx.tipoOperacion === 'COMPRA') {
      tenenciaPrevia.set(
        tx.jugadorId,
        Math.max(0, actualJugador - tx.cantidadTokens),
      );
    } else {
      tenenciaPrevia.set(tx.jugadorId, actualJugador + tx.cantidadTokens);
    }
    snapshotsTenencias[k - 1] = tenenciaPrevia;

    if (!precioInicialFallbackCentavos.has(tx.jugadorId)) {
      precioInicialFallbackCentavos.set(
        tx.jugadorId,
        Math.round(tx.precioUnitario * 100),
      );
    }
  }

  // Primer precio observado en la ventana para tenencias previas en k=0
  const primerPrecioObservado = new Map<string, number>(
    precioInicialFallbackCentavos,
  );
  for (let i = ordenadasAsc.length - 1; i >= 0; i--) {
    const tx = ordenadasAsc[i];
    primerPrecioObservado.set(
      tx.jugadorId,
      Math.round(tx.precioUnitario * 100),
    );
  }

  // 3. Proyección hacia adelante (k = 0..n) + punto final exacto "Valoración actual"
  const ultimoPrecioObservado = new Map<string, number>(primerPrecioObservado);
  const puntos: PuntoGraficoPatrimonio[] = [];

  const calcularValoracionPasoCentavos = (tenencias: Map<string, number>): number => {
    let total = 0;
    for (const [jugadorId, cantidad] of tenencias.entries()) {
      if (cantidad > 0) {
        const unitario = ultimoPrecioObservado.get(jugadorId) ?? 0;
        total += cantidad * unitario;
      }
    }
    return total;
  };

  const valInicialCentavos = calcularValoracionPasoCentavos(snapshotsTenencias[0]);
  puntos.push({
    indice: 0,
    etiquetaEjeX: 'Inicio',
    fechaFormateada: 'Punto de partida',
    hitoOperativo: 'Saldo inicial antes de operaciones',
    saldoBilletera: saldosCentavos[0] / 100,
    valoracionTokens: valInicialCentavos / 100,
    patrimonioNeto: (saldosCentavos[0] + valInicialCentavos) / 100,
  });

  const ocurrenciaEtiqueta = new Map<string, number>();

  for (let k = 1; k <= n; k++) {
    const tx = ordenadasAsc[k - 1];
    ultimoPrecioObservado.set(
      tx.jugadorId,
      Math.round(tx.precioUnitario * 100),
    );

    const valPasoCentavos = calcularValoracionPasoCentavos(snapshotsTenencias[k]);
    const baseEje = etiquetaCortaUtc(tx.fecha, k);
    const vistasPrevias = (ocurrenciaEtiqueta.get(baseEje) ?? 0) + 1;
    ocurrenciaEtiqueta.set(baseEje, vistasPrevias);
    const etiquetaEjeX =
      vistasPrevias > 1 ? `${baseEje} (${vistasPrevias})` : baseEje;

    const verbo = tx.tipoOperacion === 'COMPRA' ? 'Compra' : 'Venta';
    const mercado = tx.tipoMercado === 'PRIMARIO' ? 'Primario' : 'Secundario';

    puntos.push({
      indice: k,
      etiquetaEjeX,
      fechaFormateada: formatearFechaHoraCorta(tx.fecha),
      hitoOperativo: `${verbo} ${tx.cantidadTokens}x ${tx.nombreJugador} (${mercado})`,
      saldoBilletera: saldosCentavos[k] / 100,
      valoracionTokens: valPasoCentavos / 100,
      patrimonioNeto: (saldosCentavos[k] + valPasoCentavos) / 100,
    });
  }

  // Punto de convergencia matemática 100% exacta con el snapshot vigente del Portfolio
  puntos.push({
    indice: n + 1,
    etiquetaEjeX: 'Actual',
    fechaFormateada: 'Cotización vigente',
    hitoOperativo: 'Valoración actual',
    saldoBilletera: portfolio.saldoBilletera,
    valoracionTokens: portfolio.valoracionTotalTokens,
    patrimonioNeto: portfolio.patrimonioNetoTotal,
  });

  return puntos;
}

export function construirResumenPatrimonial(
  portfolio: PortfolioUsuario,
  transacciones: TransaccionUsuario[],
): ResumenPatrimonialConsolidado {
  const posiciones = enriquecerPosicionesPortfolio(portfolio.posiciones);

  let costoTotalCentavos = 0;
  let valoracionPosicionesCentavos = 0;

  for (const pos of posiciones) {
    costoTotalCentavos += Math.round(pos.costoTotalAdquisicion * 100);
    valoracionPosicionesCentavos += Math.round(pos.valoracionTotalPosicion * 100);
  }

  const diffCentavos = valoracionPosicionesCentavos - costoTotalCentavos;
  const gananciaLatenteConsolidada = diffCentavos / 100;
  const gananciaLatentePorcentaje =
    costoTotalCentavos > 0
      ? Math.round((diffCentavos / costoTotalCentavos) * 10000) / 100
      : 0;

  const serieTemporal = reconstruirSeriePatrimonial(portfolio, transacciones);

  return {
    saldoBilletera: portfolio.saldoBilletera,
    valoracionTotalTokens: portfolio.valoracionTotalTokens,
    patrimonioNetoTotal: portfolio.patrimonioNetoTotal,
    costoTotalAdquisicion: costoTotalCentavos / 100,
    gananciaLatenteConsolidada,
    gananciaLatentePorcentaje,
    tendenciaConsolidada: obtenerVarianteTendencia(gananciaLatenteConsolidada),
    posiciones,
    serieTemporal,
    sinOperaciones: transacciones.length === 0,
  };
}

