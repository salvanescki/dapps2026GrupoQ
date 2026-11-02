import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UsuarioOrmEntity } from './usuario.orm-entity';
import { JugadorOrmEntity } from './jugador.orm-entity';

@Entity('balances_tokens')
@Unique('uq_balance_usuario_jugador', ['usuarioId', 'jugadorId'])
export class BalanceTokenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_balances_usuario_id')
  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @Index('idx_balances_jugador_id')
  @Column({ type: 'uuid', name: 'jugador_id' })
  jugadorId: string;

  @Column({ type: 'int', default: 0, name: 'cantidad_disponible' })
  cantidadDisponible: number;

  @Column({ type: 'int', default: 0, name: 'cantidad_bloqueada' })
  cantidadBloqueada: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => UsuarioOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: UsuarioOrmEntity;

  @ManyToOne(() => JugadorOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jugador_id' })
  jugador?: JugadorOrmEntity;
}
