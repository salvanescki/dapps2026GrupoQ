import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestcontainersHelper } from './setup-testcontainers';
import { AuthService } from '../../src/services/auth.service';
import { UsuarioOrmEntity } from '../../src/data-access/usuario.orm-entity';
import { UsuarioTypeOrmRepository } from '../../src/data-access/usuario.typeorm-repository';
import { USUARIO_REPOSITORY } from '../../src/domain/usuario.repository.interface';
import { ReglaDeNegocioException } from '../../src/domain/exceptions/regla-de-negocio.exception';

describe('AuthService (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let authService: AuthService;
  let usuarioRepository: UsuarioTypeOrmRepository;

  beforeAll(async () => {
    const started = await TestcontainersHelper.start();
    dataSource = started.dataSource;
    const ormRepo = dataSource.getRepository(UsuarioOrmEntity);
    usuarioRepository = new UsuarioTypeOrmRepository(ormRepo);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test_secret_key_grupo_q',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        {
          provide: USUARIO_REPOSITORY,
          useValue: usuarioRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  }, 90000);

  afterAll(async () => {
    await TestcontainersHelper.stop();
  });

  beforeEach(async () => {
    await TestcontainersHelper.cleanDatabase();
  });

  describe('Registro de Usuario (US1)', () => {
    it('debe registrar un usuario correctamente y emitir token JWT', async () => {
      const respuesta = await authService.registrar({
        nombre: 'Lamine Yamal',
        correo: 'lamine@barca.es',
        contrasena: 'Crack2026',
      });

      expect(respuesta.tokenDeAcceso).toBeDefined();
      expect(respuesta.tipo).toBe('Bearer');
      expect(respuesta.usuario.id).toBeDefined();
      expect(respuesta.usuario.nombre).toBe('Lamine Yamal');
      expect(respuesta.usuario.correo).toBe('lamine@barca.es');
      expect(respuesta.usuario.activo).toBe(true);

      // Verificar persistencia real en PostgreSQL
      const usuarioEnDb = await usuarioRepository.buscarPorCorreo('lamine@barca.es');
      expect(usuarioEnDb).not.toBeNull();
      expect(usuarioEnDb.contrasenaHash).not.toBe('Crack2026'); // Debe estar hasheada
    });

    it('debe rechazar registro con correo duplicado lanzando ConflictException', async () => {
      await authService.registrar({
        nombre: 'Lamine Yamal',
        correo: 'lamine@barca.es',
        contrasena: 'Crack2026',
      });

      await expect(
        authService.registrar({
          nombre: 'Lamine Clon',
          correo: 'LAMINE@BARCA.ES',
          contrasena: 'OtraClave123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe rechazar registro con contraseña que no cumpla reglas de negocio de dominio', async () => {
      await expect(
        authService.registrar({
          nombre: 'Pedri Gonzalez',
          correo: 'pedri@barca.es',
          contrasena: 'corta',
        }),
      ).rejects.toThrow(ReglaDeNegocioException);
    });
  });

  describe('Inicio de Sesión (US2)', () => {
    beforeEach(async () => {
      await authService.registrar({
        nombre: 'Vinicius Junior',
        correo: 'vini@realmadrid.com',
        contrasena: 'Dribbling2026',
      });
    });

    it('debe autenticar con credenciales correctas y devolver JWT válido', async () => {
      const respuesta = await authService.login({
        correo: 'vini@realmadrid.com',
        contrasena: 'Dribbling2026',
      });

      expect(respuesta.tokenDeAcceso).toBeDefined();
      expect(respuesta.usuario.nombre).toBe('Vinicius Junior');
    });

    it('debe rechazar login con contraseña errónea lanzando UnauthorizedException', async () => {
      await expect(
        authService.login({
          correo: 'vini@realmadrid.com',
          contrasena: 'PasswordErronea1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe rechazar login con correo inexistente lanzando UnauthorizedException', async () => {
      await expect(
        authService.login({
          correo: 'noexiste@correo.com',
          contrasena: 'Dribbling2026',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Perfil de Usuario (US3)', () => {
    it('debe recuperar el perfil del usuario autenticado por ID', async () => {
      const reg = await authService.registrar({
        nombre: 'Bukayo Saka',
        correo: 'saka@arsenal.com',
        contrasena: 'Gunner2026',
      });

      const perfil = await authService.obtenerPerfil(reg.usuario.id);

      expect(perfil.id).toBe(reg.usuario.id);
      expect(perfil.nombre).toBe('Bukayo Saka');
      expect(perfil.correo).toBe('saka@arsenal.com');
    });
  });
});
