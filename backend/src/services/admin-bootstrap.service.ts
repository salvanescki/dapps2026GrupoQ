import {
  Injectable,
  OnApplicationBootstrap,
  Inject,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  UsuarioRepository,
  USUARIO_REPOSITORY,
} from '../domain/usuario.repository.interface';
import { Usuario } from '../domain/usuario.entity';
import { TokensService } from './tokens.service';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
    private readonly tokensService: TokensService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminCorreo = process.env.ADMIN_CORREO;
    const adminContrasena = process.env.ADMIN_CONTRASENA;
    const adminNombre =
      process.env.ADMIN_NOMBRE || 'Administrador Marketplace';

    if (!adminCorreo || !adminContrasena) {
      this.logger.warn(
        'Variables de entorno ADMIN_CORREO y/o ADMIN_CONTRASENA no definidas. Omitiendo aprovisionamiento de superusuario ADMIN.',
      );
      return;
    }

    try {
      const correoNormalizado = Usuario.normalizarCorreo(adminCorreo);
      let admin = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);

      if (admin) {
        if (!admin.esAdmin()) {
          this.logger.log(
            `Promoviendo usuario existente ${correoNormalizado} a superusuario ADMIN...`,
          );
          admin.promoverAAdmin();
          await this.usuarioRepository.guardar(admin);
        } else {
          this.logger.log(
            `Superusuario ADMIN ${correoNormalizado} ya se encuentra aprovisionado.`,
          );
        }
      } else {
        this.logger.log(
          `Creando nuevo superusuario ADMIN con correo: ${correoNormalizado}...`,
        );
        Usuario.validarFormatoContrasena(adminContrasena);
        const saltRounds = 10;
        const contrasenaHash = await bcrypt.hash(adminContrasena, saltRounds);

        admin = Usuario.crear({
          nombre: adminNombre,
          correo: correoNormalizado,
          contrasenaHash,
          rol: 'ADMIN',
          saldo: 100000.0,
        });

        await this.usuarioRepository.guardar(admin);
      }

      // Una vez aprovisionado el ADMIN, asegurar la emisión de tokens faltantes
      await this.tokensService.emitirFaltantes();
    } catch (error) {
      this.logger.error(
        `Error durante el aprovisionamiento del superusuario ADMIN: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
