import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { TokensService } from '../../../src/services/tokens.service';
import { AdminBootstrapService } from '../../../src/services/admin-bootstrap.service';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { ConfiguracionMercadoTypeOrmRepository } from '../../../src/data-access/configuracion-mercado.typeorm-repository';
import { ConfiguracionMercadoOrmEntity } from '../../../src/data-access/configuracion-mercado.orm-entity';
import { BalanceTokenTypeOrmRepository } from '../../../src/data-access/balance-token.typeorm-repository';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';

describe('Tokens Emission & Admin Bootstrap (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let usuarioRepo: UsuarioTypeOrmRepository;
  let jugadorRepo: JugadorTypeOrmRepository;
  let configRepo: ConfiguracionMercadoTypeOrmRepository;
  let balanceRepo: BalanceTokenTypeOrmRepository;
  let cotizacionRepo: CotizacionTypeOrmRepository;
  let tokensService: TokensService;
  let adminBootstrapService: AdminBootstrapService;

  const originalEnv = process.env;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    usuarioRepo = new UsuarioTypeOrmRepository(
      dataSource.getRepository(UsuarioOrmEntity),
    );
    jugadorRepo = new JugadorTypeOrmRepository(
      dataSource.getRepository(JugadorOrmEntity),
    );
    configRepo = new ConfiguracionMercadoTypeOrmRepository(
      dataSource.getRepository(ConfiguracionMercadoOrmEntity),
    );
    balanceRepo = new BalanceTokenTypeOrmRepository(
      dataSource.getRepository(BalanceTokenOrmEntity),
    );
    cotizacionRepo = new CotizacionTypeOrmRepository(
      dataSource.getRepository(CotizacionOrmEntity),
    );

    tokensService = new TokensService(
      dataSource,
      usuarioRepo,
      jugadorRepo,
      configRepo,
    );

    adminBootstrapService = new AdminBootstrapService(
      usuarioRepo,
      tokensService,
    );
  }, 90000);

  afterAll(async () => {
    process.env = originalEnv;
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.ADMIN_CORREO;
    delete process.env.ADMIN_CONTRASENA;
    delete process.env.ADMIN_NOMBRE;
    await MarketplaceTestDatabaseHelper.cleanDatabase();
  });

  it('debe omitir bootstrap limpiamente sin fallar si faltan variables de entorno', async () => {
    await expect(
      adminBootstrapService.onApplicationBootstrap(),
    ).resolves.not.toThrow();

    const admin = await usuarioRepo.buscarAdmin();
    expect(admin).toBeNull();
  });

  it('debe aprovisionar al superusuario ADMIN, emitir 100 tokens y cotización 1.00 solo para jugadores activos', async () => {
    process.env.ADMIN_CORREO = 'admin@marketplace.com';
    process.env.ADMIN_CONTRASENA = 'SuperAdmin1234';
    process.env.ADMIN_NOMBRE = 'Super Admin Marketplace';

    // 1. Sembrar liga y equipo
    const ligaId = 'b2000000-0000-0000-0000-000000000001';
    const equipoId = 'c2000000-0000-0000-0000-000000000001';
    const jugadorActivo1Id = 'd2000000-0000-0000-0000-000000000001';
    const jugadorActivo2Id = 'd2000000-0000-0000-0000-000000000002';
    const jugadorInactivoId = 'd2000000-0000-0000-0000-000000000003';

    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, $2, $3, $4)`,
      [ligaId, 'Premier League', 'PL', 'Inglaterra'],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 201, $2, $3)`,
      [equipoId, 'Arsenal FC', ligaId],
    );
    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES
       ($1, 301, 'Bukayo Saka', 'Delantero', $4, $5, true),
       ($2, 302, 'Martin Odegaard', 'Mediocampista', $4, $5, true),
       ($3, 303, 'Jugador Retirado', 'Defensa', $4, $5, false)`,
      [
        jugadorActivo1Id,
        jugadorActivo2Id,
        jugadorInactivoId,
        equipoId,
        ligaId,
      ],
    );

    // 2. Ejecutar bootstrap
    await adminBootstrapService.onApplicationBootstrap();

    // 3. Verificar que el superusuario ADMIN fue creado correctamente
    const admin = await usuarioRepo.buscarAdmin();
    expect(admin).not.toBeNull();
    expect(admin!.correo).toBe('admin@marketplace.com');
    expect(admin!.rol).toBe('ADMIN');
    expect(admin!.nombre).toBe('Super Admin Marketplace');
    const passValida = await bcrypt.compare(
      'SuperAdmin1234',
      admin!.contrasenaHash,
    );
    expect(passValida).toBe(true);

    // 4. Verificar balances emitidos para jugadores activos
    const balance1 = await balanceRepo.buscarPorUsuarioYJugador(
      admin!.id,
      jugadorActivo1Id,
    );
    expect(balance1).not.toBeNull();
    expect(balance1!.cantidadDisponible).toBe(100);
    expect(balance1!.cantidadBloqueada).toBe(0);
    expect(balance1!.cantidadTotal).toBe(100);

    const balance2 = await balanceRepo.buscarPorUsuarioYJugador(
      admin!.id,
      jugadorActivo2Id,
    );
    expect(balance2).not.toBeNull();
    expect(balance2!.cantidadDisponible).toBe(100);

    // 5. Verificar que el jugador inactivo NO fue emitido
    const balanceInactivo = await balanceRepo.buscarPorUsuarioYJugador(
      admin!.id,
      jugadorInactivoId,
    );
    expect(balanceInactivo).toBeNull();

    // 6. Verificar cotizaciones iniciales
    const cotizacion1 = await cotizacionRepo.obtenerUltimaCotizacion(
      jugadorActivo1Id,
    );
    expect(cotizacion1).not.toBeNull();
    expect(cotizacion1!.score).toBe(0.0);
    expect(cotizacion1!.valor).toBe(1.0);
    expect(cotizacion1!.sinEstadisticas).toBe(true);
    expect(cotizacion1!.estrategiaId).toBe('GLOBAL');
    expect(cotizacion1!.estrategiaVersion).toBe('GLOBAL_v1');

    // 7. Verificación SQL estricta de invariante: SUM(cantidad_disponible + cantidad_bloqueada) = 100
    const sum1 = await balanceRepo.obtenerSuministroTotalPorJugador(
      jugadorActivo1Id,
    );
    expect(sum1).toBe(100);

    const sum2 = await balanceRepo.obtenerSuministroTotalPorJugador(
      jugadorActivo2Id,
    );
    expect(sum2).toBe(100);

    // 8. Re-ejecutar bootstrap y emitirFaltantes para verificar idempotencia absoluta
    const resultadoReemision = await tokensService.emitirFaltantes();
    expect(resultadoReemision.emitidos).toBe(0);
    expect(resultadoReemision.omitidos).toBe(2);

    const sum1Recheck = await balanceRepo.obtenerSuministroTotalPorJugador(
      jugadorActivo1Id,
    );
    expect(sum1Recheck).toBe(100);
  });
});
