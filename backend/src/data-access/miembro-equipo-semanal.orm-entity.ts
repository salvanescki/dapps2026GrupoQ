import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EquipoSemanalOrmEntity } from './equipo-semanal.orm-entity';
import { JugadorOrmEntity } from './jugador.orm-entity';

@Entity('miembros_equipos_semanales')
@Index('idx_miembros_equipo_id', ['equipoSemanalId'])
@Index('idx_miembros_jugador_id', ['jugadorId'])
export class MiembroEquipoSemanalOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'equipo_semanal_id' })
  equipoSemanalId: string;

  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @Column({ type: 'varchar', length: 150, name: 'nombre' })
  nombre: string;

  @Column({ type: 'varchar', length: 150, name: 'equipo_nombre' })
  equipoNombre: string;

  @Column({ type: 'varchar', length: 30, name: 'posicion' })
  posicion: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'cotizacion' })
  cotizacion: number | string;

  @Column({ type: 'numeric', precision: 6, scale: 4, name: 'score' })
  score: number | string;

  @Column({ type: 'int', name: 'orden' })
  orden: number;

  @ManyToOne(
    () => EquipoSemanalOrmEntity,
    (equipo) => equipo.miembros,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'equipo_semanal_id' })
  equipoSemanal?: EquipoSemanalOrmEntity;

  @ManyToOne(() => JugadorOrmEntity)
  @JoinColumn({ name: 'jugador_id' })
  jugador?: JugadorOrmEntity;
}

