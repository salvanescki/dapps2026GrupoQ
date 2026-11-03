import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MiembroEquipoSemanalOrmEntity } from './miembro-equipo-semanal.orm-entity';

@Entity('equipos_semanales')
@Index('idx_equipos_semanales_ano_semana', ['ano', 'semanaIso'])
export class EquipoSemanalOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'int', name: 'ano' })
  ano: number;

  @Column({ type: 'int', name: 'semana_iso' })
  semanaIso: number;

  @Column({ type: 'varchar', length: 20, default: '4-3-3', name: 'formacion' })
  formacion: string;

  @Column({ type: 'varchar', length: 50, name: 'estrategia_id' })
  estrategiaId: string;

  @Column({ type: 'varchar', length: 50, name: 'estrategia_version' })
  estrategiaVersion: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_generacion' })
  fechaGeneracion: Date;

  @OneToMany(
    () => MiembroEquipoSemanalOrmEntity,
    (miembro) => miembro.equipoSemanal,
    { cascade: true, eager: true },
  )
  miembros: MiembroEquipoSemanalOrmEntity[];
}

