// ============================================================
// Tipos e interfaces de dominio para autenticación y sesión
// Alineados con el contrato OpenAPI auth-api-contract.yaml
// ============================================================

/**
 * Credenciales de inicio de sesión enviadas al endpoint POST /api/auth/login.
 */
export interface CredencialesLogin {
  correo: string;
  contrasena: string;
}

/**
 * Perfil del usuario autenticado devuelto por el backend.
 */
export interface PerfilUsuario {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  creadoEn: string;
}

/**
 * Respuesta exitosa del endpoint POST /api/auth/login (HTTP 200).
 */
export interface RespuestaAutenticacion {
  tokenDeAcceso: string;
  tipo: string;
  usuario: PerfilUsuario;
}

/**
 * Estado reactivo global del contexto de autenticación.
 */
export interface EstadoAutenticacion {
  estaAutenticado: boolean;
  cargando: boolean;
  usuario: PerfilUsuario | null;
  tokenDeAcceso: string | null;
  error: string | null;
}

/**
 * Estructura persistida en localStorage para la sesión del usuario.
 */
export interface SesionAlmacenada {
  tokenDeAcceso: string;
  usuario: PerfilUsuario;
  guardadoEn: number;
}

/**
 * Respuesta de error estándar del HttpExceptionFilter del backend (HTTP 401).
 */
export interface ErrorHttpRespuesta {
  codigoEstado: number;
  mensaje: string | string[];
  marcaDeTiempo: string;
}

/**
 * Resultado de validación local del formulario.
 */
export interface ResultadoValidacion {
  esValido: boolean;
  errores: {
    correo?: string;
    contrasena?: string;
  };
}

/**
 * Acciones disponibles en el contexto de autenticación.
 */
export interface AccionesAutenticacion {
  login: (credenciales: CredencialesLogin) => Promise<void>;
  logout: () => void;
  limpiarError: () => void;
}

/**
 * Tipo completo del contexto de autenticación (estado + acciones).
 */
export type ContextoAutenticacion = EstadoAutenticacion & AccionesAutenticacion;

// ============================================================
// Tipos e interfaces de dominio para registro de usuario
// Alineados con el contrato OpenAPI auth-register-contract.yaml
// ============================================================

/**
 * Datos capturados por el formulario de registro.
 */
export interface DatosRegistro {
  nombre: string;
  correo: string;
  contrasena: string;
  confirmarContrasena: string;
}

/**
 * Payload JSON enviado al endpoint POST /api/auth/register.
 * Excluye confirmarContrasena ya que no se transmite al backend.
 */
export interface SolicitudRegistroApi {
  nombre: string;
  correo: string;
  contrasena: string;
}

/**
 * Respuesta exitosa del endpoint POST /api/auth/register (HTTP 201).
 */
export interface RespuestaRegistro {
  tokenDeAcceso: string;
  tipo: string;
  usuario: PerfilUsuario;
}

/**
 * Errores de validación local campo por campo del formulario de registro.
 */
export interface ErroresValidacionRegistro {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  confirmarContrasena?: string;
}

/**
 * Resultado de la validación completa del formulario de registro.
 */
export interface ResultadoValidacionRegistro {
  esValido: boolean;
  errores: ErroresValidacionRegistro;
}

/**
 * Estado reactivo interno del componente RegisterView.
 */
export interface EstadoFormularioRegistro {
  cargando: boolean;
  errorServidor: string | null;
  erroresValidacion: ErroresValidacionRegistro;
}

/**
 * Información de navegación transmitida a LoginView tras registro exitoso.
 */
export interface EstadoNavegacionLogin {
  mensajeExito?: string;
}
