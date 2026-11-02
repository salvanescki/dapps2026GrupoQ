import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SnapshotMetricasNormalizadasDto {
  @ApiPropertyOptional({ example: 0.85 })
  goals?: number;

  @ApiPropertyOptional({ example: 0.6 })
  assists?: number;

  @ApiPropertyOptional({ example: 0.7 })
  shots?: number;

  @ApiPropertyOptional({ example: 0.5 })
  keyPasses?: number;

  @ApiPropertyOptional({ example: 0.65 })
  dribbles?: number;

  @ApiPropertyOptional({ example: 0.4 })
  tackles?: number;

  @ApiPropertyOptional({ example: 0.35 })
  interceptions?: number;

  @ApiPropertyOptional({ example: 0.0 })
  saves?: number;

  @ApiPropertyOptional({ example: 0.0 })
  savePercentage?: number;

  @ApiPropertyOptional({ example: 0.82 })
  rating?: number;
}

export class CotizacionRespuestaDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  jugadorId: string;

  @ApiProperty({ example: 0.4521 })
  score: number;

  @ApiProperty({ example: 1.45 })
  valor: number;

  @ApiProperty({ enum: ['GLOBAL', 'POSICIONAL'], example: 'GLOBAL' })
  estrategiaId: string;

  @ApiProperty({ example: 'GLOBAL_v1' })
  estrategiaVersion: string;

  @ApiProperty({ example: false })
  sinEstadisticas: boolean;

  @ApiPropertyOptional({ type: SnapshotMetricasNormalizadasDto, nullable: true })
  metricas?: SnapshotMetricasNormalizadasDto | null;

  @ApiProperty({ format: 'date-time' })
  fechaCotizacion: Date;
}
