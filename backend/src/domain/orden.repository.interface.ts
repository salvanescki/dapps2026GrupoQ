import { Orden, EstadoOrden } from './orden.entity';

export const ORDEN_REPOSITORY = 'ORDEN_REPOSITORY';

export interface IOrdenRepository {
  guardar(orden: Orden, transactionalEntityManager?: any): Promise<void>;
  buscarPorId(id: string, transactionalEntityManager?: any): Promise<Orden | null>;
  listarActivasPorJugador(jugadorId: string, transactionalEntityManager?: any): Promise<Orden[]>;
  listarOfertasSecundarias(filtros: {
    jugadorId?: string;
    vendedorId?: string;
    estado?: EstadoOrden | 'ACTIVA';
    limite?: number;
  }): Promise<Orden[]>;
  obtenerCantidadRestanteSecundarioPorJugador(jugadorId: string): Promise<number>;
}
