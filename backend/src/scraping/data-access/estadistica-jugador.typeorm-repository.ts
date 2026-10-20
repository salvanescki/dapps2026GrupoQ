import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadisticaJugador } from '../domain/estadistica-jugador.entity';
import { IEstadisticaJugadorRepository } from '../domain/estadistica-jugador.repository.interface';
import { EstadisticaJugadorOrmEntity } from './estadistica-jugador.orm-entity';
import { EstadisticaJugadorMapper } from './estadistica-jugador.mapper';

@Injectable()
export class EstadisticaJugadorTypeOrmRepository
  implements IEstadisticaJugadorRepository
{
  constructor(
    @InjectRepository(EstadisticaJugadorOrmEntity)
    private readonly ormRepository: Repository<EstadisticaJugadorOrmEntity>,
  ) {}

  async guardar(estadistica: EstadisticaJugador): Promise<EstadisticaJugador> {
    const ormEntity = EstadisticaJugadorMapper.toOrm(estadistica);
    if (!ormEntity) {
      throw new Error('No se pudo mapear la estadística a entidad ORM');
    }

    await this.ormRepository.upsert(ormEntity, {
      conflictPaths: ['jugadorId', 'temporada'],
      skipUpdateIfNoValuesChanged: false,
    });

    const guardado = await this.ormRepository.findOne({
      where: {
        jugadorId: ormEntity.jugadorId,
        temporada: ormEntity.temporada,
      },
    });

    return EstadisticaJugadorMapper.toDomain(guardado!)!;
  }

  async guardarMuchos(estadisticas: EstadisticaJugador[]): Promise<void> {
    if (!estadisticas || estadisticas.length === 0) return;
    const ormEntities = estadisticas
      .map((e) => EstadisticaJugadorMapper.toOrm(e))
      .filter((e): e is EstadisticaJugadorOrmEntity => e !== null);

    const batchSize = 100;
    for (let i = 0; i < ormEntities.length; i += batchSize) {
      const batch = ormEntities.slice(i, i + batchSize);
      await this.ormRepository.upsert(batch, {
        conflictPaths: ['jugadorId', 'temporada'],
        skipUpdateIfNoValuesChanged: false,
      });
    }
  }

  async buscarPorJugadorYTemporada(
    jugadorId: string,
    temporada: string,
  ): Promise<EstadisticaJugador | null> {
    const orm = await this.ormRepository.findOne({
      where: { jugadorId, temporada },
    });
    return orm ? EstadisticaJugadorMapper.toDomain(orm) : null;
  }

  async buscarPorJugador(jugadorId: string): Promise<EstadisticaJugador[]> {
    const orms = await this.ormRepository.find({
      where: { jugadorId },
      order: { fechaActualizacion: 'DESC' },
    });
    return orms
      .map((o) => EstadisticaJugadorMapper.toDomain(o))
      .filter((e): e is EstadisticaJugador => e !== null);
  }
}
