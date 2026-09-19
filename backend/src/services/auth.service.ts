import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../domain/usuario.entity';
import {
  USUARIO_REPOSITORY,
  UsuarioRepository,
} from '../domain/usuario.repository.interface';
import { UsuarioDuplicadoException } from '../domain/exceptions/usuario-duplicado.exception';
import { RegistroUsuarioDto } from '../controllers/dto/registro-usuario.dto';
import { LoginUsuarioDto } from '../controllers/dto/login-usuario.dto';
import {
  PerfilUsuarioDto,
  RespuestaAutenticacionDto,
} from '../controllers/dto/respuesta-autenticacion.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
    private readonly jwtService: JwtService,
  ) {}

  async registrar(dto: RegistroUsuarioDto): Promise<RespuestaAutenticacionDto> {
    // Validación de formato de contraseña a nivel de dominio
    Usuario.validarFormatoContrasena(dto.contrasena);

    const correoNormalizado = Usuario.normalizarCorreo(dto.correo);
    const yaExiste = await this.usuarioRepository.existePorCorreo(correoNormalizado);
    if (yaExiste) {
      throw new ConflictException(
        `El correo electrónico ${correoNormalizado} ya se encuentra registrado.`,
      );
    }

    const saltRounds = 10;
    const contrasenaHash = await bcrypt.hash(dto.contrasena, saltRounds);

    const nuevoUsuario = Usuario.crear({
      nombre: dto.nombre,
      correo: correoNormalizado,
      contrasenaHash,
    });

    await this.usuarioRepository.guardar(nuevoUsuario);

    const tokenDeAcceso = this.generarToken(nuevoUsuario);

    return {
      tokenDeAcceso,
      tipo: 'Bearer',
      usuario: this.mapearPerfil(nuevoUsuario),
    };
  }

  async login(dto: LoginUsuarioDto): Promise<RespuestaAutenticacionDto> {
    const usuario = await this.usuarioRepository.buscarPorCorreo(dto.correo);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordValida = await usuario.verificarContrasena(
      dto.contrasena,
      bcrypt.compare,
    );

    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const tokenDeAcceso = this.generarToken(usuario);

    return {
      tokenDeAcceso,
      tipo: 'Bearer',
      usuario: this.mapearPerfil(usuario),
    };
  }

  async obtenerPerfil(usuarioId: string): Promise<PerfilUsuarioDto> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado o no autenticado.');
    }
    return this.mapearPerfil(usuario);
  }

  private generarToken(usuario: Usuario): string {
    const payload = {
      sub: usuario.id,
      email: usuario.correo,
    };
    return this.jwtService.sign(payload);
  }

  private mapearPerfil(usuario: Usuario): PerfilUsuarioDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      activo: usuario.activo,
      creadoEn: usuario.creadoEn,
    };
  }
}
