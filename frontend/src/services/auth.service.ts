import {
  loginUsuario,
  registrarUsuario,
  obtenerPerfilAutenticado,
  HttpError,
} from '../api/auth-api.client';
import { StorageService } from './storage.service';
import type {
  CredencialesLogin,
  SolicitudRegistroApi,
  RespuestaAutenticacion,
  RespuestaRegistro,
  PerfilUsuario,
} from '../types/auth.types';

export class AuthService {
  /**
   * Inicia sesión, mapea errores y retorna la respuesta de autenticación.
   */
  static async login(credenciales: CredencialesLogin): Promise<RespuestaAutenticacion> {
    return loginUsuario(credenciales);
  }

  /**
   * Registra un nuevo usuario en la plataforma.
   */
  static async register(datos: SolicitudRegistroApi): Promise<RespuestaRegistro> {
    return registrarUsuario(datos);
  }

  /**
   * Obtiene y valida el perfil del usuario autenticado actual.
   */
  static async getMe(token: string): Promise<PerfilUsuario> {
    return obtenerPerfilAutenticado(token);
  }

  /**
   * Cierra sesión eliminando los datos del almacenamiento local.
   */
  static logout(): void {
    StorageService.eliminarSesion();
  }
}

export { HttpError };
