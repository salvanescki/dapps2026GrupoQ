import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { LigaOrmEntity } from './liga.orm-entity';
import { JugadorOrmEntity } from './jugador.orm-entity';

@Entity('equipos')
export class EquipoOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_equipos_external_id', { unique: true })
  @Column({ type: 'integer', unique: true, name: 'external_id' })
  externalId: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'nombre_corto' })
  nombreCorto: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tla: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'escudo_url' })
  escudoUrl: string | null;

  @Index('idx_equipos_liga_id')
  @Column({ type: 'uuid', name: 'liga_id' })
  ligaId: string;

  @ManyToOne(() => LigaOrmEntity, (liga) => liga.equipos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'liga_id' })
  liga: LigaOrmEntity;

  @OneToMany(() => JugadorOrmEntity, (jugador) => jugador.equipo)
  jugadores: JugadorOrmEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
