import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipo } from '../domain/equipo.entity';
import { IEquipoRepository } from '../domain/jugador.repository.interface';
import { EquipoOrmEntity } from './equipo.orm-entity';
import { EquipoMapper } from './equipo.mapper';

@Injectable()
export class EquipoTypeOrmRepository implements IEquipoRepository {
  constructor(
    @InjectRepository(EquipoOrmEntity)
    private readonly ormRepository: Repository<EquipoOrmEntity>,
  ) {}

  async guardar(equipo: Equipo): Promise<Equipo> {
    const ormEntity = EquipoMapper.toOrm(equipo);
    const guardado = await this.ormRepository.save(ormEntity);
    return EquipoMapper.toDomain(guardado);
  }

  async guardarMuchos(equipos: Equipo[]): Promise<void> {
    const ormEntities = equipos.map((e) => EquipoMapper.toOrm(e));
    await this.ormRepository.save(ormEntities);
  }

  async buscarPorId(id: string): Promise<Equipo | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    if (!ormEntity) return null;
    return EquipoMapper.toDomain(ormEntity);
  }

  async buscarPorExternalId(externalId: number): Promise<Equipo | null> {
    const ormEntity = await this.ormRepository.findOne({
      where: { externalId },
    });
    if (!ormEntity) return null;
    return EquipoMapper.toDomain(ormEntity);
  }

  async listarTodos(): Promise<Equipo[]> {
    const ormEntities = await this.ormRepository.find({
      relations: ['liga'],
      order: { nombre: 'ASC' },
    });
    return ormEntities.map((orm) => EquipoMapper.toDomain(orm));
  }

  async listarPorLiga(ligaId: string): Promise<Equipo[]> {
    const ormEntities = await this.ormRepository.find({
      where: { ligaId },
      order: { nombre: 'ASC' },
    });
    return ormEntities.map((orm) => EquipoMapper.toDomain(orm));
  }
}
