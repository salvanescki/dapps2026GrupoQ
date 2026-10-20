import { ReglaDeNegocioException } from '../../domain/exceptions/regla-de-negocio.exception';
import { generarId } from '../../common/utils/generar-id';

export type EstadoEjecucion = 'en_progreso' | 'exitoso' | 'fallido';

export interface ErrorScrapingDetalle {
  liga: string;
  jugadorNombre?: string;
  mensaje: string;
  timestamp: Date;
}

export interface EjecucionScrapingProps {
  id?: string;
  inicio?: Date;
  fin?: Date | null;
  jugadoresProcesados?: number;
  errores?: number;
  estado?: EstadoEjecucion;
  detalle?: ErrorScrapingDetalle[];
}

export class EjecucionScraping {
  private readonly _id: string;
  private readonly _inicio: Date;
  private _fin: Date | null;
  private _jugadoresProcesados: number;
  private _errores: number;
  private _estado: EstadoEjecucion;
  private _detalle: ErrorScrapingDetalle[];

  private constructor(props: EjecucionScrapingProps) {
    this._id = props.id || generarId();
    this._inicio = props.inicio || new Date();
    this._fin = props.fin ?? null;
    this._jugadoresProcesados = props.jugadoresProcesados ?? 0;
    this._errores = props.errores ?? 0;
    this._estado = props.estado || 'en_progreso';
    this._detalle = props.detalle ? [...props.detalle] : [];

    this.validarInvariantes();
  }

  public static iniciar(): EjecucionScraping {
    return new EjecucionScraping({
      inicio: new Date(),
      estado: 'en_progreso',
      jugadoresProcesados: 0,
      errores: 0,
      detalle: [],
    });
  }

  public static reconstituir(props: EjecucionScrapingProps): EjecucionScraping {
    return new EjecucionScraping(props);
  }

  public validarInvariantes(): void {
    if (this._jugadoresProcesados < 0) {
      throw new ReglaDeNegocioException('La cantidad de jugadores procesados no puede ser negativa.');
    }

    if (this._errores < 0) {
      throw new ReglaDeNegocioException('La cantidad de errores no puede ser negativa.');
    }

    if ((this._estado === 'exitoso' || this._estado === 'fallido') && this._fin === null) {
      throw new ReglaDeNegocioException(
        `Si el estado es '${this._estado}', la fecha de fin no debe ser null.`,
      );
    }

    if (this._fin !== null && this._fin.getTime() < this._inicio.getTime()) {
      throw new ReglaDeNegocioException('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
  }

  public incrementarJugadoresProcesados(cantidad = 1): void {
    if (this._estado !== 'en_progreso') {
      throw new ReglaDeNegocioException('Solo se pueden registrar jugadores en una ejecución en progreso.');
    }
    if (cantidad < 0) {
      throw new ReglaDeNegocioException('La cantidad no puede ser negativa.');
    }
    this._jugadoresProcesados += cantidad;
  }

  public registrarError(error: ErrorScrapingDetalle): void {
    if (this._estado !== 'en_progreso') {
      throw new ReglaDeNegocioException('Solo se pueden registrar errores en una ejecución en progreso.');
    }
    this._errores += 1;
    this._detalle.push(error);
  }

  public finalizarExitoso(fin: Date = new Date()): void {
    if (this._estado !== 'en_progreso') {
      throw new ReglaDeNegocioException(`No se puede finalizar exitosamente una ejecución con estado '${this._estado}'.`);
    }
    this._fin = fin;
    this._estado = 'exitoso';
    this.validarInvariantes();
  }

  public finalizarFallido(errorGlobal?: ErrorScrapingDetalle, fin: Date = new Date()): void {
    if (this._estado !== 'en_progreso') {
      throw new ReglaDeNegocioException(`No se puede finalizar como fallida una ejecución con estado '${this._estado}'.`);
    }
    if (errorGlobal) {
      this._errores += 1;
      this._detalle.push(errorGlobal);
    }
    this._fin = fin;
    this._estado = 'fallido';
    this.validarInvariantes();
  }

  // Getters
  public get id(): string { return this._id; }
  public get inicio(): Date { return this._inicio; }
  public get fin(): Date | null { return this._fin; }
  public get jugadoresProcesados(): number { return this._jugadoresProcesados; }
  public get errores(): number { return this._errores; }
  public get estado(): EstadoEjecucion { return this._estado; }
  public get detalle(): ErrorScrapingDetalle[] { return [...this._detalle]; }
}
