import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
} from 'typeorm';
import { EstadoEjecucion, ErrorScrapingDetalle } from '../domain/ejecucion-scraping.entity';

@Entity('ejecuciones_scraping')
export class EjecucionScrapingOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_ejecuciones_inicio')
  @Column({ type: 'timestamptz' })
  inicio: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fin: Date | null;

  @Column({ type: 'integer', default: 0, name: 'jugadores_procesados' })
  jugadoresProcesados: number;

  @Column({ type: 'integer', default: 0 })
  errores: number;

  @Index('idx_ejecuciones_estado')
  @Column({ type: 'varchar', length: 20, default: 'en_progreso' })
  estado: EstadoEjecucion;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  detalle: ErrorScrapingDetalle[];
}
