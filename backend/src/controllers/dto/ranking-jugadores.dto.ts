import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { PosicionJugador } from '../../domain/jugador.entity';

export class RankingQueryDto {
  @ApiPropertyOptional({
    description: 'Cantidad de jugadores a incluir en el ranking (top N)',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;

  @ApiPropertyOptional({
    description: 'Filtro opcional por posición táctica',
    enum: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
  })
  @IsOptional()
  @IsIn(['Portero', 'Defensa', 'Mediocampista', 'Delantero'])
  posicion?: PosicionJugador;
}

export class JugadorRankingDto {
  @ApiProperty({ example: 1 })
  posicionRanking: number;

  @ApiProperty({ format: 'uuid' })
  jugadorId: string;

  @ApiProperty({ example: 'Kylian Mbappé' })
  nombre: string;

  @ApiProperty({ example: 'Delantero' })
  posicion: string;

  @ApiProperty({ example: 'Real Madrid CF' })
  equipoNombre: string;

  @ApiProperty({ example: 0.885 })
  score: number;

  @ApiProperty({ example: 1.89 })
  cotizacionActual: number;

  @ApiProperty({
    example: 5.59,
    description:
      'Variación porcentual respecto a la cotización inmediata anterior (0 si solo tiene una cotización)',
  })
  variacionPorcentual: number;

  @ApiProperty({ enum: ['GLOBAL', 'POSICIONAL'], example: 'GLOBAL' })
  estrategiaId: string;

  @ApiProperty({ example: 'GLOBAL_v1' })
  estrategiaVersion: string;

  @ApiProperty({
    example: 45,
    description:
      'Cantidad total de tokens disponibles para comprar (primario + ofertas secundarias activas)',
  })
  tokensDisponibles: number;
}
