import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionMercado } from '../domain/configuracion-mercado.entity';
import { IConfiguracionMercadoRepository } from '../domain/configuracion-mercado.repository.interface';
import { ConfiguracionMercadoOrmEntity } from './configuracion-mercado.orm-entity';
import { ConfiguracionMercadoMapper } from './configuracion-mercado.mapper';

@Injectable()
export class ConfiguracionMercadoTypeOrmRepository
  implements IConfiguracionMercadoRepository
{
  constructor(
    @InjectRepository(ConfiguracionMercadoOrmEntity)
    private readonly ormRepository: Repository<ConfiguracionMercadoOrmEntity>,
  ) {}

  async obtenerConfiguracion(): Promise<ConfiguracionMercado> {
    let orm = await this.ormRepository.findOne({ where: { id: 1 } });
    if (!orm) {
      const configDefault = ConfiguracionMercado.crear();
      orm = ConfiguracionMercadoMapper.toOrm(configDefault);
      await this.ormRepository.save(orm);
    }
    return ConfiguracionMercadoMapper.toDomain(orm);
  }

  async guardar(configuracion: ConfiguracionMercado): Promise<void> {
    const orm = ConfiguracionMercadoMapper.toOrm(configuracion);
    await this.ormRepository.save(orm);
  }
}
