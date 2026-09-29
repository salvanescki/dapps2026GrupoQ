import type {
  CredencialesLogin,
  RespuestaAutenticacion,
  SolicitudRegistroApi,
  RespuestaRegistro,
} from '../types/auth.types';
import { httpRequest, HttpError } from './http-client';

export { HttpError };

export async function loginUsuario(
  credenciales: CredencialesLogin
): Promise<RespuestaAutenticacion> {
  return httpRequest<RespuestaAutenticacion>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciales),
  });
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
    throw error;
  }
}
