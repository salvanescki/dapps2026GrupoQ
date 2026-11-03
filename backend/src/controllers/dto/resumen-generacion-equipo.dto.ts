import { ApiProperty } from '@nestjs/swagger';
import { EquipoSemanalRespuestaDto } from './equipo-semanal-respuesta.dto';

export class ResumenGeneracionEquipoDto {
  @ApiProperty({
    description: 'Mensaje de resultado descriptivo de la operación',
    example: 'Equipo de la Semana generado exitosamente.',
  })
  mensaje: string;

  @ApiProperty({
    description: 'Detalle del Equipo de la Semana generado',
    type: EquipoSemanalRespuestaDto,
  })
  equipo: EquipoSemanalRespuestaDto;
}

