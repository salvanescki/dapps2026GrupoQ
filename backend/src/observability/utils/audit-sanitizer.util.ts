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

const REGEX_ESQUEMA_URL = /^[a-zA-Z][a-zA-Z0-9+.-]{0,31}$/;

export function redactarCredencialUrlSinParser(url: string): string {
  const idxProtocolo = url.indexOf('://');
  if (idxProtocolo <= 0) {
    return url;
  }

  const esquema = url.slice(0, idxProtocolo);
  if (!REGEX_ESQUEMA_URL.test(esquema)) {
    return url;
  }

  const inicioCredencial = idxProtocolo + 3;
  const idxArroba = url.indexOf('@', inicioCredencial);
  if (idxArroba <= inicioCredencial) {
    return url;
  }

  const credencial = url.slice(inicioCredencial, idxArroba);
  if (/[\s/]/.test(credencial)) {
    return url;
  }

  return `${esquema}://${VALOR_REDACTADO}${url.slice(idxArroba)}`;
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
      sanitizada = redactarCredencialUrlSinParser(url);
    }
  }

  return sanitizada;
}

function sanitizarValorEspecial(valor: object): {
  manejado: boolean;
  resultado?: unknown;
} {
  if (valor instanceof Date) {
    return {
      manejado: true,
      resultado: Number.isNaN(valor.getTime())
        ? 'Invalid Date'
        : valor.toISOString(),
    };
  }

  if (Buffer.isBuffer(valor)) {
    return {
      manejado: true,
      resultado: `[Buffer ${valor.length} bytes]`,
    };
  }

  if (valor instanceof RegExp) {
    return {
      manejado: true,
      resultado: valor.toString(),
    };
  }

  if (valor instanceof Error) {
    return {
      manejado: true,
      resultado: {
        name: valor.name,
        message: sanitizarTexto(valor.message),
      },
    };
  }

  return { manejado: false };
}

function sanitizarArray(
  lista: unknown[],
  profundidad: number,
  visitados: WeakSet<object>,
): unknown[] {
  const limite = Math.min(lista.length, MAX_ITEMS_ARRAY);
  const resultado: unknown[] = [];

  for (let i = 0; i < limite; i++) {
    resultado.push(sanitizarValor(lista[i], profundidad + 1, visitados));
  }

  if (lista.length > MAX_ITEMS_ARRAY) {
    resultado.push(`[+${lista.length - MAX_ITEMS_ARRAY} items]`);
  }

  return resultado;
}

function sanitizarObjetoPlano(
  registro: Record<string, unknown>,
  profundidad: number,
  visitados: WeakSet<object>,
): Record<string, unknown> {
  const claves = Object.keys(registro);
  const limiteClaves = Math.min(claves.length, MAX_CLAVES_OBJETO);
  const resultado: Record<string, unknown> = {};

  for (let i = 0; i < limiteClaves; i++) {
    const clave = claves[i];
    resultado[clave] = esClaveSensible(clave)
      ? VALOR_REDACTADO
      : sanitizarValor(registro[clave], profundidad + 1, visitados);
  }

  if (claves.length > MAX_CLAVES_OBJETO) {
    resultado._truncatedKeys = claves.length - MAX_CLAVES_OBJETO;
  }

  return resultado;
}

function sanitizarEstructuraObjeto(
  objeto: object,
  profundidad: number,
  visitados: WeakSet<object>,
): unknown {
  if (visitados.has(objeto)) {
    return MARCADOR_CIRCULAR;
  }

  if (profundidad >= MAX_PROFUNDIDAD_SANITIZACION) {
    return MARCADOR_PROFUNDIDAD_MAXIMA;
  }

  visitados.add(objeto);

  try {
    if (Array.isArray(objeto)) {
      return sanitizarArray(objeto, profundidad, visitados);
    }

    return sanitizarObjetoPlano(
      objeto as Record<string, unknown>,
      profundidad,
      visitados,
    );
  } finally {
    visitados.delete(objeto);
  }
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
    return valor.toString();
  }

  const objeto = valor as object;
  const especial = sanitizarValorEspecial(objeto);
  if (especial.manejado) {
    return especial.resultado;
  }

  return sanitizarEstructuraObjeto(objeto, profundidad, visitados);
}

export function convertirValorATextoSeguro(valor: unknown): string {
  if (typeof valor === 'string') {
    return valor;
  }

  if (
    typeof valor === 'number' ||
    typeof valor === 'boolean' ||
    typeof valor === 'bigint'
  ) {
    return `${valor}`;
  }

  if (valor === null) {
    return 'null';
  }

  if (valor === undefined) {
    return 'undefined';
  }

  if (typeof valor === 'symbol' || typeof valor === 'function') {
    return valor.toString();
  }

  try {
    const serializado = JSON.stringify(sanitizarValor(valor));
    return serializado ?? '[Objeto no serializable]';
  } catch {
    return '[Objeto no serializable]';
  }
}

export function convertirCampoEscalarATexto(valor: unknown): string | null {
  if (typeof valor === 'string') {
    return valor;
  }

  if (
    typeof valor === 'number' ||
    typeof valor === 'boolean' ||
    typeof valor === 'bigint'
  ) {
    return `${valor}`;
  }

  return null;
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
