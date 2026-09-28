import type {
  CredencialesLogin,
  RespuestaAutenticacion,
  ErrorHttpRespuesta,
  SolicitudRegistroApi,
  RespuestaRegistro,
} from '../types/auth.types';

const BASE_URL = '/api';

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

    const mensaje = Array.isArray(errorData.mensaje)
      ? errorData.mensaje.join(' ')
      : errorData.mensaje;

    throw new HttpError(response.status, mensaje);
  }

  return response.json();
}

export class HttpError extends Error {
  constructor(
    public readonly codigoEstado: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

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
    throw new HttpError(
      0,
      'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
    );
  }
}

export async function obtenerPerfilAutenticado(
  tokenDeAcceso: string
): Promise<RespuestaAutenticacion['usuario']> {
  return httpRequest<RespuestaAutenticacion['usuario']>('/auth/me', {
    headers: {
      Authorization: `Bearer ${tokenDeAcceso}`,
    },
  });
}

export async function registrarUsuario(
  datos: SolicitudRegistroApi
): Promise<RespuestaRegistro> {
  try {
    return await httpRequest<RespuestaRegistro>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.codigoEstado === 409) {
        throw new HttpError(
          409,
          'El correo electrónico ya se encuentra registrado. Intenta iniciar sesión o utiliza otra dirección.'
        );
      }
      if (error.codigoEstado === 400) {
        throw error;
      }
      if (error.codigoEstado >= 500) {
        throw new HttpError(
          error.codigoEstado,
          'Ocurrió un error inesperado en el servidor. Por favor intenta nuevamente más tarde.'
        );
      }
      throw error;
    }
    throw new HttpError(
      0,
      'No fue posible conectar con el servidor. Verifique su conexión o intente más tarde.'
    );
  }
}
