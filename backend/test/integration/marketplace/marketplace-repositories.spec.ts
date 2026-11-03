import { DataSource } from 'typeorm';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { TransaccionTypeOrmRepository } from '../../../src/data-access/transaccion.typeorm-repository';
import { TransaccionOrmEntity } from '../../../src/data-access/transaccion.orm-entity';
import { OrdenTypeOrmRepository } from '../../../src/data-access/orden.typeorm-repository';
import { OrdenOrmEntity } from '../../../src/data-access/orden.orm-entity';
import { BalanceTokenTypeOrmRepository } from '../../../src/data-access/balance-token.typeorm-repository';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { ConfiguracionMercadoTypeOrmRepository } from '../../../src/data-access/configuracion-mercado.typeorm-repository';
import { ConfiguracionMercadoOrmEntity } from '../../../src/data-access/configuracion-mercado.orm-entity';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { LigaOrmEntity } from '../../../src/data-access/liga.orm-entity';
import { EquipoOrmEntity } from '../../../src/data-access/equipo.orm-entity';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { Transaccion } from '../../../src/domain/transaccion.entity';
import { Orden } from '../../../src/domain/orden.entity';
import { BalanceToken } from '../../../src/domain/balance-token.entity';
import { Cotizacion } from '../../../src/domain/cotizacion.entity';
import { Dinero } from '../../../src/domain/dinero.value-object';

describe('Marketplace Repositories (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let transaccionRepo: TransaccionTypeOrmRepository;
  let ordenRepo: OrdenTypeOrmRepository;
  let balanceRepo: BalanceTokenTypeOrmRepository;
  let cotizacionRepo: CotizacionTypeOrmRepository;
  let configRepo: ConfiguracionMercadoTypeOrmRepository;

  let usuario1Id: string;
  let usuario2Id: string;
  let jugador1Id: string;
  let jugador2Id: string;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    dataSource = started.dataSource;

    transaccionRepo = new TransaccionTypeOrmRepository(
      dataSource.getRepository(TransaccionOrmEntity),
    );
    ordenRepo = new OrdenTypeOrmRepository(
      dataSource.getRepository(OrdenOrmEntity),
    );
    balanceRepo = new BalanceTokenTypeOrmRepository(
      dataSource.getRepository(BalanceTokenOrmEntity),
    );
    cotizacionRepo = new CotizacionTypeOrmRepository(
      dataSource.getRepository(CotizacionOrmEntity),
    );
    configRepo = new ConfiguracionMercadoTypeOrmRepository(
      dataSource.getRepository(ConfiguracionMercadoOrmEntity),
    );
  }, 90000);

  afterAll(async () => {
    await MarketplaceTestDatabaseHelper.stop();
  });

  beforeEach(async () => {
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    // Sembrar usuarios
    usuario1Id = 'a1000000-0000-0000-0000-000000000001';
    usuario2Id = 'a2000000-0000-0000-0000-000000000001';

    await dataSource.getRepository(UsuarioOrmEntity).save({
      id: usuario1Id,
      correo: 'u1@test.com',
      contrasenaHash: 'hash',
      nombre: 'Usuario Uno',
      rol: 'USUARIO',
      saldo: 1000.0,
      activo: true,
    });

    await dataSource.getRepository(UsuarioOrmEntity).save({
      id: usuario2Id,
      correo: 'u2@test.com',
      contrasenaHash: 'hash',
      nombre: 'Usuario Dos',
      rol: 'ADMIN',
      saldo: 5000.0,
      activo: true,
    });

    // Sembrar liga, equipo, jugadores
    const lId = 'f1000000-0000-0000-0000-000000000001';
    const eqId = 'f2000000-0000-0000-0000-000000000001';
    jugador1Id = 'f3000000-0000-0000-0000-000000000001';
    jugador2Id = 'f3000000-0000-0000-0000-000000000002';

    await dataSource.query(
      `INSERT INTO ligas (id, nombre, codigo, pais) VALUES ($1, 'Liga Repo', 'LR', 'Argentina')`,
      [lId],
    );
    await dataSource.query(
      `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 9101, 'Equipo Repo', $2)`,
      [eqId, lId],
    );
    await dataSource.query(
      `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES
       ($1, 9201, 'Jugador Uno Repo', 'Delantero', $3, $4, true),
       ($2, 9202, 'Jugador Dos Repo', 'Mediocampista', $3, $4, true)`,
      [jugador1Id, jugador2Id, eqId, lId],
    );
  });

  describe('ConfiguracionMercadoTypeOrmRepository', () => {
    it('debe obtener la configuración actual y permitir actualizarla', async () => {
      const config = await configRepo.obtenerConfiguracion();
      expect(config).toBeDefined();
      expect(config.estrategiaActivaId).toBe('GLOBAL');

      config.cambiarEstrategia('POSICIONAL', 'POSICIONAL_v1', usuario2Id);
      await configRepo.guardar(config);

      const actualizada = await configRepo.obtenerConfiguracion();
      expect(actualizada.estrategiaActivaId).toBe('POSICIONAL');
      expect(actualizada.estrategiaActivaVersion).toBe('POSICIONAL_v1');
      expect(actualizada.actualizadoPor).toBe(usuario2Id);
    });
  });

  describe('CotizacionTypeOrmRepository', () => {
    it('debe guardar, consultar la última, guardarMuchos en lotes y obtener historial y variación', async () => {
      // guardarMuchos con array vacio
      await cotizacionRepo.guardarMuchos([]);
      const ultimaVacia = await cotizacionRepo.obtenerUltimaCotizacion(jugador1Id);
      expect(ultimaVacia).toBeNull();

      const c1 = Cotizacion.crearInicial({ jugadorId: jugador1Id });
      await cotizacionRepo.guardar(c1);

      const ultima = await cotizacionRepo.obtenerUltimaCotizacion(jugador1Id);
      expect(ultima).not.toBeNull();
      expect(ultima?.valor).toBe(1.0);

      // guardarMuchos con varios items
      const c2 = Cotizacion.crearDesdeCalculo({
        jugadorId: jugador1Id,
        score: 0.5,
        valor: 1.5,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: false,
        metricas: { goals: 5 },
      });
      const c3 = Cotizacion.crearInicial({ jugadorId: jugador2Id });
      await cotizacionRepo.guardarMuchos([c2, c3]);

      // obtenerUltimasPorJugadores
      const ultimasVacias = await cotizacionRepo.obtenerUltimasPorJugadores([]);
      expect(ultimasVacias.size).toBe(0);

      const ultimas = await cotizacionRepo.obtenerUltimasPorJugadores([jugador1Id, jugador2Id]);
      expect(ultimas.size).toBe(2);
      expect(ultimas.get(jugador1Id)?.score).toBe(0.5);

      // obtenerHistorial
      const historial = await cotizacionRepo.obtenerHistorial(jugador1Id, 10);
      expect(historial).toHaveLength(2);

      // obtenerVariacion
      const variacion = await cotizacionRepo.obtenerVariacion(jugador1Id);
      expect(variacion).not.toBeNull();
      expect(typeof variacion?.variacionPorcentual).toBe('number');
    });
  });

  describe('BalanceTokenTypeOrmRepository', () => {
    it('debe guardar, buscar por usuario y jugador, listar y sumar stock disponible', async () => {
      const b1 = BalanceToken.crear({
        usuarioId: usuario1Id,
        jugadorId: jugador1Id,
        cantidadDisponible: 100,
      });
      await balanceRepo.guardar(b1);

      const encontrado = await balanceRepo.buscarPorUsuarioYJugador(usuario1Id, jugador1Id);
      expect(encontrado).not.toBeNull();
      expect(encontrado?.cantidadDisponible).toBe(100);

      const inexistente = await balanceRepo.buscarPorUsuarioYJugador(usuario1Id, jugador2Id);
      expect(inexistente).toBeNull();

      const lista = await balanceRepo.listarPorUsuario(usuario1Id);
      expect(lista).toHaveLength(1);

      const totalStock = await balanceRepo.obtenerSuministroTotalPorJugador(jugador1Id);
      expect(totalStock).toBe(100);
    });
  });

  describe('OrdenTypeOrmRepository', () => {
    it('debe guardar, buscar por id, listar ofertas activas y con filtros', async () => {
      const o1 = Orden.crearVenta({
        usuarioId: usuario1Id,
        jugadorId: jugador1Id,
        cantidad: 10,
        precioUnitario: 2.5,
      });
      await ordenRepo.guardar(o1);

      const encontrada = await ordenRepo.buscarPorId(o1.id);
      expect(encontrada).not.toBeNull();
      expect(encontrada?.id).toBe(o1.id);

      const noEncontrada = await ordenRepo.buscarPorId('00000000-0000-0000-0000-000000000000');
      expect(noEncontrada).toBeNull();

      const activas = await ordenRepo.listarActivasPorJugador(jugador1Id);
      expect(activas).toHaveLength(1);

      // listarOfertasSecundarias con varios filtros
      const filtradas1 = await ordenRepo.listarOfertasSecundarias({
        jugadorId: jugador1Id,
        vendedorId: usuario1Id,
        estado: 'ACTIVA',
        limite: 10,
      });
      expect(filtradas1).toHaveLength(1);

      const filtradas2 = await ordenRepo.listarOfertasSecundarias({
        estado: 'PENDIENTE',
      });
      expect(filtradas2).toHaveLength(1);

      const stockSecundario = await ordenRepo.obtenerCantidadRestanteSecundarioPorJugador(jugador1Id);
      expect(stockSecundario).toBe(10);
    });
  });

  describe('TransaccionTypeOrmRepository', () => {
    it('debe guardar, buscar por id y listar con combinaciones de filtros', async () => {
      const orden = Orden.crearVenta({
        usuarioId: usuario2Id,
        jugadorId: jugador1Id,
        cantidad: 5,
        precioUnitario: 1.5,
      });
      await ordenRepo.guardar(orden);

      const tx = Transaccion.crear({
        ordenId: orden.id,
        tipoMercado: 'SECUNDARIO',
        jugadorId: jugador1Id,
        compradorId: usuario1Id,
        vendedorId: usuario2Id,
        cantidad: 5,
        precioUnitario: 1.5,
        estrategiaCotizacion: 'GLOBAL_v1',
      });
      await transaccionRepo.guardar(tx);

      const encontrada = await transaccionRepo.buscarPorId(tx.id);
      expect(encontrada).not.toBeNull();
      expect(encontrada?.estrategiaCotizacion).toBe('GLOBAL_v1');

      const inexistente = await transaccionRepo.buscarPorId('00000000-0000-0000-0000-000000000000');
      expect(inexistente).toBeNull();

      // listarPorUsuario con tipo COMPRA, VENTA y sin tipo
      const comprasU1 = await transaccionRepo.listarPorUsuario(usuario1Id, { tipo: 'COMPRA' });
      expect(comprasU1).toHaveLength(1);

      const ventasU1 = await transaccionRepo.listarPorUsuario(usuario1Id, { tipo: 'VENTA' });
      expect(ventasU1).toHaveLength(0);

      const todasU1 = await transaccionRepo.listarPorUsuario(usuario1Id, {
        jugadorId: jugador1Id,
        desde: new Date(Date.now() - 60000),
        hasta: new Date(Date.now() + 60000),
        limite: 10,
      });
      expect(todasU1).toHaveLength(1);

      // listarAuditoriaGlobal con filtros
      const auditoria = await transaccionRepo.listarAuditoriaGlobal({
        usuarioId: usuario1Id,
        jugadorId: jugador1Id,
        tipoMercado: 'SECUNDARIO',
        desde: new Date(Date.now() - 60000),
        hasta: new Date(Date.now() + 60000),
        limite: 10,
      });
      expect(auditoria).toHaveLength(1);
    });
  });
});
