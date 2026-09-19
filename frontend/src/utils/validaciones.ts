// ============================================================
// Funciones de validación local del formulario de login
// Mensajes en español según data-model.md
// ============================================================

import type { ResultadoValidacion, CredencialesLogin } from '../types/auth.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el formato del correo electrónico.
 */
export function validarCorreo(correo: string): string | undefined {
  const trimmed = correo.trim();
  if (!trimmed) {
    return 'El correo electrónico es obligatorio.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'El formato del correo electrónico es inválido.';
  }
  return undefined;
}

/**
 * Valida que la contraseña no esté vacía.
 */
export function validarContrasena(contrasena: string): string | undefined {
  if (!contrasena) {
    return 'La contraseña es obligatoria.';
  }
  return undefined;
}

/**
 * Valida el formulario de login completo.
 */
export function validarFormularioLogin(credenciales: CredencialesLogin): ResultadoValidacion {
  const errores: ResultadoValidacion['errores'] = {};

  const errorCorreo = validarCorreo(credenciales.correo);
  if (errorCorreo) {
    errores.correo = errorCorreo;
  }

  const errorContrasena = validarContrasena(credenciales.contrasena);
  if (errorContrasena) {
    errores.contrasena = errorContrasena;
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Sanitiza las credenciales: trim y lowercase del correo.
 */
export function sanitizarCredenciales(credenciales: CredencialesLogin): CredencialesLogin {
  return {
    correo: credenciales.correo.trim().toLowerCase(),
    contrasena: credenciales.contrasena,
  };
}
