import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../domain/usuario.entity';
import { UsuarioRepository } from '../domain/usuario.repository.interface';
import { UsuarioOrmEntity } from './usuario.orm-entity';
import { UsuarioMapper } from './usuario.mapper';

@Injectable()
export class UsuarioTypeOrmRepository implements UsuarioRepository {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly ormRepository: Repository<UsuarioOrmEntity>,
  ) {}

  async guardar(usuario: Usuario): Promise<void> {
    const ormEntity = UsuarioMapper.toOrm(usuario);
    await this.ormRepository.save(ormEntity);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    if (!ormEntity) return null;
    return UsuarioMapper.toDomain(ormEntity);
  }

  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const correoNormalizado = Usuario.normalizarCorreo(correo);
    const ormEntity = await this.ormRepository.findOne({
      where: { correo: correoNormalizado },
    });
    if (!ormEntity) return null;
    return UsuarioMapper.toDomain(ormEntity);
  }

  async existePorCorreo(correo: string): Promise<boolean> {
    const correoNormalizado = Usuario.normalizarCorreo(correo);
    const count = await this.ormRepository.count({
      where: { correo: correoNormalizado },
    });
    return count > 0;
  }
}
