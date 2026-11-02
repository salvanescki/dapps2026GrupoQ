import { EntityManager } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';

export const COTIZACION_REPOSITORY = 'COTIZACION_REPOSITORY';

export interface VariacionCotizacion {
  cotizacionActual: Cotizacion;
  cotizacionPrevia: Cotizacion | null;
  variacionPorcentual: number;
}

export interface ICotizacionRepository {
  guardar(
    cotizacion: Cotizacion,
    transactionalEntityManager?: EntityManager,
  ): Promise<void>;

  guardarMuchos(
    cotizaciones: Cotizacion[],
    transactionalEntityManager?: EntityManager,
  ): Promise<void>;

  obtenerUltimaCotizacion(jugadorId: string): Promise<Cotizacion | null>;

  obtenerUltimasPorJugadores(
    jugadorIds: string[],
  ): Promise<Map<string, Cotizacion>>;

  obtenerHistorial(jugadorId: string, limite?: number): Promise<Cotizacion[]>;

  obtenerVariacion(jugadorId: string): Promise<VariacionCotizacion | null>;
}
