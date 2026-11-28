import {
  CLAVES_SENSIBLES_AUDITORIA,
  MARCADOR_CIRCULAR,
  MARCADOR_PROFUNDIDAD_MAXIMA,
  MAX_BYTES_PARAMETROS,
  MAX_CLAVES_OBJETO,
  MAX_ITEMS_ARRAY,
  MAX_LONGITUD_STRING,
  MAX_PROFUNDIDAD_SANITIZACION,
  REGEX_CREDENCIALES_URL,
  REGEX_TOKEN_BEARER,
  SUFIJO_TRUNCADO,
  VALOR_REDACTADO,
} from '../constants/audit-events.constant';
import { ParametrosHttpSanitizados } from '../types/audit-log.types';

function normalizarClave(clave: string): string {
  return clave.toLowerCase().replace(/[-_\s]/g, '');
}

const CONJUNTO_CLAVES_SENSIBLES = new Set<string>(
  CLAVES_SENSIBLES_AUDITORIA.map(normalizarClave),
);

export function esClaveSensible(clave: string): boolean {
  return CONJUNTO_CLAVES_SENSIBLES.has(normalizarClave(clave));
}

export function sanitizarTexto(texto: string, truncar = true): string {
  let sanitizado = texto
    .replace(REGEX_CREDENCIALES_URL, `$1${VALOR_REDACTADO}@`)
    .replace(REGEX_TOKEN_BEARER, `Bearer ${VALOR_REDACTADO}`);

  if (truncar && sanitizado.length > MAX_LONGITUD_STRING) {
    const limite = Math.max(0, MAX_LONGITUD_STRING - SUFIJO_TRUNCADO.length);
    sanitizado = `${sanitizado.slice(0, limite)}${SUFIJO_TRUNCADO}`;
  }

  return sanitizado;
}

export function sanitizarUrlProxy(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  let sanitizada = url.replace(REGEX_CREDENCIALES_URL, `$1${VALOR_REDACTADO}@`);

  if (sanitizada === url && url.includes('@')) {
    try {
      const parsed = new URL(url);
      if (parsed.username || parsed.password) {
        parsed.username = '';
        parsed.password = '';
        const protocolo = `${parsed.protocol}//`;
        const resto = parsed.toString().slice(protocolo.length);
        sanitizada = `${protocolo}${VALOR_REDACTADO}@${resto}`;
      }
    } catch {
      sanitizada = url.replace(
        /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^@\s/]+)@/g,
        `$1${VALOR_REDACTADO}@`,
      );
    }
  }

  return sanitizada;
}

export function sanitizarValor(
  valor: unknown,
  profundidad = 0,
  visitados: WeakSet<object> = new WeakSet<object>(),
): unknown {
  if (
    valor === null ||
    valor === undefined ||
    typeof valor === 'boolean' ||
    typeof valor === 'number'
  ) {
    return valor;
  }

  if (typeof valor === 'bigint') {
    return valor.toString();
  }

  if (typeof valor === 'string') {
    return sanitizarTexto(valor);
  }

  if (typeof valor === 'symbol' || typeof valor === 'function') {
    return String(valor);
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? 'Invalid Date'
      : valor.toISOString();
  }

  if (Buffer.isBuffer(valor)) {
    return `[Buffer ${valor.length} bytes]`;
  }

  if (valor instanceof RegExp) {
    return valor.toString();
  }

  if (valor instanceof Error) {
    return {
      name: valor.name,
      message: sanitizarTexto(valor.message),
    };
  }

  if (typeof valor === 'object') {
    const objeto = valor as object;

    if (visitados.has(objeto)) {
      return MARCADOR_CIRCULAR;
    }

    if (profundidad >= MAX_PROFUNDIDAD_SANITIZACION) {
      return MARCADOR_PROFUNDIDAD_MAXIMA;
    }

    visitados.add(objeto);

    try {
      if (Array.isArray(objeto)) {
        const limite = Math.min(objeto.length, MAX_ITEMS_ARRAY);
        const resultado: unknown[] = [];
        for (let i = 0; i < limite; i++) {
          resultado.push(sanitizarValor(objeto[i], profundidad + 1, visitados));
        }
        if (objeto.length > MAX_ITEMS_ARRAY) {
          resultado.push(`[+${objeto.length - MAX_ITEMS_ARRAY} items]`);
        }
        return resultado;
      }

      const registro = objeto as Record<string, unknown>;
      const claves = Object.keys(registro);
      const limiteClaves = Math.min(claves.length, MAX_CLAVES_OBJETO);
      const resultado: Record<string, unknown> = {};

      for (let i = 0; i < limiteClaves; i++) {
        const clave = claves[i];
        if (esClaveSensible(clave)) {
          resultado[clave] = VALOR_REDACTADO;
        } else {
          resultado[clave] = sanitizarValor(
            registro[clave],
            profundidad + 1,
            visitados,
          );
        }
      }

      if (claves.length > MAX_CLAVES_OBJETO) {
        resultado._truncatedKeys = claves.length - MAX_CLAVES_OBJETO;
      }

      return resultado;
    } finally {
      visitados.delete(objeto);
    }
  }

  return String(valor);
}

function normalizarMapaParametros(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return {};
  }
  const sanitizado = sanitizarValor(valor);
  if (
    sanitizado &&
    typeof sanitizado === 'object' &&
    !Array.isArray(sanitizado)
  ) {
    return sanitizado as Record<string, unknown>;
  }
  return {};
}

function normalizarCuerpoParametros(
  cuerpo: unknown,
): Record<string, unknown> | null {
  if (cuerpo === undefined || cuerpo === null) {
    return null;
  }

  const sanitizado = sanitizarValor(cuerpo);
  if (
    sanitizado &&
    typeof sanitizado === 'object' &&
    !Array.isArray(sanitizado)
  ) {
    return sanitizado as Record<string, unknown>;
  }

  return { valor: sanitizado };
}

export function sanitizarParametrosHttp(
  ruta?: unknown,
  consulta?: unknown,
  cuerpo?: unknown,
): ParametrosHttpSanitizados {
  const parametros: ParametrosHttpSanitizados = {
    ruta: normalizarMapaParametros(ruta),
    consulta: normalizarMapaParametros(consulta),
    cuerpo: normalizarCuerpoParametros(cuerpo),
  };

  try {
    const serializado = JSON.stringify(parametros);
    const bytesOriginales = Buffer.byteLength(serializado, 'utf8');
    if (bytesOriginales > MAX_BYTES_PARAMETROS) {
      return {
        ruta: {},
        consulta: {},
        cuerpo: {
          _truncated: true,
          bytesOriginales,
        },
      };
    }
  } catch {
    return {
      ruta: {},
      consulta: {},
      cuerpo: {
        _truncated: true,
        bytesOriginales: 0,
      },
    };
  }

  return parametros;
}
