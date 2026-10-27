import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { EstadisticaJugador } from '../domain/estadistica-jugador.entity';
import { IEstadisticaJugadorRepository } from '../domain/estadistica-jugador.repository.interface';
import { EstadisticaJugadorOrmEntity } from './estadistica-jugador.orm-entity';
import { EstadisticaJugadorMapper } from './estadistica-jugador.mapper';

@Injectable()
export class EstadisticaJugadorTypeOrmRepository
  implements IEstadisticaJugadorRepository, OnModuleInit
{
  private readonly logger = new Logger(EstadisticaJugadorTypeOrmRepository.name);

  constructor(
    @InjectRepository(EstadisticaJugadorOrmEntity)
    private readonly ormRepository: Repository<EstadisticaJugadorOrmEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ormRepository.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_estadistica_jugador_contexto
        ON estadisticas_jugadores (
          jugador_id,
          COALESCE(fuente, ''),
          COALESCE(competencia, ''),
          COALESCE(liga, ''),
          COALESCE(temporada, ''),
          COALESCE(etapa, '')
        )
      `);
    } catch (error) {
      this.logger.error(
        `No se pudo asegurar el índice único de estadísticas: ${(error as Error).message}`,
      );
    }
  }

  async guardar(
    estadistica: EstadisticaJugador,
    transactionalEntityManager?: EntityManager,
  ): Promise<EstadisticaJugador> {
    await this.guardarMuchos([estadistica], transactionalEntityManager);
    return estadistica;
  }

  async guardarMuchos(
    estadisticas: EstadisticaJugador[],
    transactionalEntityManager?: EntityManager,
  ): Promise<void> {
    if (!estadisticas || estadisticas.length === 0) return;
    const manager = transactionalEntityManager || this.ormRepository.manager;
    const ormEntities = estadisticas
      .map((e) => EstadisticaJugadorMapper.toOrm(e))
      .filter((e): e is EstadisticaJugadorOrmEntity => e !== null);

    // Deduplicar dentro del lote por la clave única para evitar el error de Postgres
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const deduplicadosPorClave = new Map<string, EstadisticaJugadorOrmEntity>();
    for (const orm of ormEntities) {
      const clave = `${orm.jugadorId}#${orm.fuente || ''}#${orm.competencia || ''}#${orm.liga || ''}#${orm.temporada || ''}#${orm.etapa || ''}`;
      const existente = deduplicadosPorClave.get(clave);
      if (!existente || (orm.minutosJugados ?? 0) >= (existente.minutosJugados ?? 0)) {
        deduplicadosPorClave.set(clave, orm);
      }
    }
    const ormFinal = Array.from(deduplicadosPorClave.values());

    const batchSize = 100;
    for (let i = 0; i < ormFinal.length; i += batchSize) {
      const batch = ormFinal.slice(i, i + batchSize);
      await manager
        .createQueryBuilder()
        .insert()
        .into(EstadisticaJugadorOrmEntity)
        .values(batch)
        .onConflict(`
          (
            jugador_id,
            COALESCE(fuente, ''),
            COALESCE(competencia, ''),
            COALESCE(liga, ''),
            COALESCE(temporada, ''),
            COALESCE(etapa, '')
          ) DO UPDATE SET
            partidos_jugados = EXCLUDED.partidos_jugados,
            minutos_jugados = EXCLUDED.minutos_jugados,
            goles = EXCLUDED.goles,
            asistencias = EXCLUDED.asistencias,
            rating = EXCLUDED.rating,
            tarjetas_amarillas = EXCLUDED.tarjetas_amarillas,
            tarjetas_rojas = EXCLUDED.tarjetas_rojas,
            precision_pase = EXCLUDED.precision_pase,
            tiros_por_partido = EXCLUDED.tiros_por_partido,
            duelos_aereos_ganados_por_partido = EXCLUDED.duelos_aereos_ganados_por_partido,
            regates_completados_por_partido = EXCLUDED.regates_completados_por_partido,
            pases_clave_por_partido = EXCLUDED.pases_clave_por_partido,
            xg_por_partido = EXCLUDED.xg_por_partido,
            xa_por_partido = EXCLUDED.xa_por_partido,
            grandes_ocasiones_por_partido = EXCLUDED.grandes_ocasiones_por_partido,
            entradas_por_partido = EXCLUDED.entradas_por_partido,
            intercepcciones_por_partido = EXCLUDED.intercepcciones_por_partido,
            despejes_por_partido = EXCLUDED.despejes_por_partido,
            pases_por_partido = EXCLUDED.pases_por_partido,
            centros_por_partido = EXCLUDED.centros_por_partido,
            atajadas = EXCLUDED.atajadas,
            goles_recibidos = EXCLUDED.goles_recibidos,
            porcentaje_atajadas = EXCLUDED.porcentaje_atajadas,
            errores_que_generaron_gol = EXCLUDED.errores_que_generaron_gol,
            autogoles = EXCLUDED.autogoles,
            fecha_actualizacion = EXCLUDED.fecha_actualizacion
        `)
        .execute();
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
