import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EquipoOrmEntity } from './equipo.orm-entity';
import { LigaOrmEntity } from './liga.orm-entity';

@Entity('jugadores')
export class JugadorOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_jugadores_external_id', { unique: true })
  @Column({ type: 'integer', unique: true, name: 'external_id' })
  externalId: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Index('idx_jugadores_posicion')
  @Column({ type: 'varchar', length: 50 })
  posicion: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'posicion_original',
  })
  posicionOriginal: string | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_nacimiento' })
  fechaNacimiento: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nacionalidad: string | null;

  @Column({ type: 'integer', nullable: true })
  dorsal: number | null;

  @Index('idx_jugadores_equipo_id')
  @Column({ type: 'uuid', name: 'equipo_id' })
  equipoId: string;

  @ManyToOne(() => EquipoOrmEntity, (equipo) => equipo.jugadores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipo_id' })
  equipo: EquipoOrmEntity;

  @Index('idx_jugadores_liga_id')
  @Column({ type: 'uuid', name: 'liga_id' })
  ligaId: string;

  @ManyToOne(() => LigaOrmEntity, (liga) => liga.jugadores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'liga_id' })
  liga: LigaOrmEntity;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
