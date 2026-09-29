import type { ResultadoValidacion, CredencialesLogin } from '../types/auth.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

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

export function validarContrasena(contrasena: string): string | undefined {
  if (!contrasena) {
    return 'La contraseña es obligatoria.';
  }
  return undefined;
}

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

export function sanitizarCredenciales(credenciales: CredencialesLogin): CredencialesLogin {
  return {
    correo: credenciales.correo.trim().toLowerCase(),
    contrasena: credenciales.contrasena,
  };
}

import type {
  DatosRegistro,
  SolicitudRegistroApi,
  ErroresValidacionRegistro,
  ResultadoValidacionRegistro,
} from '../types/auth.types';

export function validarNombre(nombre: string): string | undefined {
  const trimmed = nombre.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
    return 'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.';
  }
  return undefined;
}

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

export function sanitizarDatosRegistro(datos: DatosRegistro): SolicitudRegistroApi {
  return {
    nombre: datos.nombre.trim(),
    correo: datos.correo.trim().toLowerCase(),
    contrasena: datos.contrasena,
  };
}
