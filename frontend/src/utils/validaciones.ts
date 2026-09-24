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

// ============================================================
// Funciones de validación y sanitización para registro de usuario
// Restricciones alineadas con las reglas de dominio del backend
// ============================================================

import type {
  DatosRegistro,
  SolicitudRegistroApi,
  ErroresValidacionRegistro,
  ResultadoValidacionRegistro,
} from '../types/auth.types';

/**
 * Valida el nombre del usuario.
 * Regla: no vacío tras trim(), entre 2 y 100 caracteres.
 */
export function validarNombre(nombre: string): string | undefined {
  const trimmed = nombre.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
    return 'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.';
  }
  return undefined;
}

/**
 * Valida el formato de la contraseña para registro.
 * Regla: no vacía, mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número.
 */
export function validarFormatoContrasena(contrasena: string): string | undefined {
  if (!contrasena) {
    return 'La contraseña es obligatoria.';
  }
  if (
    contrasena.length < 8 ||
    !/[A-Z]/.test(contrasena) ||
    !/[a-z]/.test(contrasena) ||
    !/[0-9]/.test(contrasena)
  ) {
    return 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.';
  }
  return undefined;
}

/**
 * Valida que la confirmación de contraseña coincida con la contraseña.
 */
export function validarConfirmacionContrasena(
  contrasena: string,
  confirmarContrasena: string
): string | undefined {
  if (!confirmarContrasena) {
    return 'La confirmación de la contraseña es obligatoria.';
  }
  if (contrasena !== confirmarContrasena) {
    return 'Las contraseñas no coinciden.';
  }
  return undefined;
}

/**
 * Valida el formulario de registro completo.
 * Retorna un objeto con esValido y errores por campo.
 */
export function validarFormularioRegistro(datos: DatosRegistro): ResultadoValidacionRegistro {
  const errores: ErroresValidacionRegistro = {};

  const errorNombre = validarNombre(datos.nombre);
  if (errorNombre) {
    errores.nombre = errorNombre;
  }

  const errorCorreo = validarCorreo(datos.correo);
  if (errorCorreo) {
    errores.correo = errorCorreo;
  }

  const errorContrasena = validarFormatoContrasena(datos.contrasena);
  if (errorContrasena) {
    errores.contrasena = errorContrasena;
  }

  const errorConfirmacion = validarConfirmacionContrasena(datos.contrasena, datos.confirmarContrasena);
  if (errorConfirmacion) {
    errores.confirmarContrasena = errorConfirmacion;
  }

  return {
    esValido: Object.keys(errores).length === 0,
    errores,
  };
}

/**
 * Sanitiza los datos de registro antes del envío al backend.
 * Aplica trim() al nombre, trim().toLowerCase() al correo,
 * y preserva la contraseña tal cual para mantener la entropía del usuario.
 */
export function sanitizarDatosRegistro(datos: DatosRegistro): SolicitudRegistroApi {
  return {
    nombre: datos.nombre.trim(),
    correo: datos.correo.trim().toLowerCase(),
    contrasena: datos.contrasena,
  };
}
