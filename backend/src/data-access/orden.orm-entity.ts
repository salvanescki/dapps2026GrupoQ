import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ordenes')
export class OrdenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_ordenes_usuario_id')
  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Index('idx_ordenes_jugador_id')
  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'varchar', length: 20, name: 'tipo_mercado' })
  tipoMercado: string;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({ type: 'integer', name: 'cantidad_restante' })
  cantidadRestante: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_unitario' })
  precioUnitario: string;

  @Index('idx_ordenes_estado_tipo')
  @Column({ type: 'varchar', length: 20 })
  estado: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
