import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EquipoSemanal } from '../domain/equipo-semanal.entity';
import {
  IEquipoSemanalRepository,
  SemanaDisponibleResumen,
} from '../domain/equipo-semanal.repository.interface';
import { EquipoSemanalOrmEntity } from './equipo-semanal.orm-entity';
import { MiembroEquipoSemanalOrmEntity } from './miembro-equipo-semanal.orm-entity';
import { EquipoSemanalMapper } from './equipo-semanal.mapper';

@Injectable()
export class EquipoSemanalTypeOrmRepository implements IEquipoSemanalRepository {
  private readonly equipoRepo: Repository<EquipoSemanalOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.equipoRepo = this.dataSource.getRepository(EquipoSemanalOrmEntity);
  }

  public async guardarOSobrescribir(equipo: EquipoSemanal): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repoEquipo = manager.getRepository(EquipoSemanalOrmEntity);
      const repoMiembro = manager.getRepository(MiembroEquipoSemanalOrmEntity);

      const existente = await repoEquipo.findOne({
        where: { ano: equipo.ano, semanaIso: equipo.semanaIso },
        loadEagerRelations: false,
      });

      if (!existente) {
        await repoEquipo.save(EquipoSemanalMapper.toOrm(equipo));
        return;
      }

      await repoMiembro.delete({ equipoSemanalId: existente.id });
      await repoEquipo.update(existente.id, {
        formacion: equipo.formacion,
        estrategiaId: equipo.estrategiaId,
        estrategiaVersion: equipo.estrategiaVersion,
        fechaGeneracion: equipo.fechaGeneracion,
      });
      await repoMiembro.save(
        equipo.miembros.map((m) =>
          EquipoSemanalMapper.miembroToOrm(m, existente.id),
        ),
      );
    });
  }

  public async obtenerVigente(): Promise<EquipoSemanal | null> {
    const orm = await this.equipoRepo.findOne({
      where: {},
      order: { ano: 'DESC', semanaIso: 'DESC' },
    });
    return orm ? EquipoSemanalMapper.toDomain(orm) : null;
  }

  public async obtenerPorSemana(
    ano: number,
    semanaIso: number,
  ): Promise<EquipoSemanal | null> {
    const orm = await this.equipoRepo.findOne({ where: { ano, semanaIso } });
    return orm ? EquipoSemanalMapper.toDomain(orm) : null;
  }

  public async listarSemanasDisponibles(): Promise<SemanaDisponibleResumen[]> {
    const raw = await this.equipoRepo
      .createQueryBuilder('equipo')
      .select([
        'equipo.ano AS ano',
        'equipo.semanaIso AS "semanaIso"',
        'equipo.fechaGeneracion AS "fechaGeneracion"',
      ])
      .orderBy('equipo.ano', 'DESC')
      .addOrderBy('equipo.semanaIso', 'DESC')
      .getRawMany();

    return raw.map((r) => ({
      ano: Number(r.ano),
      semanaIso: Number(r.semanaIso),
      fechaGeneracion: new Date(r.fechaGeneracion),
    }));
  }
}
