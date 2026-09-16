import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import { LoginUsuarioDto } from './dto/login-usuario.dto';
import {
  PerfilUsuarioDto,
  RespuestaAutenticacionDto,
} from './dto/respuesta-autenticacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Autenticación')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente.',
    type: RespuestaAutenticacionDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe.' })
  async registrar(
    @Body() dto: RegistroUsuarioDto,
  ): Promise<RespuestaAutenticacionDto> {
    return this.authService.registrar(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión de usuario' })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa. Retorna JWT.',
    type: RespuestaAutenticacionDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(@Body() dto: LoginUsuarioDto): Promise<RespuestaAutenticacionDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente.',
    type: PerfilUsuarioDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async me(@Req() req: any): Promise<PerfilUsuarioDto> {
    return this.authService.obtenerPerfil(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async logout(): Promise<{ mensaje: string }> {
    return { mensaje: 'Sesión cerrada exitosamente.' };
  }
}
