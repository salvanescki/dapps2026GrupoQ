import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RegistroUsuarioDto {
  @ApiProperty({
    description: 'Nombre completo o de usuario',
    minLength: 2,
    maxLength: 100,
    example: 'Juan Perez',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres.' })
  nombre: string;

  @ApiProperty({
    description: 'Correo electrónico único de acceso',
    example: 'juan.perez@ejemplo.com',
  })
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  correo: string;

  @ApiProperty({
    description: 'Contraseña segura (mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número)',
    minLength: 8,
    example: 'SuperClave2026',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  contrasena: string;
}
