import { Transaccion } from './transaccion.entity';

export const TRANSACCION_REPOSITORY = 'TRANSACCION_REPOSITORY';

export interface ITransaccionRepository {
  guardar(transaccion: Transaccion, transactionalEntityManager?: any): Promise<void>;
  buscarPorId(id: string, transactionalEntityManager?: any): Promise<Transaccion | null>;
  listarPorUsuario(
    usuarioId: string,
    filtros?: {
      jugadorId?: string;
      tipo?: 'COMPRA' | 'VENTA';
      desde?: Date;
      hasta?: Date;
      limite?: number;
    },
  ): Promise<Transaccion[]>;
  listarAuditoriaGlobal(filtros?: {
    jugadorId?: string;
    usuarioId?: string;
    tipoMercado?: 'PRIMARIO' | 'SECUNDARIO';
    desde?: Date;
    hasta?: Date;
    limite?: number;
  }): Promise<Transaccion[]>;
}
