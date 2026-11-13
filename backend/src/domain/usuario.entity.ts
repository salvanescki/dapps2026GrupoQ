import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';
import { Dinero } from './dinero.value-object';

export type RolUsuario = 'ADMIN' | 'USUARIO';
export type MontoSaldo = number | string | Dinero;

export interface UsuarioProps {
  id?: string;
  nombre: string;
  correo: string;
  contrasenaHash: string;
  rol?: RolUsuario;
  saldo?: MontoSaldo;
  activo?: boolean;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class Usuario {
  private readonly _id: string;
  private readonly _nombre: string;
  private readonly _correo: string;
  private readonly _contrasenaHash: string;
  private _rol: RolUsuario;
  private _saldo: Dinero;
  private _activo: boolean;
  private readonly _creadoEn: Date;
  private _actualizadoEn: Date;

  private constructor(props: UsuarioProps) {
    this._id = props.id || generarId();
    this._nombre = props.nombre?.trim();
    this._correo = Usuario.normalizarCorreo(props.correo);
    this._contrasenaHash = props.contrasenaHash;
    this._rol = props.rol ?? 'USUARIO';

    if (props.saldo instanceof Dinero) {
      this._saldo = props.saldo;
    } else if (
      typeof props.saldo === 'number' ||
      typeof props.saldo === 'string'
    ) {
      this._saldo = Dinero.desdeMonto(props.saldo);
    } else {
      this._saldo = Dinero.desdeMonto(1000.0);
    }

    this._activo = props.activo ?? true;
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
    const tieneNumero = /\d/.test(contrasenaPlana);

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

    const emailRegex = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
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

    if (this._rol !== 'ADMIN' && this._rol !== 'USUARIO') {
      throw new ReglaDeNegocioException(
        'El rol de usuario debe ser ADMIN o USUARIO.',
      );
    }

    if (!this._saldo) {
      throw new ReglaDeNegocioException('El saldo de usuario es obligatorio.');
    }
  }

  public debitarSaldo(monto: MontoSaldo): void {
    if (!this._activo) {
      throw new ReglaDeNegocioException(
        'La cuenta de usuario se encuentra inactiva.',
      );
    }
    const montoDinero = monto instanceof Dinero ? monto : Dinero.desdeMonto(monto);
    if (montoDinero.centavos <= 0) {
      throw new ReglaDeNegocioException(
        'El monto a debitar debe ser mayor a cero.',
      );
    }
    if (!this._saldo.esMayorOIgualQue(montoDinero)) {
      throw new ReglaDeNegocioException(
        'Saldo monetario insuficiente para realizar la operación.',
      );
    }
    this._saldo = this._saldo.restar(montoDinero);
    this._actualizadoEn = new Date();
  }

  public acreditarSaldo(monto: MontoSaldo): void {
    if (!this._activo) {
      throw new ReglaDeNegocioException(
        'La cuenta de usuario se encuentra inactiva.',
      );
    }
    const montoDinero = monto instanceof Dinero ? monto : Dinero.desdeMonto(monto);
    if (montoDinero.centavos <= 0) {
      throw new ReglaDeNegocioException(
        'El monto a acreditar debe ser mayor a cero.',
      );
    }
    this._saldo = this._saldo.sumar(montoDinero);
    this._actualizadoEn = new Date();
  }

  public promoverAAdmin(): void {
    this._rol = 'ADMIN';
    this._actualizadoEn = new Date();
  }

  public esAdmin(): boolean {
    return this._rol === 'ADMIN';
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
  public get rol(): RolUsuario {
    return this._rol;
  }
  public get saldo(): Dinero {
    return this._saldo;
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
