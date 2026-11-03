import { ApiProperty } from '@nestjs/swagger';

export class MiembroEquipoSemanalDto {
  @ApiProperty({
    description: 'Identificador único del jugador',
    example: 'd9b2d63d-a232-47ec-b6e8-289b4a8e3100',
  })
  jugadorId: string;

  @ApiProperty({
    description: 'Nombre completo del jugador',
    example: 'Lionel Messi',
  })
  nombre: string;

  @ApiProperty({
    description: 'Nombre del equipo o club al que pertenece',
    example: 'Inter Miami',
  })
  equipoNombre: string;

  @ApiProperty({
    description: 'Demarcación táctica en la cancha',
    enum: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
    example: 'Delantero',
  })
  posicion: 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero';

  @ApiProperty({
    description: 'Cotización oficial vigente en créditos al momento del cálculo',
    example: 45.5,
  })
  cotizacion: number;

  @ApiProperty({
    description: 'Score de rendimiento normalizado en [0.0000, 1.0000]',
    example: 0.985,
  })
  score: number;

  @ApiProperty({
    description: 'Orden táctico en el esquema de cancha (1 a 11)',
    example: 10,
  })
  orden: number;
}

export class EquipoSemanalRespuestaDto {
  @ApiProperty({
    description: 'Identificador único del equipo semanal',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Año calendario ISO correspondiente',
    example: 2026,
  })
  ano: number;

  @ApiProperty({
    description: 'Número de semana ISO (1 a 53)',
    example: 44,
  })
  semanaIso: number;

  @ApiProperty({
    description: 'Esquema táctico de la formación',
    example: '4-3-3',
  })
  formacion: string;

  @ApiProperty({
    description: 'Estrategia de cotización aplicada',
    example: 'GLOBAL',
  })
  estrategiaId: string;

  @ApiProperty({
    description: 'Versión de la estrategia de cotización',
    example: 'GLOBAL_v1',
  })
  estrategiaVersion: string;

  @ApiProperty({
    description: 'Marca temporal UTC de generación y publicación',
    example: '2026-11-02T01:00:00.000Z',
  })
  fechaGeneracion: string;

  @ApiProperty({
    description: 'Listado oficial de los 11 jugadores del once ideal',
    type: [MiembroEquipoSemanalDto],
  })
  miembros: MiembroEquipoSemanalDto[];
}

