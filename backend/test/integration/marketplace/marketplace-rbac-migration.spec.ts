import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { CreateMarketplaceAndOmsTables1730000000000 } from '../../../src/migrations/1730000000000-create-marketplace-and-oms-tables';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { Usuario } from '../../../src/domain/usuario.entity';
import { ROLES_KEY } from '../../../src/common/decorators/roles.decorator';

describe('Marketplace RBAC, Migración e Inmutabilidad (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let usuarioRepo: UsuarioTypeOrmRepository;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;
    const ormRepo = dataSource.getRepository(UsuarioOrmEntity);
    usuarioRepo = new UsuarioTypeOrmRepository(ormRepo);

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector, usuarioRepo);
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();
  });

  describe('Migración: CreateMarketplaceAndOmsTables1730000000000', () => {
    it('debe revertir (down) y re-aplicar (up) la migración de forma idempotente', async () => {
      const migration = new CreateMarketplaceAndOmsTables1730000000000();
      const queryRunner = dataSource.createQueryRunner();

      try {
        await queryRunner.connect();

        // Ejecutar down
        await migration.down(queryRunner);

        // Validar que las tablas ya no existen
        const tablasDown = await queryRunner.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name IN ('cotizaciones', 'transacciones', 'ordenes', 'balances_tokens', 'configuraciones_mercado')
        `);
        expect(tablasDown.length).toBe(0);

        // Ejecutar up nuevamente
        await migration.up(queryRunner);

        // Validar que las tablas volvieron a crearse
        const tablasUp = await queryRunner.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name IN ('cotizaciones', 'transacciones', 'ordenes', 'balances_tokens', 'configuraciones_mercado')
        `);
        expect(tablasUp.length).toBe(5);

        // Validar que la semilla singleton id = 1 existe
        const config = await queryRunner.query(
          `SELECT * FROM configuraciones_mercado WHERE id = 1`,
        );
        expect(config.length).toBe(1);
        expect(config[0].estrategia_activa_id).toBe('GLOBAL');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Inmutabilidad en BD: Cotizaciones y Transacciones', () => {
    it('debe impedir UPDATE y DELETE en cotizaciones mediante trigger de inmutabilidad', async () => {
      // 1. Sembrar usuario y jugador necesarios para claves foráneas
      const usuarioId = 'a1000000-0000-0000-0000-000000000001';
      const ligaId = 'b1000000-0000-0000-0000-000000000001';
      const equipoId = 'c1000000-0000-0000-0000-000000000001';
      const jugadorId = 'd1000000-0000-0000-0000-000000000001';
      const cotizacionId = 'e1000000-0000-0000-0000-000000000001';

      await dataSource.query(
        `INSERT INTO usuarios (id, nombre, correo, contrasena_hash, rol, saldo) VALUES ($1, $2, $3, $4, $5, $6)`,
        [usuarioId, 'Admin Test', 'admin@test.com', 'hash1234', 'ADMIN', 1000.0],
      );
      await dataSource.query(
        `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, $2, $3, $4)`,
        [ligaId, 'Liga Test', 'LT', 'Pais Test'],
      );
      await dataSource.query(
        `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 101, $2, $3)`,
        [equipoId, 'Equipo Test', ligaId],
      );
      await dataSource.query(
        `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES ($1, 201, $2, $3, $4, $5, true)`,
        [jugadorId, 'Jugador Test', 'Delantero', equipoId, ligaId],
      );

      // Insertar cotizacion
      await dataSource.query(
        `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas)
         VALUES ($1, $2, 0.5000, 1.50, 'GLOBAL', 'GLOBAL_v1', false)`,
        [cotizacionId, jugadorId],
      );

      // Intentar UPDATE
      await expect(
        dataSource.query(
          `UPDATE cotizaciones SET valor = 1.80 WHERE id = $1`,
          [cotizacionId],
        ),
      ).rejects.toThrow(/inmutable/i);

      // Intentar DELETE
      await expect(
        dataSource.query(`DELETE FROM cotizaciones WHERE id = $1`, [
          cotizacionId,
        ]),
      ).rejects.toThrow(/inmutable/i);
    });

    it('debe impedir UPDATE y DELETE en transacciones mediante trigger de inmutabilidad', async () => {
      const compradorId = 'a1000000-0000-0000-0000-000000000002';
      const vendedorId = 'a1000000-0000-0000-0000-000000000003';
      const ligaId = 'b1000000-0000-0000-0000-000000000002';
      const equipoId = 'c1000000-0000-0000-0000-000000000002';
      const jugadorId = 'd1000000-0000-0000-0000-000000000002';
      const ordenId = 'f1000000-0000-0000-0000-000000000001';
      const transaccionId = 'f2000000-0000-0000-0000-000000000001';

      await dataSource.query(
        `INSERT INTO usuarios (id, nombre, correo, contrasena_hash, rol, saldo) VALUES
         ($1, 'Comprador', 'comprador@test.com', 'hash', 'USUARIO', 1000),
         ($2, 'Vendedor Admin', 'vendedor@test.com', 'hash', 'ADMIN', 1000)`,
        [compradorId, vendedorId],
      );
      await dataSource.query(
        `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, $2, $3, $4)`,
        [ligaId, 'Liga Test 2', 'LT2', 'Pais Test 2'],
      );
      await dataSource.query(
        `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 102, $2, $3)`,
        [equipoId, 'Equipo Test 2', ligaId],
      );
      await dataSource.query(
        `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES ($1, 202, $2, $3, $4, $5, true)`,
        [jugadorId, 'Jugador Test 2', 'Mediocampista', equipoId, ligaId],
      );
      await dataSource.query(
        `INSERT INTO ordenes (id, usuario_id, jugador_id, tipo, tipo_mercado, cantidad, cantidad_restante, precio_unitario, estado)
         VALUES ($1, $2, $3, 'COMPRA', 'PRIMARIO', 10, 0, 1.00, 'COMPLETADA')`,
        [ordenId, compradorId, jugadorId],
      );

      // Insertar transaccion
      await dataSource.query(
        `INSERT INTO transacciones (id, orden_id, jugador_id, comprador_id, vendedor_id, cantidad, precio_unitario, monto_total, tipo_mercado, estrategia_cotizacion)
         VALUES ($1, $2, $3, $4, $5, 10, 1.00, 10.00, 'PRIMARIO', 'GLOBAL_v1')`,
        [transaccionId, ordenId, jugadorId, compradorId, vendedorId],
      );

      // Intentar UPDATE
      await expect(
        dataSource.query(
          `UPDATE transacciones SET cantidad = 20 WHERE id = $1`,
          [transaccionId],
        ),
      ).rejects.toThrow(/inmutable/i);

      // Intentar DELETE
      await expect(
        dataSource.query(`DELETE FROM transacciones WHERE id = $1`, [
          transaccionId,
        ]),
      ).rejects.toThrow(/inmutable/i);
    });
  });

  describe('RBAC: RolesGuard', () => {
    function crearMockContext(
      requestUser: any,
      requiredRoles: string[] | null,
    ): ExecutionContext {
      const handler = () => {};
      const targetClass = class {};

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user: requestUser,
          }),
        }),
        getHandler: () => handler,
        getClass: () => targetClass,
      } as unknown as ExecutionContext;
    }

    it('debe permitir acceso si no hay roles requeridos en la ruta', async () => {
      const ctx = crearMockContext({ id: 'cualquiera' }, null);
      const resultado = await rolesGuard.canActivate(ctx);
      expect(resultado).toBe(true);
    });

    it('debe arrojar 401 si request.user no está definido', async () => {
      const ctx = crearMockContext(null, ['ADMIN']);
      await expect(rolesGuard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe arrojar 401 si el usuario no existe en BD o está inactivo', async () => {
      const ctxNoExiste = crearMockContext(
        { id: '00000000-0000-0000-0000-000000000099' },
        ['ADMIN'],
      );
      await expect(rolesGuard.canActivate(ctxNoExiste)).rejects.toThrow(
        UnauthorizedException,
      );

      const usuarioInactivo = Usuario.crear({
        nombre: 'Inactivo',
        correo: 'inactivo@test.com',
        contrasenaHash: 'hash',
        activo: false,
      });
      await usuarioRepo.guardar(usuarioInactivo);

      const ctxInactivo = crearMockContext(
        { id: usuarioInactivo.id },
        ['USUARIO'],
      );
      await expect(rolesGuard.canActivate(ctxInactivo)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe rechazar con 403 a un usuario con rol USUARIO intentando acceder a ruta ADMIN', async () => {
      const usuario = Usuario.crear({
        nombre: 'Usuario Comun',
        correo: 'comun@test.com',
        contrasenaHash: 'hash',
        rol: 'USUARIO',
      });
      await usuarioRepo.guardar(usuario);

      const ctx = crearMockContext({ id: usuario.id }, ['ADMIN']);
      await expect(rolesGuard.canActivate(ctx)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe permitir acceso a ADMIN y reflejar cambios de rol en BD de inmediato', async () => {
      const usuario = Usuario.crear({
        nombre: 'Futuro Admin',
        correo: 'futuro@test.com',
        contrasenaHash: 'hash',
        rol: 'USUARIO',
      });
      await usuarioRepo.guardar(usuario);

      // Como USUARIO -> 403
      const requestMock: { user: any } = { user: { id: usuario.id } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => requestMock }),
        getHandler: () => () => {},
        getClass: () => class {},
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      await expect(rolesGuard.canActivate(ctx)).rejects.toThrow(
        ForbiddenException,
      );

      // Promover en BD a ADMIN
      usuario.promoverAAdmin();
      await usuarioRepo.guardar(usuario);

      // Ahora canActivate debe ser true y actualizar request.user con el usuario de BD
      const permitido = await rolesGuard.canActivate(ctx);
      expect(permitido).toBe(true);
      expect(requestMock.user.rol).toBe('ADMIN');
    });
  });
});
