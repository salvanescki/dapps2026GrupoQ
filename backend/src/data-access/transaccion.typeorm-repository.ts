import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, SelectQueryBuilder } from 'typeorm';
import { Transaccion } from '../domain/transaccion.entity';
import { ITransaccionRepository } from '../domain/transaccion.repository.interface';
import { TransaccionOrmEntity } from './transaccion.orm-entity';
import { TransaccionMapper } from './transaccion.mapper';

interface FiltroComunTransacciones {
  jugadorId?: string;
  desde?: Date;
  hasta?: Date;
  limite?: number;
}

@Injectable()
export class TransaccionTypeOrmRepository implements ITransaccionRepository {
  constructor(
    @InjectRepository(TransaccionOrmEntity)
    private readonly ormRepository: Repository<TransaccionOrmEntity>,
  ) {}

  public async guardar(
    transaccion: Transaccion,
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = TransaccionMapper.toOrm(transaccion);
    await manager.save(TransaccionOrmEntity, orm);
  }

  public async buscarPorId(
    id: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaccion | null> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = await manager.findOne(TransaccionOrmEntity, { where: { id } });
    return orm ? TransaccionMapper.toDomain(orm) : null;
  }

  public async listarPorUsuario(
    usuarioId: string,
    filtros?: FiltroComunTransacciones & {
      tipo?: 'COMPRA' | 'VENTA';
    },
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaccion[]> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const qb = manager.createQueryBuilder(TransaccionOrmEntity, 'tx');

    if (filtros?.tipo === 'COMPRA') {
      qb.where('tx.comprador_id = :usuarioId', { usuarioId });
    } else if (filtros?.tipo === 'VENTA') {
      qb.where('tx.vendedor_id = :usuarioId', { usuarioId });
    } else {
      qb.where('(tx.comprador_id = :usuarioId OR tx.vendedor_id = :usuarioId)', { usuarioId });
    }

    return this.aplicarFiltrosYEjecutar(qb, filtros);
  }

  public async listarAuditoriaGlobal(
    filtros?: FiltroComunTransacciones & {
      usuarioId?: string;
      tipoMercado?: 'PRIMARIO' | 'SECUNDARIO';
    },
    transactionalEntityManager?: EntityManager,
  ): Promise<Transaccion[]> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const qb = manager.createQueryBuilder(TransaccionOrmEntity, 'tx');

    if (filtros?.usuarioId) {
      qb.andWhere('(tx.comprador_id = :usuarioId OR tx.vendedor_id = :usuarioId)', {
        usuarioId: filtros.usuarioId,
      });
    }
    if (filtros?.tipoMercado) {
      qb.andWhere('tx.tipo_mercado = :tipoMercado', { tipoMercado: filtros.tipoMercado });
    }

    return this.aplicarFiltrosYEjecutar(qb, filtros);
  }

  private async aplicarFiltrosYEjecutar(
    qb: SelectQueryBuilder<TransaccionOrmEntity>,
    filtros?: FiltroComunTransacciones,
  ): Promise<Transaccion[]> {
    if (filtros?.jugadorId) {
      qb.andWhere('tx.jugador_id = :jugadorId', { jugadorId: filtros.jugadorId });
    }
    if (filtros?.desde) {
      qb.andWhere('tx.creado_en >= :desde', { desde: filtros.desde });
    }
    if (filtros?.hasta) {
      qb.andWhere('tx.creado_en <= :hasta', { hasta: filtros.hasta });
    }

    qb.orderBy('tx.creado_en', 'DESC');

    if (filtros?.limite) {
      qb.take(filtros.limite);
    }

    const orms = await qb.getMany();
    return orms.map((o) => TransaccionMapper.toDomain(o));
  }
}
