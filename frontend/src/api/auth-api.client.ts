// ============================================================
// Cliente HTTP base y cliente de API de autenticación
// Consume POST /api/auth/login según contrato OpenAPI
// ============================================================

import type {
  CredencialesLogin,
  RespuestaAutenticacion,
  ErrorHttpRespuesta,
} from '../types/auth.types';

const BASE_URL = '/api';

/**
 * Realiza una petición HTTP con fetch nativo y manejo tipado de errores.
 */
async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorData: ErrorHttpRespuesta;
    try {
      errorData = await response.json();
    } catch {
      throw new Error('Error inesperado del servidor.');
    }

    // Normalizar mensaje: puede ser string o array de strings
    const mensaje = Array.isArray(errorData.mensaje)
      ? errorData.mensaje.join(' ')
      : errorData.mensaje;

    throw new HttpError(response.status, mensaje);
  }

  return response.json();
}

/**
 * Error HTTP tipado con código de estado y mensaje amigable.
 */
export class HttpError extends Error {
  constructor(
    public readonly codigoEstado: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// ─── API de Autenticación ───

/**
 * Realiza el inicio de sesión contra POST /api/auth/login.
 */
export async function loginUsuario(
  credenciales: CredencialesLogin
): Promise<RespuestaAutenticacion> {
  try {
    return await httpRequest<RespuestaAutenticacion>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credenciales),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    // Error de red (TypeError: Failed to fetch)
    throw new HttpError(
      0,
      'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
    );
  }
}
