import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolUsuario } from '../../domain/usuario.entity';
import {
  UsuarioRepository,
  USUARIO_REPOSITORY,
} from '../../domain/usuario.repository.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }

    const usuarioDb = await this.usuarioRepository.buscarPorId(user.id);
    if (!usuarioDb || !usuarioDb.activo) {
      throw new UnauthorizedException('Cuenta inexistente o inactiva.');
    }

    const tieneRol = requiredRoles.includes(usuarioDb.rol);
    if (!tieneRol) {
      throw new ForbiddenException(
        'No posee los permisos necesarios para realizar esta acción.',
      );
    }

    // Adjuntar usuario actualizado de la base de datos a request.user
    request.user = usuarioDb;

    return true;
  }
}
