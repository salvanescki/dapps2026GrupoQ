import { ApiProperty } from '@nestjs/swagger';

export class PerfilUsuarioDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Juan Perez' })
  nombre: string;

  @ApiProperty({ example: 'juan.perez@ejemplo.com' })
  correo: string;

  @ApiProperty({ example: true })
  activo: boolean;

  @ApiProperty({ example: '2026-09-16T22:30:00.000Z' })
  creadoEn: Date;
}

export class RespuestaAutenticacionDto {
  @ApiProperty({
    description: 'Token JWT para autenticación Bearer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  tokenDeAcceso: string;

  @ApiProperty({ example: 'Bearer' })
  tipo: string;

  @ApiProperty({ type: PerfilUsuarioDto })
  usuario: PerfilUsuarioDto;
}
