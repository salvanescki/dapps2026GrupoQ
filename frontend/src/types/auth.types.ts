export interface CredencialesLogin {
  correo: string;
  contrasena: string;
}

export interface PerfilUsuario {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  creadoEn: string;
}

export interface RespuestaAutenticacion {
  tokenDeAcceso: string;
  tipo: string;
  usuario: PerfilUsuario;
}

export interface EstadoAutenticacion {
  estaAutenticado: boolean;
  cargando: boolean;
  usuario: PerfilUsuario | null;
  tokenDeAcceso: string | null;
  error: string | null;
}

export interface SesionAlmacenada {
  tokenDeAcceso: string;
  usuario: PerfilUsuario;
  guardadoEn: number;
}

export interface ErrorHttpRespuesta {
  codigoEstado: number;
  mensaje: string | string[];
  marcaDeTiempo: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  errores: {
    correo?: string;
    contrasena?: string;
  };
}

export interface AccionesAutenticacion {
  login: (credenciales: CredencialesLogin) => Promise<void>;
  logout: () => void;
  limpiarError: () => void;
}

export type ContextoAutenticacion = EstadoAutenticacion & AccionesAutenticacion;

export interface DatosRegistro {
  nombre: string;
  correo: string;
  contrasena: string;
  confirmarContrasena: string;
}

export interface SolicitudRegistroApi {
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface RespuestaRegistro {
  tokenDeAcceso: string;
  tipo: string;
  usuario: PerfilUsuario;
}

export interface ErroresValidacionRegistro {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  confirmarContrasena?: string;
}

export interface ResultadoValidacionRegistro {
  esValido: boolean;
  errores: ErroresValidacionRegistro;
}

export interface EstadoFormularioRegistro {
  cargando: boolean;
  errorServidor: string | null;
  erroresValidacion: ErroresValidacionRegistro;
}

export interface EstadoNavegacionLogin {
  mensajeExito?: string;
}
