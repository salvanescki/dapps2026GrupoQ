import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EjecucionScraping } from '../domain/ejecucion-scraping.entity';
import { IEjecucionScrapingRepository } from '../domain/ejecucion-scraping.repository.interface';
import { EjecucionScrapingOrmEntity } from './ejecucion-scraping.orm-entity';
import { EjecucionScrapingMapper } from './ejecucion-scraping.mapper';

@Injectable()
export class EjecucionScrapingTypeOrmRepository
  implements IEjecucionScrapingRepository
{
  constructor(
    @InjectRepository(EjecucionScrapingOrmEntity)
    private readonly ormRepository: Repository<EjecucionScrapingOrmEntity>,
  ) {}

  async guardar(ejecucion: EjecucionScraping): Promise<EjecucionScraping> {
    const ormEntity = EjecucionScrapingMapper.toOrm(ejecucion);
    if (!ormEntity) {
      throw new Error('No se pudo mapear la ejecución a entidad ORM');
    }
    const guardado = await this.ormRepository.save(ormEntity);
    return EjecucionScrapingMapper.toDomain(guardado)!;
  }

  async buscarPorId(id: string): Promise<EjecucionScraping | null> {
    const orm = await this.ormRepository.findOne({ where: { id } });
    return orm ? EjecucionScrapingMapper.toDomain(orm) : null;
  }

  async buscarUltima(): Promise<EjecucionScraping | null> {
    const orm = await this.ormRepository.findOne({
      where: {},
      order: { inicio: 'DESC' },
    });
    return orm ? EjecucionScrapingMapper.toDomain(orm) : null;
  }

  async buscarEnProgreso(): Promise<EjecucionScraping | null> {
    const orm = await this.ormRepository.findOne({
      where: { estado: 'en_progreso' },
      order: { inicio: 'DESC' },
    });
    return orm ? EjecucionScrapingMapper.toDomain(orm) : null;
  }

  async listarPaginado(
    pagina: number,
    limite: number,
  ): Promise<{ datos: EjecucionScraping[]; total: number }> {
    const skip = (Math.max(1, pagina) - 1) * Math.max(1, limite);
    const take = Math.max(1, limite);

    const [orms, total] = await this.ormRepository.findAndCount({
      order: { inicio: 'DESC' },
      skip,
      take,
    });

    const datos = orms
      .map((o) => EjecucionScrapingMapper.toDomain(o))
      .filter((e): e is EjecucionScraping => e !== null);

    return { datos, total };
  }
}
