import { ApiProperty } from '@nestjs/swagger';

export class ResumenRecalculoDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del resultado de la operación',
    example: 'Recálculo de cotizaciones finalizado exitosamente.',
  })
  mensaje: string;

  @ApiProperty({
    description: 'Total de jugadores procesados durante la ejecución',
    example: 2450,
  })
  totalJugadoresProcesados: number;

  @ApiProperty({
    description: 'Cantidad de cotizaciones calculadas y persistidas con éxito',
    example: 2450,
  })
  exitosos: number;

  @ApiProperty({
    description: 'Cantidad de jugadores que presentaron fallos durante el cálculo o persistencia',
    example: 0,
  })
  fallidos: number;

  @ApiProperty({
    description: 'Cantidad de cotizaciones que recurrieron a métricas neutrales por ausencia de estadísticas',
    example: 120,
  })
  sinEstadisticas: number;

  @ApiProperty({
    description: 'Identificador de la estrategia aplicada',
    enum: ['GLOBAL', 'POSICIONAL'],
    example: 'POSICIONAL',
  })
  estrategiaAplicada: string;

  @ApiProperty({
    description: 'Versión del algoritmo de la estrategia aplicada',
    example: 'POSICIONAL_v1',
  })
  versionEstrategia: string;

  @ApiProperty({
    description: 'Tiempo total de ejecución en milisegundos',
    example: 1250,
  })
  duracionMs: number;
}
