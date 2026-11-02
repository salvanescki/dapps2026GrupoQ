import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Orden, EstadoOrden } from '../domain/orden.entity';
import { IOrdenRepository } from '../domain/orden.repository.interface';
import { OrdenOrmEntity } from './orden.orm-entity';
import { OrdenMapper } from './orden.mapper';

@Injectable()
export class OrdenTypeOrmRepository implements IOrdenRepository {
  constructor(
    @InjectRepository(OrdenOrmEntity)
    private readonly ormRepository: Repository<OrdenOrmEntity>,
  ) {}

  public async guardar(
    orden: Orden,
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = OrdenMapper.toOrm(orden);
    await manager.save(OrdenOrmEntity, orm);
  }

  public async buscarPorId(
    id: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Orden | null> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = await manager.findOne(OrdenOrmEntity, { where: { id } });
    return orm ? OrdenMapper.toDomain(orm) : null;
  }

  public async listarActivasPorJugador(
    jugadorId: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Orden[]> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orms = await manager.find(OrdenOrmEntity, {
      where: {
        jugadorId,
        tipo: 'VENTA',
        estado: In(['PENDIENTE', 'PARCIAL']),
      },
      order: {
        precioUnitario: 'ASC',
        creadoEn: 'ASC',
      },
    });
    return orms.map((o) => OrdenMapper.toDomain(o));
  }

  public async listarOfertasSecundarias(
    filtros: {
      jugadorId?: string;
      vendedorId?: string;
      estado?: EstadoOrden | 'ACTIVA';
      limite?: number;
    },
    transactionalEntityManager?: EntityManager,
  ): Promise<Orden[]> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const qb = manager.createQueryBuilder(OrdenOrmEntity, 'orden');
    qb.where('orden.tipo = :tipo', { tipo: 'VENTA' });

    if (filtros.jugadorId) {
      qb.andWhere('orden.jugador_id = :jugadorId', { jugadorId: filtros.jugadorId });
    }
    if (filtros.vendedorId) {
      qb.andWhere('orden.usuario_id = :vendedorId', { vendedorId: filtros.vendedorId });
    }

    if (!filtros.estado || filtros.estado === 'ACTIVA') {
      qb.andWhere('orden.estado IN (:...estados)', { estados: ['PENDIENTE', 'PARCIAL'] });
    } else {
      qb.andWhere('orden.estado = :estado', { estado: filtros.estado });
    }

    qb.orderBy('orden.precio_unitario', 'ASC');
    qb.addOrderBy('orden.creado_en', 'ASC');

    if (filtros.limite) {
      qb.take(filtros.limite);
    }

    const orms = await qb.getMany();
    return orms.map((o) => OrdenMapper.toDomain(o));
  }

  public async obtenerCantidadRestanteSecundarioPorJugador(
    jugadorId: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<number> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const res = await manager.query(
      `SELECT COALESCE(SUM(cantidad_restante), 0) AS total
       FROM ordenes
       WHERE jugador_id = $1 AND tipo = 'VENTA' AND estado IN ('PENDIENTE', 'PARCIAL')`,
      [jugadorId],
    );
    return Number(res[0]?.total || 0);
  }
}
