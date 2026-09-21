import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EquipoOrmEntity } from './equipo.orm-entity';
import { JugadorOrmEntity } from './jugador.orm-entity';

@Entity('ligas')
export class LigaOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_ligas_codigo', { unique: true })
  @Column({ type: 'varchar', length: 10, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  pais: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'emblema_url' })
  emblemaUrl: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => EquipoOrmEntity, (equipo) => equipo.liga)
  equipos: EquipoOrmEntity[];

  @OneToMany(() => JugadorOrmEntity, (jugador) => jugador.liga)
  jugadores: JugadorOrmEntity[];

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
