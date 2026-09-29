import {
  loginUsuario,
  registrarUsuario,
  obtenerPerfilAutenticado,
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
  static async login(credenciales: CredencialesLogin): Promise<RespuestaAutenticacion> {
    return loginUsuario(credenciales);
  }

  static async register(datos: SolicitudRegistroApi): Promise<RespuestaRegistro> {
    return registrarUsuario(datos);
  }

  static async getMe(token: string): Promise<PerfilUsuario> {
    return obtenerPerfilAutenticado(token);
  }

  static logout(): void {
    StorageService.eliminarSesion();
  }
}

export { HttpError } from '../api/auth-api.client';
