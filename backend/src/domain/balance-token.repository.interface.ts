import { EntityManager } from 'typeorm';
import { BalanceToken } from './balance-token.entity';

export const BALANCE_TOKEN_REPOSITORY = 'BALANCE_TOKEN_REPOSITORY';

export interface IBalanceTokenRepository {
  guardar(
    balance: BalanceToken,
    transactionalEntityManager?: EntityManager,
  ): Promise<void>;

  buscarPorUsuarioYJugador(
    usuarioId: string,
    jugadorId: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<BalanceToken | null>;

  buscarPorUsuarioYJugadorConLock(
    usuarioId: string,
    jugadorId: string,
    transactionalEntityManager: EntityManager,
  ): Promise<BalanceToken | null>;

  listarPorUsuario(usuarioId: string): Promise<BalanceToken[]>;

  obtenerSuministroTotalPorJugador(jugadorId: string): Promise<number>;
}
