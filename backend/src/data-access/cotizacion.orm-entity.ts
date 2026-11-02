import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JugadorOrmEntity } from './jugador.orm-entity';

@Entity('cotizaciones')
export class CotizacionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_cotizaciones_jugador_id')
  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @Column({ type: 'numeric', precision: 6, scale: 4 })
  score: number | string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  valor: number | string;

  @Column({ type: 'varchar', length: 50, name: 'estrategia_id' })
  estrategiaId: string;

  @Column({ type: 'varchar', length: 50, name: 'estrategia_version' })
  estrategiaVersion: string;

  @Column({ type: 'boolean', default: false, name: 'sin_estadisticas' })
  sinEstadisticas: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metricas: Record<string, number> | null;

  @Index('idx_cotizaciones_fecha')
  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_cotizacion' })
  fechaCotizacion: Date;

  @ManyToOne(() => JugadorOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jugador_id' })
  jugador?: JugadorOrmEntity;
}
