import { ApiProperty } from '@nestjs/swagger';

export class SemanaDisponibleDto {
  @ApiProperty({
    description: 'Año calendario ISO',
    example: 2026,
  })
  ano: number;

  @ApiProperty({
    description: 'Número de semana ISO',
    example: 44,
  })
  semanaIso: number;

  @ApiProperty({
    description: 'Fecha de generación del equipo semanal',
    example: '2026-11-02T01:00:00.000Z',
  })
  fechaGeneracion: string;
}

