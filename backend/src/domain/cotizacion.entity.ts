import { ReglaDeNegocioException } from './exceptions/regla-de-negocio.exception';
import { generarId } from '../common/utils/generar-id';
import { EstrategiaId, EstrategiaVersion } from './configuracion-mercado.entity';

export type SnapshotMetricasNormalizadas = Record<string, number>;

export interface CotizacionProps {
  id?: string;
  jugadorId: string;
  score: number;
  valor: number;
  estrategiaId?: EstrategiaId;
  estrategiaVersion?: EstrategiaVersion;
  sinEstadisticas?: boolean;
  metricas?: SnapshotMetricasNormalizadas | null;
  fechaCotizacion?: Date;
}

export class Cotizacion {
  private readonly _id: string;
  private readonly _jugadorId: string;
  private readonly _score: number;
  private readonly _valor: number;
  private readonly _estrategiaId: EstrategiaId;
  private readonly _estrategiaVersion: EstrategiaVersion;
  private readonly _sinEstadisticas: boolean;
  private readonly _metricas: SnapshotMetricasNormalizadas | null;
  private readonly _fechaCotizacion: Date;

  private constructor(props: CotizacionProps) {
    this._id = props.id || generarId();
    this._jugadorId = props.jugadorId;
    this._score = props.score;
    this._valor = props.valor;
    this._estrategiaId = props.estrategiaId ?? 'GLOBAL';
    this._estrategiaVersion = props.estrategiaVersion ?? 'GLOBAL_v1';
    this._sinEstadisticas = props.sinEstadisticas ?? false;
    this._metricas = props.metricas ?? null;
    this._fechaCotizacion = props.fechaCotizacion || new Date();

    this.validarInvariantes();
  }

  public static crearInicial(props: {
    id?: string;
    jugadorId: string;
    estrategiaId?: EstrategiaId;
    estrategiaVersion?: EstrategiaVersion;
    fechaCotizacion?: Date;
  }): Cotizacion {
    return new Cotizacion({
      id: props.id,
      jugadorId: props.jugadorId,
      score: 0.0,
      valor: 1.0,
      estrategiaId: props.estrategiaId ?? 'GLOBAL',
      estrategiaVersion: props.estrategiaVersion ?? 'GLOBAL_v1',
      sinEstadisticas: true,
      metricas: null,
      fechaCotizacion: props.fechaCotizacion,
    });
  }

  public static crearDesdeCalculo(props: CotizacionProps): Cotizacion {
    return new Cotizacion(props);
  }

  public validarInvariantes(): void {
    if (!this._jugadorId || this._jugadorId.trim().length === 0) {
      throw new ReglaDeNegocioException(
        'El identificador del jugador es obligatorio para la cotización.',
      );
    }

    if (
      typeof this._score !== 'number' ||
      isNaN(this._score) ||
      this._score < 0 ||
      this._score > 1
    ) {
      throw new ReglaDeNegocioException(
        `El score de cotización debe estar entre 0.0000 y 1.0000. Valor recibido: ${this._score}`,
      );
    }

    if (
      typeof this._valor !== 'number' ||
      isNaN(this._valor) ||
      this._valor < 1.0
    ) {
      throw new ReglaDeNegocioException(
        `El valor de cotización debe ser mayor o igual a 1.00. Valor recibido: ${this._valor}`,
      );
    }

    if (
      this._estrategiaId !== 'GLOBAL' &&
      this._estrategiaId !== 'POSICIONAL'
    ) {
      throw new ReglaDeNegocioException(
        `Estrategia de cotización inválida: ${this._estrategiaId}`,
      );
    }

    if (
      this._estrategiaId === 'GLOBAL' &&
      this._estrategiaVersion !== 'GLOBAL_v1'
    ) {
      throw new ReglaDeNegocioException(
        'La versión para GLOBAL debe ser GLOBAL_v1.',
      );
    }

    if (
      this._estrategiaId === 'POSICIONAL' &&
      this._estrategiaVersion !== 'POSICIONAL_v1'
    ) {
      throw new ReglaDeNegocioException(
        'La versión para POSICIONAL debe ser POSICIONAL_v1.',
      );
    }
  }

  public get id(): string {
    return this._id;
  }
  public get jugadorId(): string {
    return this._jugadorId;
  }
  public get score(): number {
    return this._score;
  }
  public get valor(): number {
    return this._valor;
  }
  public get estrategiaId(): EstrategiaId {
    return this._estrategiaId;
  }
  public get estrategiaVersion(): EstrategiaVersion {
    return this._estrategiaVersion;
  }
  public get sinEstadisticas(): boolean {
    return this._sinEstadisticas;
  }
  public get metricas(): SnapshotMetricasNormalizadas | null {
    return this._metricas;
  }
  public get fechaCotizacion(): Date {
    return this._fechaCotizacion;
  }
}
