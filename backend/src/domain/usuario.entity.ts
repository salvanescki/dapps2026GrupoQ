import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';

export interface UsuarioProps {
  id?: string;
  nombre: string;
  correo: string;
  contrasenaHash: string;
  activo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class Usuario {
  private _id: string;
  private _nombre: string;
  private _correo: string;
  private _contrasenaHash: string;
  private _activo: boolean;
  private _creadoEn: Date;
  private _actualizadoEn: Date;

  private constructor(props: UsuarioProps) {
    this._id = props.id || this.generarId();
    this._nombre = props.nombre?.trim();
    this._correo = Usuario.normalizarCorreo(props.correo);
    this._contrasenaHash = props.contrasenaHash;
    this._activo = props.activo !== undefined ? props.activo : true;
    this._creadoEn = props.creadoEn || new Date();
    this._actualizadoEn = props.actualizadoEn || new Date();

    this.validarInvariantes();
  }

  public static crear(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }

  public static normalizarCorreo(correo: string): string {
    if (!correo) return '';
    return correo.trim().toLowerCase();
  }

  public static validarFormatoContrasena(contrasenaPlana: string): void {
    if (!contrasenaPlana || typeof contrasenaPlana !== 'string') {
      throw new ReglaDeNegocioException('La contraseña es requerida.');
    }
    if (contrasenaPlana.length < 8) {
      throw new ReglaDeNegocioException(
        'La contraseña debe tener una longitud mínima de 8 caracteres.',
      );
    }
    const tieneMayuscula = /[A-Z]/.test(contrasenaPlana);
    const tieneMinuscula = /[a-z]/.test(contrasenaPlana);
    const tieneNumero = /[0-9]/.test(contrasenaPlana);

    if (!tieneMayuscula || !tieneMinuscula || !tieneNumero) {
      throw new ReglaDeNegocioException(
        'La contraseña debe contener al menos una letra mayúscula, una letra minúscula y un número.',
      );
    }
  }

  public validarInvariantes(): void {
    if (!this._nombre || this._nombre.length < 2 || this._nombre.length > 100) {
      throw new ReglaDeNegocioException(
        'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.',
      );
    }

    if (!this._correo) {
      throw new ReglaDeNegocioException('El correo electrónico es obligatorio.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this._correo)) {
      throw new ReglaDeNegocioException(
        'El formato del correo electrónico no es válido.',
      );
    }

    if (!this._contrasenaHash || this._contrasenaHash.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El hash de la contraseña no puede estar vacío.',
      );
    }
  }

  public async verificarContrasena(
    contrasenaPlana: string,
    comparadorHash: (plana: string, hash: string) => Promise<boolean>,
  ): Promise<boolean> {
    if (!this._activo) {
      throw new ReglaDeNegocioException('La cuenta de usuario se encuentra inactiva.');
    }
    return comparadorHash(contrasenaPlana, this._contrasenaHash);
  }

  public desactivar(): void {
    this._activo = false;
    this._actualizadoEn = new Date();
  }

  public activar(): void {
    this._activo = true;
    this._actualizadoEn = new Date();
  }

  private generarId(): string {
    // Generador simple de UUID v4 si no se provee uno
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Getters para exponer atributos inmutables del dominio
  public get id(): string {
    return this._id;
  }
  public get nombre(): string {
    return this._nombre;
  }
  public get correo(): string {
    return this._correo;
  }
  public get contrasenaHash(): string {
    return this._contrasenaHash;
  }
  public get activo(): boolean {
    return this._activo;
  }
  public get creadoEn(): Date {
    return this._creadoEn;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
