import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Cotizacion } from '../domain/cotizacion.entity';
import {
  ICotizacionRepository,
  VariacionCotizacion,
} from '../domain/cotizacion.repository.interface';
import { CotizacionOrmEntity } from './cotizacion.orm-entity';
import { CotizacionMapper } from './cotizacion.mapper';

@Injectable()
export class CotizacionTypeOrmRepository implements ICotizacionRepository {
  constructor(
    @InjectRepository(CotizacionOrmEntity)
    private readonly ormRepository: Repository<CotizacionOrmEntity>,
  ) {}

  async guardar(
    cotizacion: Cotizacion,
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const orm = CotizacionMapper.toOrm(cotizacion);
    await manager.save(orm);
  }

  async guardarMuchos(
    cotizaciones: Cotizacion[],
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    if (!cotizaciones || cotizaciones.length === 0) return;
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const ormEntities = cotizaciones.map((c) => CotizacionMapper.toOrm(c));

    const batchSize = 200;
    const lotes: CotizacionOrmEntity[][] = [];
    for (let i = 0; i < ormEntities.length; i += batchSize) {
      lotes.push(ormEntities.slice(i, i + batchSize));
    }

    await lotes.reduce<Promise<void>>(async (prev, batch) => {
      await prev;
      await manager
        .createQueryBuilder()
        .insert()
        .into(CotizacionOrmEntity)
        .values(batch)
        .execute();
    }, Promise.resolve());
  }

  async obtenerUltimaCotizacion(jugadorId: string): Promise<Cotizacion | null> {
    const orm = await this.ormRepository.findOne({
      where: { jugadorId },
      order: { fechaCotizacion: 'DESC' },
    });
    return orm ? CotizacionMapper.toDomain(orm) : null;
  }

  async obtenerUltimasPorJugadores(
    jugadorIds: string[],
  ): Promise<Map<string, Cotizacion>> {
    const resultado = new Map<string, Cotizacion>();
    if (!jugadorIds || jugadorIds.length === 0) return resultado;

    const batchSize = 1000;
    const lotes: string[][] = [];
    for (let i = 0; i < jugadorIds.length; i += batchSize) {
      lotes.push(jugadorIds.slice(i, i + batchSize));
    }

    const lotesOrms = await Promise.all(
      lotes.map((slice) =>
        this.ormRepository
          .createQueryBuilder('c')
          .distinctOn(['c.jugador_id'])
          .where('c.jugador_id IN (:...ids)', { ids: slice })
          .orderBy('c.jugador_id')
          .addOrderBy('c.fecha_cotizacion', 'DESC')
          .getMany(),
      ),
    );

    for (const orm of lotesOrms.flat()) {
      resultado.set(orm.jugadorId, CotizacionMapper.toDomain(orm));
    }

    return resultado;
  }

  async obtenerHistorial(
    jugadorId: string,
    limite: number = 50,
  ): Promise<Cotizacion[]> {
    const orms = await this.ormRepository.find({
      where: { jugadorId },
      order: { fechaCotizacion: 'DESC' },
      take: Math.min(Math.max(limite, 1), 100),
    });
    return orms.map((o) => CotizacionMapper.toDomain(o));
  }

  async obtenerVariacion(jugadorId: string): Promise<VariacionCotizacion | null> {
    const ultimas = await this.ormRepository.find({
      where: { jugadorId },
      order: { fechaCotizacion: 'DESC' },
      take: 2,
    });

    if (ultimas.length === 0) return null;

    const cotizacionActual = CotizacionMapper.toDomain(ultimas[0]);
    if (ultimas.length === 1) {
      return {
        cotizacionActual,
        cotizacionPrevia: null,
        variacionPorcentual: 0.0,
      };
    }

    const cotizacionPrevia = CotizacionMapper.toDomain(ultimas[1]);
    const valorActual = cotizacionActual.valor;
    const valorPrevio = cotizacionPrevia.valor;
    const diff = valorActual - valorPrevio;
    const variacion = valorPrevio > 0 ? (diff / valorPrevio) * 100 : 0;
    const variacionPorcentual = Math.round((variacion + Number.EPSILON) * 100) / 100;

    return {
      cotizacionActual,
      cotizacionPrevia,
      variacionPorcentual,
    };
  }
}
