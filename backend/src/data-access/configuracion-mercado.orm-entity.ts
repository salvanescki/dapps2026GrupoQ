import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuraciones_mercado')
export class ConfiguracionMercadoOrmEntity {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'estrategia_activa_id',
    default: 'GLOBAL',
  })
  estrategiaActivaId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'estrategia_activa_version',
    default: 'GLOBAL_v1',
  })
  estrategiaActivaVersion: string;

  @Column({
    type: 'uuid',
    name: 'actualizado_por',
    nullable: true,
  })
  actualizadoPor: string | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
