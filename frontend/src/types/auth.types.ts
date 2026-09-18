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
