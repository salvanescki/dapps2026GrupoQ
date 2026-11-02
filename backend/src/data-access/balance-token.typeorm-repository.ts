import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { BalanceToken } from '../domain/balance-token.entity';
import { IBalanceTokenRepository } from '../domain/balance-token.repository.interface';
import { BalanceTokenOrmEntity } from './balance-token.orm-entity';
import { BalanceTokenMapper } from './balance-token.mapper';

@Injectable()
export class BalanceTokenTypeOrmRepository implements IBalanceTokenRepository {
  constructor(
    @InjectRepository(BalanceTokenOrmEntity)
    private readonly ormRepository: Repository<BalanceTokenOrmEntity>,
  ) {}

  async guardar(
    balance: BalanceToken,
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = BalanceTokenMapper.toOrm(balance);
    await manager.save(orm);
  }

  async buscarPorUsuarioYJugador(
    usuarioId: string,
    jugadorId: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<BalanceToken | null> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = await manager.findOne(BalanceTokenOrmEntity, {
      where: { usuarioId, jugadorId },
    });
    return orm ? BalanceTokenMapper.toDomain(orm) : null;
  }

  async buscarPorUsuarioYJugadorConLock(
    usuarioId: string,
    jugadorId: string,
    transactionalEntityManager: EntityManager,
  ): Promise<BalanceToken | null> {
    const orm = await transactionalEntityManager
      .createQueryBuilder(BalanceTokenOrmEntity, 'b')
      .setLock('pessimistic_write')
      .where('b.usuario_id = :usuarioId AND b.jugador_id = :jugadorId', {
        usuarioId,
        jugadorId,
      })
      .getOne();

    return orm ? BalanceTokenMapper.toDomain(orm) : null;
  }

  async listarPorUsuario(usuarioId: string): Promise<BalanceToken[]> {
    const orms = await this.ormRepository.find({
      where: { usuarioId },
      order: { actualizadoEn: 'DESC' },
    });
    return orms.map((o) => BalanceTokenMapper.toDomain(o));
  }

  async obtenerSuministroTotalPorJugador(jugadorId: string): Promise<number> {
    const res = await this.ormRepository
      .createQueryBuilder('b')
      .select(
        'COALESCE(SUM(b.cantidad_disponible + b.cantidad_bloqueada), 0)',
        'total',
      )
      .where('b.jugador_id = :jugadorId', { jugadorId })
      .getRawOne();

    return Number(res?.total ?? 0);
  }
}
