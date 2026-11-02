import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('transacciones')
export class TransaccionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_transacciones_orden_id')
  @Column({ type: 'uuid', name: 'orden_id' })
  ordenId: string;

  @Index('idx_transacciones_jugador_id')
  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @Index('idx_transacciones_comprador_id')
  @Column({ type: 'uuid', name: 'comprador_id' })
  compradorId: string;

  @Index('idx_transacciones_vendedor_id')
  @Column({ type: 'uuid', name: 'vendedor_id' })
  vendedorId: string;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'precio_unitario' })
  precioUnitario: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'monto_total' })
  montoTotal: string;

  @Column({ type: 'varchar', length: 20, name: 'tipo_mercado' })
  tipoMercado: string;

  @Column({ type: 'varchar', length: 50, name: 'estrategia_cotizacion' })
  estrategiaCotizacion: string;

  @Index('idx_transacciones_creado_en')
  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;
}
