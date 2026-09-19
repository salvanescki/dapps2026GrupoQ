import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUsuarioDto {
  @ApiProperty({
    description: 'Correo electrónico registrado',
    example: 'juan.perez@ejemplo.com',
  })
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  correo: string;

  @ApiProperty({
    description: 'Contraseña de acceso',
    example: 'SuperClave2026',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  contrasena: string;
}
