import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CambiarEstrategiaDto {
  @ApiProperty({
    description: 'Identificador único de la estrategia de cotización',
    enum: ['GLOBAL', 'POSICIONAL'],
    example: 'POSICIONAL',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['GLOBAL', 'POSICIONAL'], {
    message: 'estrategiaId debe ser GLOBAL o POSICIONAL',
  })
  estrategiaId: 'GLOBAL' | 'POSICIONAL';
}

export class EstrategiaDisponibleDto {
  @ApiProperty({
    description: 'Identificador de la estrategia',
    enum: ['GLOBAL', 'POSICIONAL'],
    example: 'GLOBAL',
  })
  id: string;

  @ApiProperty({
    description: 'Versión inmutable del algoritmo de la estrategia',
    example: 'GLOBAL_v1',
  })
  version: string;

  @ApiProperty({
    description: 'Descripción sintética de la regla de ponderación de la estrategia',
    example: 'Ponderación global estándar uniforme para todas las posiciones.',
  })
  descripcion: string;
}

export class ConfiguracionEstrategiaRespuestaDto {
  @ApiProperty({
    description: 'Identificador de la estrategia actualmente activa',
    enum: ['GLOBAL', 'POSICIONAL'],
    example: 'POSICIONAL',
  })
  estrategiaActivaId: string;

  @ApiProperty({
    description: 'Versión de la estrategia actualmente activa',
    example: 'POSICIONAL_v1',
  })
  estrategiaActivaVersion: string;

  @ApiProperty({
    description: 'Fecha y hora ISO-8601 de la última actualización de configuración',
    example: '2026-11-01T20:00:00.000Z',
  })
  actualizadoEn: string;

  @ApiProperty({
    description: 'Catálogo de estrategias aprobadas disponibles en el sistema',
    type: [EstrategiaDisponibleDto],
  })
  estrategiasDisponibles: EstrategiaDisponibleDto[];
}
