import { formatearCreditos } from './formato-mercado';
import type { RolUsuario } from '../types/auth.types';
import type {
  EstrategiaId,
  FiltroTransaccionesAdmin,
  OrdenVenta,
} from '../types/marketplace.types';

export interface ResultadoValidacionMercado {
  esValido: boolean;
  error: string | null;
  costoEstimado?: number;
  ingresoBrutoEstimado?: number;
  agotadoPrimario?: boolean;
  bloqueadoAdmin?: boolean;
  bloqueadoAutocompra?: boolean;
}

export interface ValidarOrdenCompraPrimariaParams {
  cantidad: number;
  cotizacionActual: number;
  stockPrimarioConocido?: number | null;
  precioMaximoUnitario?: number | null;
  saldoDisponible?: number;
  rol?: RolUsuario;
}

export function esEnteroPositivo(valor: number): boolean {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    Number.isInteger(valor) &&
    valor >= 1
  );
}

export function tieneMaximoDosDecimales(valor: number): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    return false;
  }
  const centavos = valor * 100;
  return Math.abs(Math.round(centavos) - centavos) < 1e-6;
}

export function validarOrdenCompraPrimaria(
  params: ValidarOrdenCompraPrimariaParams,
): ResultadoValidacionMercado {
  const {
    cantidad,
    cotizacionActual,
    stockPrimarioConocido,
    precioMaximoUnitario,
    saldoDisponible,
    rol,
  } = params;

  const costoCentavos =
    esEnteroPositivo(cantidad) &&
    Number.isFinite(cotizacionActual) &&
    cotizacionActual > 0
      ? Math.round(cantidad * Math.round(cotizacionActual * 100))
      : 0;
  const costoEstimado = costoCentavos / 100;

  if (rol === 'ADMIN') {
    return {
      esValido: false,
      bloqueadoAdmin: true,
      costoEstimado,
      error:
        'La cuenta Administradora es la emisora oficial y no puede autocomprar inventario primario.',
    };
  }

  if (stockPrimarioConocido === 0) {
    return {
      esValido: false,
      agotadoPrimario: true,
      costoEstimado,
      error:
        'El suministro primario de este jugador está agotado (0 / 100). Revisa las ofertas vigentes en el libro de órdenes del mercado secundario.',
    };
  }

  if (!esEnteroPositivo(cantidad)) {
    return {
      esValido: false,
      costoEstimado: 0,
      error: 'Ingresa una cantidad entera de al menos 1 token.',
    };
  }

  if (
    typeof stockPrimarioConocido === 'number' &&
    stockPrimarioConocido > 0 &&
    cantidad > stockPrimarioConocido
  ) {
    return {
      esValido: false,
      costoEstimado,
      error: `La cantidad supera los tokens disponibles en emisión primaria (${stockPrimarioConocido}).`,
    };
  }

  if (precioMaximoUnitario !== undefined && precioMaximoUnitario !== null) {
    const cotizacionCentavos = Math.round(cotizacionActual * 100);
    const maxCentavos = Math.round(precioMaximoUnitario * 100);
    if (
      !tieneMaximoDosDecimales(precioMaximoUnitario) ||
      maxCentavos < cotizacionCentavos
    ) {
      return {
        esValido: false,
        costoEstimado,
        error: `El precio máximo debe ser mayor a 0 y al menos igual a la cotización vigente (${formatearCreditos(
          cotizacionActual,
        )} cr.) para ejecutarse ahora.`,
      };
    }
  }

  if (
    saldoDisponible !== undefined &&
    Number.isFinite(saldoDisponible) &&
    costoCentavos > Math.round(saldoDisponible * 100)
  ) {
    return {
      esValido: false,
      costoEstimado,
      error: 'Saldo insuficiente en billetera para cubrir el costo estimado.',
    };
  }

  return {
    esValido: true,
    error: null,
    costoEstimado,
  };
}

export interface ValidarPublicacionOrdenVentaParams {
  cantidad: number;
  precioUnitario: number;
  cantidadTokensDisponibles: number;
}

export function validarPublicacionOrdenVenta(
  params: ValidarPublicacionOrdenVentaParams,
): ResultadoValidacionMercado {
  const { cantidad, precioUnitario, cantidadTokensDisponibles } = params;

  const ingresoCentavos =
    esEnteroPositivo(cantidad) && tieneMaximoDosDecimales(precioUnitario)
      ? Math.round(cantidad * Math.round(precioUnitario * 100))
      : 0;
  const ingresoBrutoEstimado = ingresoCentavos / 100;

  if (!esEnteroPositivo(cantidad)) {
    return {
      esValido: false,
      ingresoBrutoEstimado: 0,
      error: 'Ingresa una cantidad entera de al menos 1 token.',
    };
  }

  if (cantidad > cantidadTokensDisponibles) {
    return {
      esValido: false,
      ingresoBrutoEstimado,
      error: `Solo puedes ofertar hasta ${cantidadTokensDisponibles} tokens libres de custodia.`,
    };
  }

  if (!tieneMaximoDosDecimales(precioUnitario)) {
    return {
      esValido: false,
      ingresoBrutoEstimado: 0,
      error: 'Ingresa un precio unitario válido mayor a 0,00 créditos (máximo 2 decimales).',
    };
  }

  return {
    esValido: true,
    error: null,
    ingresoBrutoEstimado,
  };
}

export interface ValidarCompraSecundariaParams {
  orden: OrdenVenta;
  cantidad: number;
  usuarioId?: string;
  saldoDisponible?: number;
}

export function validarCompraSecundaria(
  params: ValidarCompraSecundariaParams,
): ResultadoValidacionMercado {
  const { orden, cantidad, usuarioId, saldoDisponible } = params;

  const costoCentavos =
    esEnteroPositivo(cantidad) && Number.isFinite(orden.precioUnitario)
      ? Math.round(cantidad * Math.round(orden.precioUnitario * 100))
      : 0;
  const costoEstimado = costoCentavos / 100;

  if (usuarioId && orden.vendedorId === usuarioId) {
    return {
      esValido: false,
      bloqueadoAutocompra: true,
      costoEstimado,
      error:
        'No puedes autocomprar tu propia oferta de venta. Utiliza "Cancelar orden" si deseas retirar los tokens de custodia.',
    };
  }

  if (!esEnteroPositivo(cantidad)) {
    return {
      esValido: false,
      costoEstimado: 0,
      error: 'Ingresa una cantidad entera de al menos 1 token.',
    };
  }

  if (cantidad > orden.cantidadRestante) {
    return {
      esValido: false,
      costoEstimado,
      error: `La cantidad solicitada supera el remanente disponible en esta oferta (${orden.cantidadRestante}).`,
    };
  }

  if (
    saldoDisponible !== undefined &&
    Number.isFinite(saldoDisponible) &&
    costoCentavos > Math.round(saldoDisponible * 100)
  ) {
    return {
      esValido: false,
      costoEstimado,
      error: 'Saldo insuficiente en billetera para cubrir el costo estimado.',
    };
  }

  return {
    esValido: true,
    error: null,
    costoEstimado,
  };
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarFiltrosAuditoriaAdmin(
  filtros: FiltroTransaccionesAdmin,
): ResultadoValidacionMercado {
  const jugadorId = filtros.jugadorId?.trim() ?? '';
  const usuarioId = filtros.usuarioId?.trim() ?? '';
  const desde = filtros.desde?.trim() ?? '';
  const hasta = filtros.hasta?.trim() ?? '';

  if (jugadorId && !UUID_V4_REGEX.test(jugadorId)) {
    return {
      esValido: false,
      error: 'El ID de Jugador debe tener formato UUID v4 válido.',
    };
  }

  if (usuarioId && !UUID_V4_REGEX.test(usuarioId)) {
    return {
      esValido: false,
      error: 'El ID de Usuario debe tener formato UUID v4 válido.',
    };
  }

  if (
    filtros.tipoMercado !== undefined &&
    filtros.tipoMercado !== 'PRIMARIO' &&
    filtros.tipoMercado !== 'SECUNDARIO'
  ) {
    return {
      esValido: false,
      error: 'El tipo de mercado seleccionado no es válido.',
    };
  }

  if (desde && hasta && desde > hasta) {
    return {
      esValido: false,
      error: "La fecha inicial 'Desde' no puede ser posterior a la fecha 'Hasta'.",
    };
  }

  if (filtros.limite !== undefined) {
    if (
      !Number.isInteger(filtros.limite) ||
      filtros.limite < 1 ||
      filtros.limite > 200
    ) {
      return {
        esValido: false,
        error: 'El límite de resultados debe ser un entero entre 1 y 200.',
      };
    }
  }

  return {
    esValido: true,
    error: null,
  };
}

export function validarCambioEstrategia(
  estrategiaId: EstrategiaId,
  estrategiaActivaId?: EstrategiaId,
): ResultadoValidacionMercado {
  if (estrategiaId !== 'GLOBAL' && estrategiaId !== 'POSICIONAL') {
    return {
      esValido: false,
      error: 'Selecciona una estrategia de valuación aprobada (Global o Posicional).',
    };
  }

  if (estrategiaActivaId && estrategiaId === estrategiaActivaId) {
    return {
      esValido: false,
      error: 'La estrategia seleccionada ya se encuentra activa en el mercado.',
    };
  }

  return {
    esValido: true,
    error: null,
  };
}
