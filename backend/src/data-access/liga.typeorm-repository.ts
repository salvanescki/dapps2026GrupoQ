import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Liga } from '../domain/liga.entity';
import { ILigaRepository } from '../domain/jugador.repository.interface';
import { LigaOrmEntity } from './liga.orm-entity';
import { LigaMapper } from './liga.mapper';

@Injectable()
export class LigaTypeOrmRepository implements ILigaRepository {
  constructor(
    @InjectRepository(LigaOrmEntity)
    private readonly ormRepository: Repository<LigaOrmEntity>,
  ) {}

  async guardar(liga: Liga): Promise<Liga> {
    const ormEntity = LigaMapper.toOrm(liga);
    const guardado = await this.ormRepository.save(ormEntity);
    return LigaMapper.toDomain(guardado);
  }

  async guardarMuchos(ligas: Liga[]): Promise<void> {
    const ormEntities = ligas.map((l) => LigaMapper.toOrm(l));
    await this.ormRepository.save(ormEntities);
  }

  async buscarPorId(id: string): Promise<Liga | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    if (!ormEntity) return null;
    return LigaMapper.toDomain(ormEntity);
  }

  async buscarPorCodigo(codigo: string): Promise<Liga | null> {
    const codigoNorm = codigo.trim().toUpperCase();
    const ormEntity = await this.ormRepository.findOne({
      where: { codigo: codigoNorm },
    });
    if (!ormEntity) return null;
    return LigaMapper.toDomain(ormEntity);
  }

  async listarTodas(): Promise<Liga[]> {
    const ormEntities = await this.ormRepository.find({
      order: { nombre: 'ASC' },
    });
    return ormEntities.map((orm) => LigaMapper.toDomain(orm));
  }
}
