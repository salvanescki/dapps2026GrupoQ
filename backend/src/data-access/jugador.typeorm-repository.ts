import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Jugador, CriterioFiltroJugador } from '../domain/jugador.entity';
import {
  IJugadorRepository,
  ResultadoBusquedaJugadores,
} from '../domain/jugador.repository.interface';
import { JugadorOrmEntity } from './jugador.orm-entity';
import { JugadorMapper } from './jugador.mapper';

@Injectable()
export class JugadorTypeOrmRepository implements IJugadorRepository {
  constructor(
    @InjectRepository(JugadorOrmEntity)
    private readonly ormRepository: Repository<JugadorOrmEntity>,
  ) {}

  async guardar(jugador: Jugador): Promise<Jugador> {
    const ormEntity = JugadorMapper.toOrm(jugador);
    const guardado = await this.ormRepository.save(ormEntity);
    return JugadorMapper.toDomain(guardado);
  }

  async guardarMuchos(jugadores: Jugador[]): Promise<void> {
    const ormEntities = jugadores.map((j) => JugadorMapper.toOrm(j));
    // Guardar por lotes de 100 para optimizar rendimiento de inserción masiva
    const batchSize = 100;
    for (let i = 0; i < ormEntities.length; i += batchSize) {
      const batch = ormEntities.slice(i, i + batchSize);
      await this.ormRepository.save(batch);
    }
  }

  async buscarPorId(id: string): Promise<Jugador | null> {
    const ormEntity = await this.ormRepository.findOne({
      where: { id },
      relations: ['equipo', 'liga'],
    });
    if (!ormEntity) return null;
    return JugadorMapper.toDomain(ormEntity);
  }

  async buscarPorExternalId(externalId: number): Promise<Jugador | null> {
    const ormEntity = await this.ormRepository.findOne({
      where: { externalId },
      relations: ['equipo', 'liga'],
    });
    if (!ormEntity) return null;
    return JugadorMapper.toDomain(ormEntity);
  }

  async buscarConFiltros(
    criterio: CriterioFiltroJugador,
  ): Promise<ResultadoBusquedaJugadores> {
    const qb = this.ormRepository
      .createQueryBuilder('jugador')
      .leftJoinAndSelect('jugador.equipo', 'equipo')
      .leftJoinAndSelect('jugador.liga', 'liga')
      .where('jugador.activo = :activo', { activo: true });

    if (criterio.ligaCodigo) {
      qb.andWhere('liga.codigo = :ligaCodigo', {
        ligaCodigo: criterio.ligaCodigo,
      });
    }

    if (criterio.equipoId) {
      qb.andWhere('jugador.equipoId = :equipoId', {
        equipoId: criterio.equipoId,
      });
    }

    if (criterio.posicion) {
      qb.andWhere('jugador.posicion = :posicion', {
        posicion: criterio.posicion,
      });
    }

    if (criterio.busqueda) {
      qb.andWhere('jugador.nombre ILIKE :busqueda', {
        busqueda: `%${criterio.busqueda}%`,
      });
    }

    qb.orderBy('jugador.nombre', 'ASC')
      .skip(criterio.offset)
      .take(criterio.limite);

    const [entities, total] = await qb.getManyAndCount();

    const items = entities.map((entity) => JugadorMapper.toDomain(entity));
    return { items, total };
  }

  async contarTotal(): Promise<number> {
    return this.ormRepository.count();
  }
}
