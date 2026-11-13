import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { JugadorOrmEntity } from '../../data-access/jugador.orm-entity';

export type ValorDecimalNullableOrm = string | number | null;

@Entity('estadisticas_jugadores')
export class EstadisticaJugadorOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_estadisticas_jugador_id')
  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @ManyToOne(() => JugadorOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jugador_id' })
  jugador?: JugadorOrmEntity;

  @Index('idx_estadisticas_temporada')
  @Column({ type: 'varchar', length: 20 })
  temporada: string;

  @Index('idx_estadisticas_liga')
  @Column({ type: 'varchar', length: 10 })
  liga: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  competencia: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  etapa: string | null;

  @Column({ type: 'varchar', length: 50, default: 'whoscored' })
  fuente: string;

  @Column({ type: 'timestamptz', name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  @Column({ type: 'integer', default: 0, name: 'partidos_jugados' })
  partidosJugados: number;

  @Column({ type: 'integer', default: 0, name: 'minutos_jugados' })
  minutosJugados: number;

  @Column({ type: 'integer', default: 0 })
  goles: number;

  @Column({ type: 'integer', default: 0 })
  asistencias: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'tiros_por_partido',
  })
  tirosPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'precision_pase',
  })
  precisionPase: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'duelos_aereos_ganados_por_partido',
  })
  duelosAereosGanadosPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  rating: ValorDecimalNullableOrm;

  @Column({ type: 'integer', default: 0, name: 'tarjetas_amarillas' })
  tarjetasAmarillas: number;

  @Column({ type: 'integer', default: 0, name: 'tarjetas_rojas' })
  tarjetasRojas: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'regates_completados_por_partido',
  })
  regatesCompletadosPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'pases_clave_por_partido',
  })
  pasesClavePorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 3,
    nullable: true,
    name: 'xg_por_partido',
  })
  xgPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 3,
    nullable: true,
    name: 'xa_por_partido',
  })
  xaPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'grandes_ocasiones_por_partido',
  })
  grandesOcasionesPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'entradas_por_partido',
  })
  entradasPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'intercepcciones_por_partido',
  })
  intercepccionesPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'despejes_por_partido',
  })
  despejesPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'pases_por_partido',
  })
  pasesPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'centros_por_partido',
  })
  centrosPorPartido: ValorDecimalNullableOrm;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  atajadas: ValorDecimalNullableOrm;

  @Column({ type: 'integer', nullable: true, name: 'goles_recibidos' })
  golesRecibidos: number | null;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'porcentaje_atajadas',
  })
  porcentajeAtajadas: ValorDecimalNullableOrm;

  @Column({
    type: 'integer',
    nullable: true,
    name: 'errores_que_generaron_gol',
  })
  erroresQueGeneraronGol: number | null;

  @Column({ type: 'integer', nullable: true })
  autogoles: number | null;
}
