import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';

export type EstrategiaId = 'GLOBAL' | 'POSICIONAL';
export type EstrategiaVersion = 'GLOBAL_v1' | 'POSICIONAL_v1';

export interface ConfiguracionMercadoProps {
  id?: number;
  estrategiaActivaId?: EstrategiaId;
  estrategiaActivaVersion?: EstrategiaVersion;
  actualizadoPor?: string | null;
  actualizadoEn?: Date;
}

export class ConfiguracionMercado {
  private readonly _id: number;
  private _estrategiaActivaId: EstrategiaId;
  private _estrategiaActivaVersion: EstrategiaVersion;
  private _actualizadoPor: string | null;
  private _actualizadoEn: Date;

  private constructor(props: ConfiguracionMercadoProps) {
    this._id = props.id ?? 1;
    this._estrategiaActivaId = props.estrategiaActivaId ?? 'GLOBAL';
    this._estrategiaActivaVersion =
      props.estrategiaActivaVersion ?? 'GLOBAL_v1';
    this._actualizadoPor = props.actualizadoPor ?? null;
    this._actualizadoEn = props.actualizadoEn ?? new Date();

    this.validarInvariantes();
  }

  public static crear(props?: ConfiguracionMercadoProps): ConfiguracionMercado {
    return new ConfiguracionMercado(props ?? {});
  }

  public validarInvariantes(): void {
    if (this._id !== 1) {
      throw new ReglaDeNegocioException(
        'El identificador de configuración de mercado debe ser 1 (singleton).',
      );
    }
    if (
      this._estrategiaActivaId !== 'GLOBAL' &&
      this._estrategiaActivaId !== 'POSICIONAL'
    ) {
      throw new ReglaDeNegocioException(
        `Estrategia no válida: ${this._estrategiaActivaId}. Debe ser GLOBAL o POSICIONAL.`,
      );
    }
    if (
      this._estrategiaActivaId === 'GLOBAL' &&
      this._estrategiaActivaVersion !== 'GLOBAL_v1'
    ) {
      throw new ReglaDeNegocioException(
        'La versión para GLOBAL debe ser GLOBAL_v1.',
      );
    }
    if (
      this._estrategiaActivaId === 'POSICIONAL' &&
      this._estrategiaActivaVersion !== 'POSICIONAL_v1'
    ) {
      throw new ReglaDeNegocioException(
        'La versión para POSICIONAL debe ser POSICIONAL_v1.',
      );
    }
  }

  public cambiarEstrategia(
    estrategiaId: EstrategiaId,
    version: EstrategiaVersion,
    adminId: string,
  ): void {
    if (!adminId || adminId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del administrador que realiza el cambio es obligatorio.',
      );
    }
    this._estrategiaActivaId = estrategiaId;
    this._estrategiaActivaVersion = version;
    this._actualizadoPor = adminId;
    this._actualizadoEn = new Date();

    this.validarInvariantes();
  }

  public get id(): number {
    return this._id;
  }
  public get estrategiaActivaId(): EstrategiaId {
    return this._estrategiaActivaId;
  }
  public get estrategiaActivaVersion(): EstrategiaVersion {
    return this._estrategiaActivaVersion;
  }
  public get actualizadoPor(): string | null {
    return this._actualizadoPor;
  }
  public get actualizadoEn(): Date {
    return this._actualizadoEn;
  }
}
