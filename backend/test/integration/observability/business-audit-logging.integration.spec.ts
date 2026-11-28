import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { __resetOutOfContextForTests } from 'nestjs-pino/PinoLogger';
import { PassThrough } from 'stream';
import { DataSource } from 'typeorm';
import { QuotesController } from '../../../src/controllers/quotes.controller';
import { TeamOfTheWeekController } from '../../../src/controllers/team-of-the-week.controller';
import { ScrapingController } from '../../../src/scraping/controllers/scraping.controller';
import { EjecucionScraping } from '../../../src/scraping/domain/ejecucion-scraping.entity';
import { NormalizadorJugadorService } from '../../../src/scraping/services/normalizador-jugador.service';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { WhoScoredPlaywrightService } from '../../../src/scraping/services/whoscored-playwright.service';
import { BalanceTokenOrmEntity } from '../../../src/data-access/balance-token.orm-entity';
import { BalanceTokenTypeOrmRepository } from '../../../src/data-access/balance-token.typeorm-repository';
import { CotizacionOrmEntity } from '../../../src/data-access/cotizacion.orm-entity';
import { CotizacionTypeOrmRepository } from '../../../src/data-access/cotizacion.typeorm-repository';
import { JugadorOrmEntity } from '../../../src/data-access/jugador.orm-entity';
import { JugadorTypeOrmRepository } from '../../../src/data-access/jugador.typeorm-repository';
import { OrdenOrmEntity } from '../../../src/data-access/orden.orm-entity';
import { OrdenTypeOrmRepository } from '../../../src/data-access/orden.typeorm-repository';
import { TransaccionOrmEntity } from '../../../src/data-access/transaccion.orm-entity';
import { TransaccionTypeOrmRepository } from '../../../src/data-access/transaccion.typeorm-repository';
import { UsuarioOrmEntity } from '../../../src/data-access/usuario.orm-entity';
import { UsuarioTypeOrmRepository } from '../../../src/data-access/usuario.typeorm-repository';
import { ConfiguracionMercado } from '../../../src/domain/configuracion-mercado.entity';
import { Cotizacion } from '../../../src/domain/cotizacion.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';
import { Jugador, PosicionJugador } from '../../../src/domain/jugador.entity';
import { Usuario } from '../../../src/domain/usuario.entity';
import { AuditAspectRegistry } from '../../../src/observability/aspects/audit-aspect.registry';
import { createPinoLoggerConfig } from '../../../src/observability/config/pino-logger.config';
import { AuditContextService } from '../../../src/observability/services/audit-context.service';
import { AuditLoggerService } from '../../../src/observability/services/audit-logger.service';
import { EquipoSemanalService } from '../../../src/services/equipo-semanal.service';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { OmsService } from '../../../src/services/oms.service';
import { QuotesService } from '../../../src/services/quotes.service';
import { QuotesSchedulerService } from '../../../src/services/scheduler/quotes-scheduler.service';
import { TeamOfTheWeekSchedulerService } from '../../../src/services/scheduler/team-of-the-week-scheduler.service';
import { MarketplaceTestDatabaseHelper } from '../marketplace/marketplace-test-database.helper';

const ISO_8601_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function assertBusinessAuditSchema(entry: Record<string, any>) {
  expect([30, 40, 50]).toContain(entry.level);
  expect(entry.timestamp).toMatch(ISO_8601_UTC_REGEX);
  expect(entry.servicio).toBe('football-tokens-backend');
  expect(typeof entry.entorno).toBe('string');
  expect(entry.tipoEvento).toBe('BUSINESS_AUDIT');
  expect([
    'TRANSACCION_TOKENS',
    'ORDEN_MERCADO_SECUNDARIO',
    'CALCULO_COTIZACIONES',
    'CAMBIO_ESTRATEGIA_COTIZACION',
    'CALCULO_TEAM_OF_THE_WEEK',
    'SCRAPING_ESTADISTICAS',
    'SCRAPING_LIGA',
  ]).toContain(entry.evento);
  expect(entry.requestId === null || typeof entry.requestId === 'string').toBe(
    true,
  );
  expect([
    'HTTP',
    'MANUAL',
    'PROGRAMADO',
    'PROGRAMADO_TOTW',
    'STANDALONE',
    'SISTEMA',
  ]).toContain(entry.origen);
  expect(entry.usuarioId === null || typeof entry.usuarioId === 'string').toBe(
    true,
  );
  expect(['EXITO', 'RECHAZADO', 'OMITIDO', 'FALLIDO']).toContain(
    entry.resultado,
  );
  expect(entry.motivo === null || typeof entry.motivo === 'string').toBe(true);
  expect(typeof entry.tiempoEjecucion).toBe('number');
  expect(entry.tiempoEjecucion).toBeGreaterThanOrEqual(0);
  expect(typeof entry.datos).toBe('object');
  expect(typeof entry.msg).toBe('string');
}

describe('Business Audit Logging (Integration)', () => {
  let capturedLines: string[];
  let auditContext: AuditContextService;
  let auditLogger: AuditLoggerService;

  const parseBusinessLogs = () =>
    capturedLines
      .map((line) => JSON.parse(line) as Record<string, any>)
      .filter((entry) => entry.tipoEvento === 'BUSINESS_AUDIT');

  const clearLogs = () => {
    capturedLines.length = 0;
  };

  beforeEach(() => {
    __resetOutOfContextForTests();
    AuditAspectRegistry.clear();
    capturedLines = [];
    const stream = new PassThrough();
    stream.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n')) {
        if (line.trim()) {
          capturedLines.push(line.trim());
        }
      }
    });

    const params = createPinoLoggerConfig(
      { NODE_ENV: 'production', LOG_LEVEL: 'info' },
      stream,
    );
    const pinoLogger = new PinoLogger(params);
    auditContext = new AuditContextService();
    auditLogger = new AuditLoggerService(pinoLogger, auditContext);
    AuditAspectRegistry.registerLogger(auditLogger);
    AuditAspectRegistry.registerContext(auditContext);
  });

  afterEach(() => {
    AuditAspectRegistry.clear();
    __resetOutOfContextForTests();
  });

  describe('US2 - Auditoria de Transacciones de Tokens y Ordenes (PostgreSQL Testcontainers)', () => {
    let dataSource: DataSource;
    let omsService: OmsService;
    let usuarioRepo: UsuarioTypeOrmRepository;
    let admin: Usuario;
    let vendedor: Usuario;
    let comprador: Usuario;

    const ligaId = 'f1000000-0000-0000-0000-000000000001';
    const equipoId = 'f2000000-0000-0000-0000-000000000001';
    const jugadorId = 'f3000000-0000-0000-0000-000000000001';

    beforeAll(async () => {
      const started = await MarketplaceTestDatabaseHelper.start();
      dataSource = started.dataSource;

      const ordenRepo = new OrdenTypeOrmRepository(
        dataSource.getRepository(OrdenOrmEntity),
      );
      const transaccionRepo = new TransaccionTypeOrmRepository(
        dataSource.getRepository(TransaccionOrmEntity),
      );
      const balanceTokenRepo = new BalanceTokenTypeOrmRepository(
        dataSource.getRepository(BalanceTokenOrmEntity),
      );
      const cotizacionRepo = new CotizacionTypeOrmRepository(
        dataSource.getRepository(CotizacionOrmEntity),
      );
      const jugadorRepo = new JugadorTypeOrmRepository(
        dataSource.getRepository(JugadorOrmEntity),
      );
      usuarioRepo = new UsuarioTypeOrmRepository(
        dataSource.getRepository(UsuarioOrmEntity),
      );

      const mockRedisClient: any = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      const cacheService = new MarketplaceCacheService(mockRedisClient);

      omsService = new OmsService(
        dataSource,
        ordenRepo,
        transaccionRepo,
        balanceTokenRepo,
        cotizacionRepo,
        jugadorRepo,
        usuarioRepo,
        cacheService,
      );
    }, 90000);

    afterAll(async () => {
      await MarketplaceTestDatabaseHelper.stop();
    });

    beforeEach(async () => {
      await MarketplaceTestDatabaseHelper.cleanDatabase();

      admin = Usuario.crear({
        nombre: 'Admin Marketplace',
        correo: 'admin_audit@oms.com',
        contrasenaHash: 'hash',
        rol: 'ADMIN',
        saldo: 0,
      });
      vendedor = Usuario.crear({
        nombre: 'Vendedor Audit',
        correo: 'vendedor_audit@oms.com',
        contrasenaHash: 'hash',
        saldo: 1000,
      });
      comprador = Usuario.crear({
        nombre: 'Comprador Audit',
        correo: 'comprador_audit@oms.com',
        contrasenaHash: 'hash',
        saldo: 500,
      });

      await usuarioRepo.guardar(admin);
      await usuarioRepo.guardar(vendedor);
      await usuarioRepo.guardar(comprador);

      await dataSource.query(
        `INSERT INTO ligas (id, codigo, nombre, pais) VALUES ($1, 'PL', 'Premier League', 'Inglaterra')`,
        [ligaId],
      );
      await dataSource.query(
        `INSERT INTO equipos (id, external_id, nombre, liga_id) VALUES ($1, 701, 'Arsenal', $2)`,
        [equipoId, ligaId],
      );
      await dataSource.query(
        `INSERT INTO jugadores (id, external_id, nombre, posicion, equipo_id, liga_id, activo) VALUES ($1, 801, 'Bukayo Saka', 'Delantero', $2, $3, true)`,
        [jugadorId, equipoId, ligaId],
      );
      await dataSource.query(
        `INSERT INTO cotizaciones (id, jugador_id, score, valor, estrategia_id, estrategia_version, sin_estadisticas, metricas, fecha_cotizacion)
         VALUES (gen_random_uuid(), $1, 0.8500, 50.00, 'GLOBAL', 'GLOBAL_v1', false, '{}'::jsonb, now())`,
        [jugadorId],
      );
      await dataSource.query(
        `INSERT INTO balances_tokens (id, usuario_id, jugador_id, cantidad_disponible, cantidad_bloqueada, actualizado_en)
         VALUES (gen_random_uuid(), $1, $2, 1000, 0, now())`,
        [admin.id, jugadorId],
      );
    });

    it('audita compra primaria, orden de venta, compra secundaria P2P, cancelacion y rechazos correlacionados con requestId', async () => {
      // 1. Compra primaria exitosa correlacionada con requestId
      clearLogs();
      await auditContext.ejecutarEnContexto('req-oms-prim-1', () =>
        omsService.comprarTokens(vendedor.id, {
          jugadorId,
          cantidad: 5,
        }),
      );

      let logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 30,
        evento: 'TRANSACCION_TOKENS',
        requestId: 'req-oms-prim-1',
        origen: 'HTTP',
        usuarioId: vendedor.id,
        resultado: 'EXITO',
        motivo: null,
        datos: {
          mercado: 'PRIMARIO',
          operacion: 'COMPRA',
          compradorId: vendedor.id,
          vendedorId: admin.id,
          jugadorId,
          cantidad: 5,
          precioUnitario: 50,
          montoTotal: 250,
          estrategiaCotizacion: 'GLOBAL_v1',
        },
      });
      expect(logs[0].datos.transaccionId).toBeTruthy();
      expect(logs[0].datos.ordenId).toBeTruthy();

      // 2. Rechazo compra primaria por slippage
      clearLogs();
      await expect(
        auditContext.ejecutarEnContexto('req-oms-slip-1', () =>
          omsService.comprarTokens(comprador.id, {
            jugadorId,
            cantidad: 2,
            precioMaximoUnitario: 40,
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'TRANSACCION_TOKENS',
        requestId: 'req-oms-slip-1',
        resultado: 'RECHAZADO',
        datos: {
          mercado: 'PRIMARIO',
          operacion: 'COMPRA',
          compradorId: comprador.id,
          transaccionId: null,
          jugadorId,
          cantidad: 2,
          precioUnitario: 50,
        },
      });
      expect(logs[0].motivo).toContain('precio máximo');

      // 3. Crear orden de venta secundaria
      clearLogs();
      const ordenVenta = await auditContext.ejecutarEnContexto(
        'req-oms-sell-1',
        () =>
          omsService.crearOrdenVenta(vendedor.id, {
            jugadorId,
            cantidad: 3,
            precioUnitario: 60,
          }),
      );

      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 30,
        evento: 'ORDEN_MERCADO_SECUNDARIO',
        requestId: 'req-oms-sell-1',
        usuarioId: vendedor.id,
        resultado: 'EXITO',
        datos: {
          mercado: 'SECUNDARIO',
          accion: 'CREAR_VENTA',
          vendedorId: vendedor.id,
          ordenId: ordenVenta.ordenId,
          jugadorId,
          cantidad: 3,
          precioUnitario: 60,
          estadoOrden: 'PENDIENTE',
        },
      });

      // 4. Rechazo por auto-compra en secundario
      clearLogs();
      await expect(
        auditContext.ejecutarEnContexto('req-oms-self-1', () =>
          omsService.comprarTokens(vendedor.id, {
            jugadorId,
            cantidad: 1,
            ordenVentaId: ordenVenta.ordenId,
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'TRANSACCION_TOKENS',
        requestId: 'req-oms-self-1',
        resultado: 'RECHAZADO',
        datos: {
          mercado: 'SECUNDARIO',
          operacion: 'COMPRA',
          compradorId: vendedor.id,
          vendedorId: vendedor.id,
          ordenId: ordenVenta.ordenId,
        },
      });

      // 5. Compra secundaria P2P exitosa (comprador -> vendedor)
      clearLogs();
      await auditContext.ejecutarEnContexto('req-oms-p2p-1', () =>
        omsService.comprarTokens(comprador.id, {
          jugadorId,
          cantidad: 2,
          ordenVentaId: ordenVenta.ordenId,
        }),
      );

      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 30,
        evento: 'TRANSACCION_TOKENS',
        requestId: 'req-oms-p2p-1',
        usuarioId: comprador.id,
        resultado: 'EXITO',
        datos: {
          mercado: 'SECUNDARIO',
          operacion: 'COMPRA',
          compradorId: comprador.id,
          vendedorId: vendedor.id,
          ordenId: ordenVenta.ordenId,
          jugadorId,
          cantidad: 2,
          precioUnitario: 60,
          montoTotal: 120,
        },
      });

      // 6. Rechazo por saldo insuficiente en compra primaria
      clearLogs();
      await expect(
        auditContext.ejecutarEnContexto('req-oms-saldo-1', () =>
          omsService.comprarTokens(comprador.id, {
            jugadorId,
            cantidad: 20,
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].resultado).toBe('RECHAZADO');
      expect(logs[0].motivo).toContain('Saldo monetario insuficiente');

      // 7. Cancelar orden de venta remanente + rechazo al re-cancelar (orden ya cancelada)
      clearLogs();
      await auditContext.ejecutarEnContexto('req-oms-cancel-1', () =>
        omsService.cancelarOrdenVenta(vendedor.id, ordenVenta.ordenId),
      );
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 30,
        evento: 'ORDEN_MERCADO_SECUNDARIO',
        requestId: 'req-oms-cancel-1',
        resultado: 'EXITO',
        datos: {
          mercado: 'SECUNDARIO',
          accion: 'CANCELAR_VENTA',
          vendedorId: vendedor.id,
          ordenId: ordenVenta.ordenId,
          jugadorId,
          estadoOrden: 'CANCELADA',
        },
      });

      clearLogs();
      await expect(
        auditContext.ejecutarEnContexto('req-oms-cancel-2', () =>
          omsService.cancelarOrdenVenta(vendedor.id, ordenVenta.ordenId),
        ),
      ).rejects.toThrow(ConflictException);
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'ORDEN_MERCADO_SECUNDARIO',
        requestId: 'req-oms-cancel-2',
        resultado: 'RECHAZADO',
        datos: {
          mercado: 'SECUNDARIO',
          accion: 'CANCELAR_VENTA',
          ordenId: ordenVenta.ordenId,
          estadoOrden: null,
        },
      });

      // 8. Rechazo al intentar comprar una orden ya cancelada/liquidada
      clearLogs();
      await expect(
        auditContext.ejecutarEnContexto('req-oms-liq-1', () =>
          omsService.comprarTokens(comprador.id, {
            jugadorId,
            cantidad: 1,
            ordenVentaId: ordenVenta.ordenId,
          }),
        ),
      ).rejects.toThrow(ConflictException);
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0].resultado).toBe('RECHAZADO');
      expect(logs[0].datos.mercado).toBe('SECUNDARIO');
    });
  });

  describe('US3 - Auditoria de Cotizaciones y Team of the Week', () => {
    function crearJugadoresOnceIdeal(): {
      jugadores: Jugador[];
      cotizaciones: Map<string, Cotizacion>;
    } {
      const posiciones: PosicionJugador[] = [
        'Portero',
        'Defensa',
        'Defensa',
        'Defensa',
        'Defensa',
        'Mediocampista',
        'Mediocampista',
        'Mediocampista',
        'Delantero',
        'Delantero',
        'Delantero',
      ];
      const jugadores: Jugador[] = [];
      const cotizaciones = new Map<string, Cotizacion>();
      posiciones.forEach((posicion, idx) => {
        const id = `00000000-0000-0000-0000-0000000000${String(idx + 1).padStart(2, '0')}`;
        const j = Jugador.crear({
          id,
          externalId: 1000 + idx,
          nombre: `Jugador ${idx + 1}`,
          posicion,
          equipoId: 'eq-1',
          ligaId: 'lg-1',
          activo: true,
        });
        jugadores.push(j);
        cotizaciones.set(
          id,
          Cotizacion.crearDesdeCalculo({
            jugadorId: id,
            score: 0.9 - idx * 0.01,
            valor: 20 - idx * 0.5,
            estrategiaId: 'GLOBAL',
            estrategiaVersion: 'GLOBAL_v1',
            sinEstadisticas: false,
            metricas: {},
          }),
        );
      });
      return { jugadores, cotizaciones };
    }

    it('audita CALCULO_COTIZACIONES (manual, programado, omitido por lock y error sin duplicacion) y CAMBIO_ESTRATEGIA_COTIZACION', async () => {
      const config = ConfiguracionMercado.crear();
      const configRepo: any = {
        obtenerConfiguracion: jest.fn().mockImplementation(async () => config),
        guardar: jest.fn().mockResolvedValue(undefined),
      };
      const jugadorRepo: any = {
        listarActivos: jest.fn().mockResolvedValue([
          Jugador.crear({
            id: 'j-1',
            externalId: 1,
            nombre: 'Jugador Uno',
            posicion: 'Delantero',
            equipoId: 'e-1',
            ligaId: 'l-1',
            activo: true,
          }),
        ]),
      };
      const estadisticaRepo: any = {
        buscarPorJugadores: jest.fn().mockResolvedValue([]),
      };
      const cotizacionRepo: any = {
        guardarMuchos: jest.fn().mockResolvedValue(undefined),
        guardar: jest.fn().mockResolvedValue(undefined),
      };
      const cacheService: any = {
        invalidarRanking: jest.fn().mockResolvedValue(undefined),
      };
      const tokensService: any = {
        emitirFaltantes: jest.fn().mockResolvedValue(undefined),
      };
      const dataSourceMock: any = {
        createQueryRunner: jest.fn(),
      };

      const quotesService = new QuotesService(
        dataSourceMock,
        cotizacionRepo,
        jugadorRepo,
        estadisticaRepo,
        configRepo,
        {} as any,
        cacheService,
        tokensService,
      );
      const quotesController = new QuotesController(quotesService);

      // 1. Cambio de estrategia exitoso + rechazado
      clearLogs();
      await auditContext.ejecutarEnContexto('req-q-strat-1', () =>
        quotesController.cambiarEstrategia(
          { estrategiaId: 'POSICIONAL' },
          { user: { id: 'admin-1' } },
        ),
      );
      let logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        evento: 'CAMBIO_ESTRATEGIA_COTIZACION',
        requestId: 'req-q-strat-1',
        usuarioId: 'admin-1',
        resultado: 'EXITO',
        datos: {
          estrategiaAnterior: 'GLOBAL',
          estrategiaNueva: 'POSICIONAL',
          versionNueva: 'POSICIONAL_v1',
        },
      });

      clearLogs();
      await expect(
        quotesService.cambiarEstrategiaActiva('INEXISTENTE' as any, 'admin-1'),
      ).rejects.toThrow(ReglaDeNegocioException);
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'CAMBIO_ESTRATEGIA_COTIZACION',
        resultado: 'RECHAZADO',
        datos: { estrategiaNueva: 'INEXISTENTE' },
      });

      // 2. Recalculo manual via controller con adminId y requestId
      clearLogs();
      await auditContext.ejecutarEnContexto('req-q-man-1', () =>
        quotesController.recalcularManualmente({ user: { id: 'admin-1' } }),
      );
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        evento: 'CALCULO_COTIZACIONES',
        requestId: 'req-q-man-1',
        origen: 'MANUAL',
        usuarioId: 'admin-1',
        resultado: 'EXITO',
        datos: {
          estrategiaId: 'POSICIONAL',
          estrategiaVersion: 'POSICIONAL_v1',
          procesados: 1,
          sinEstadisticas: 1,
          fallidos: 0,
        },
      });

      // 3. Scheduler: lock omitido -> OMITIDO con requestId null
      const qrSkip = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue([{ lock_acquired: false }]),
        release: jest.fn(),
      };
      dataSourceMock.createQueryRunner.mockReturnValue(qrSkip);
      const quotesScheduler = new QuotesSchedulerService(
        dataSourceMock,
        quotesService,
      );

      clearLogs();
      await quotesScheduler.ejecutarRecalculoSemanal();
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'CALCULO_COTIZACIONES',
        requestId: null,
        origen: 'PROGRAMADO',
        resultado: 'OMITIDO',
      });

      // 4. Scheduler: ejecucion exitosa -> 1 solo evento EXITO (sin duplicar)
      const qrOk = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue([{ lock_acquired: true }]),
        release: jest.fn(),
      };
      dataSourceMock.createQueryRunner.mockReturnValue(qrOk);
      clearLogs();
      await quotesScheduler.ejecutarRecalculoSemanal();
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        evento: 'CALCULO_COTIZACIONES',
        requestId: null,
        origen: 'PROGRAMADO',
        resultado: 'EXITO',
      });

      // 5. Scheduler: fallo interno en QuotesService -> exactamente 1 evento FALLIDO (deduplicado)
      configRepo.obtenerConfiguracion.mockRejectedValueOnce(
        new Error('DB timeout'),
      );
      clearLogs();
      await expect(quotesScheduler.ejecutarRecalculoSemanal()).rejects.toThrow(
        'DB timeout',
      );
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 50,
        evento: 'CALCULO_COTIZACIONES',
        resultado: 'FALLIDO',
        motivo: 'DB timeout',
      });

      // 6. Verificar metadatos @Cron preservados en QuotesSchedulerService
      const descQuotes = Object.getOwnPropertyDescriptor(
        QuotesSchedulerService.prototype,
        'ejecutarRecalculoSemanal',
      );
      const cronKeyQuotes = Reflect.getMetadataKeys(descQuotes?.value).find(
        (k) => String(k).toLowerCase().includes('cron'),
      );
      expect(cronKeyQuotes).toBeDefined();
    });

    it('audita CALCULO_TEAM_OF_THE_WEEK (manual, automatico, omitido por existencia/lock, rechazado sin duplicar) y preserva @Cron', async () => {
      const { jugadores, cotizaciones } = crearJugadoresOnceIdeal();
      const config = ConfiguracionMercado.crear();
      const equipoRepo: any = {
        obtenerPorSemana: jest.fn().mockResolvedValue(null),
        guardarOSobrescribir: jest.fn().mockResolvedValue(undefined),
      };
      const jugadorRepo: any = {
        listarActivos: jest.fn().mockResolvedValue(jugadores),
      };
      const cotizacionRepo: any = {
        obtenerUltimasPorJugadores: jest.fn().mockResolvedValue(cotizaciones),
      };
      const configRepo: any = {
        obtenerConfiguracion: jest.fn().mockResolvedValue(config),
      };
      const estadisticaRepo: any = {
        buscarPorJugadores: jest.fn().mockResolvedValue(
          jugadores.map((j) => ({
            jugadorId: j.id,
            temporada: '2025/2026',
            minutosJugados: 900,
          })),
        ),
      };
      const cacheService: any = {
        invalidarEquipoSemanal: jest.fn().mockResolvedValue(undefined),
      };

      const equipoService = new EquipoSemanalService(
        jugadorRepo,
        cotizacionRepo,
        configRepo,
        equipoRepo,
        estadisticaRepo,
        cacheService,
      );
      const totwController = new TeamOfTheWeekController(equipoService);

      // 1. Generacion manual via controller
      clearLogs();
      await auditContext.ejecutarEnContexto('req-totw-man-1', () =>
        totwController.generarManualmente({ user: { id: 'admin-totw' } }),
      );
      let logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 30,
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        requestId: 'req-totw-man-1',
        origen: 'MANUAL',
        usuarioId: 'admin-totw',
        resultado: 'EXITO',
        datos: {
          estrategiaId: 'GLOBAL',
          estrategiaVersion: 'GLOBAL_v1',
          cantidadMiembros: 11,
        },
      });

      // 2. Generacion automatica exitosa + omitida por pre-existencia
      clearLogs();
      await equipoService.generarAutomatico(new Date('2026-11-28T10:00:00Z'));
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        requestId: null,
        origen: 'PROGRAMADO',
        resultado: 'EXITO',
        datos: { cantidadMiembros: 11 },
      });

      equipoRepo.obtenerPorSemana.mockResolvedValueOnce({ id: 'existente' });
      clearLogs();
      await equipoService.generarAutomatico(new Date('2026-11-28T10:00:00Z'));
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        resultado: 'OMITIDO',
        datos: { cantidadMiembros: 0 },
      });

      // 3. Rechazado por jugadores insuficientes en scheduler (1 solo evento RECHAZADO sin duplicar)
      const quotesMock: any = {
        recalcularCotizacionesActivas: jest.fn().mockResolvedValue({
          procesados: 0,
          fallidos: 0,
          sinEstadisticas: 0,
          duracionMs: 1,
        }),
      };
      const qrLockOk = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue([{ lock_acquired: true }]),
        release: jest.fn(),
      };
      const dsMock: any = { createQueryRunner: jest.fn(() => qrLockOk) };
      const totwScheduler = new TeamOfTheWeekSchedulerService(
        dsMock,
        equipoService,
        quotesMock,
      );

      jugadorRepo.listarActivos.mockResolvedValueOnce([]);
      clearLogs();
      await totwScheduler.ejecutarGeneracionSemanal();
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        origen: 'PROGRAMADO',
        resultado: 'RECHAZADO',
        datos: { cantidadMiembros: 0 },
      });
      expect(quotesMock.recalcularCotizacionesActivas).toHaveBeenCalledWith({
        origen: 'PROGRAMADO_TOTW',
        usuarioId: null,
      });

      // 4. Omitido por lock en scheduler
      const qrLockNo = {
        connect: jest.fn(),
        query: jest.fn().mockResolvedValue([{ lock_acquired: false }]),
        release: jest.fn(),
      };
      dsMock.createQueryRunner.mockReturnValueOnce(qrLockNo);
      clearLogs();
      await totwScheduler.ejecutarGeneracionSemanal();
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'CALCULO_TEAM_OF_THE_WEEK',
        resultado: 'OMITIDO',
        datos: { cantidadMiembros: 0 },
      });

      // 5. Verificar metadatos @Cron preservados en TeamOfTheWeekSchedulerService
      const descTotw = Object.getOwnPropertyDescriptor(
        TeamOfTheWeekSchedulerService.prototype,
        'ejecutarGeneracionSemanal',
      );
      const cronKeyTotw = Reflect.getMetadataKeys(descTotw?.value).find((k) =>
        String(k).toLowerCase().includes('cron'),
      );
      expect(cronKeyTotw).toBeDefined();
    });
  });

  describe('US4 - Auditoria del Scraper y Proteccion de Proxies', () => {
    const originalProxyUrl = process.env.SCRAPING_PROXY_URL;
    const originalLeagueConfigs = process.env.WHOSCORED_LEAGUE_CONFIGS;

    afterEach(() => {
      if (originalProxyUrl === undefined) {
        delete process.env.SCRAPING_PROXY_URL;
      } else {
        process.env.SCRAPING_PROXY_URL = originalProxyUrl;
      }
      if (originalLeagueConfigs === undefined) {
        delete process.env.WHOSCORED_LEAGUE_CONFIGS;
      } else {
        process.env.WHOSCORED_LEAGUE_CONFIGS = originalLeagueConfigs;
      }
    });

    it('audita SCRAPING_ESTADISTICAS, SCRAPING_LIGA, RECUPERACION_HUERFANA, RECUPERACION_ATASCADA, RECHAZO_CONCURRENCIA y redacta credenciales proxy', async () => {
      process.env.WHOSCORED_LEAGUE_CONFIGS = JSON.stringify([
        { liga: 'PL', regionId: 252, tournamentId: 2, seasonId: 1, stageId: 2 },
      ]);
      process.env.SCRAPING_PROXY_URL =
        'http://demoUser:demoPass@proxy.webshare.io:8080';

      const jugadorLocal = Jugador.crear({
        id: '11111111-1111-1111-1111-111111111111',
        externalId: 901,
        nombre: 'Erling Haaland',
        posicion: 'Delantero',
        equipoId: 'eq-city',
        ligaId: 'lg-pl',
        activo: true,
        whoScoredPlayerId: 'ws-9',
      });

      const playwrightMock: any = {
        extraerEstadisticasLigaPorEquipos: jest.fn().mockResolvedValue({
          jugadores: new Map([
            [
              'ws-9',
              {
                whoScoredId: 'ws-9',
                nombre: 'Erling Haaland',
                partidosJugados: 10,
                minutosJugados: 850,
                goles: 12,
                asistencias: 2,
                rating: 8.1,
              },
            ],
          ]),
          incidencias: [],
        }),
      };

      const ejecucionRepo: any = {
        buscarEnProgreso: jest.fn().mockResolvedValue(null),
        guardar: jest.fn().mockResolvedValue(undefined),
      };
      const estadisticaRepo: any = {
        guardarMuchos: jest.fn().mockResolvedValue(undefined),
      };
      const jugadorRepo: any = {
        buscarConFiltros: jest.fn().mockResolvedValue({
          items: [jugadorLocal],
          total: 1,
        }),
        guardarMuchos: jest.fn().mockResolvedValue(undefined),
      };

      const scrapingService = new ScrapingService(
        playwrightMock,
        new NormalizadorJugadorService(),
        estadisticaRepo,
        ejecucionRepo,
        jugadorRepo,
      );
      (scrapingService as any).config.minJugadoresPorLiga = 0;
      const scrapingController = new ScrapingController(
        scrapingService,
        ejecucionRepo,
      );

      // 1. Ejecucion manual via controller (usuarioId + requestId + SCRAPING_LIGA + SCRAPING_ESTADISTICAS)
      clearLogs();
      await auditContext.ejecutarEnContexto('req-scr-man-1', () =>
        scrapingController.ejecutarScraping({ user: { id: 'admin-scr' } }),
      );

      let logs = parseBusinessLogs();
      const ligaLogs = logs.filter((l) => l.evento === 'SCRAPING_LIGA');
      const globalLogs = logs.filter(
        (l) => l.evento === 'SCRAPING_ESTADISTICAS',
      );
      expect(ligaLogs).toHaveLength(1);
      expect(globalLogs).toHaveLength(1);
      assertBusinessAuditSchema(ligaLogs[0]);
      assertBusinessAuditSchema(globalLogs[0]);

      expect(ligaLogs[0]).toMatchObject({
        level: 30,
        requestId: 'req-scr-man-1',
        resultado: 'EXITO',
        datos: {
          liga: 'PL',
          descubiertos: 1,
          deduplicados: 1,
          asociados: 1,
          descartados: 0,
          tasaAsociacion: 100,
          conteoIncidencias: 0,
          rechazadaPorCobertura: false,
        },
      });
      expect(globalLogs[0]).toMatchObject({
        level: 30,
        requestId: 'req-scr-man-1',
        origen: 'MANUAL',
        usuarioId: 'admin-scr',
        resultado: 'EXITO',
        datos: {
          subtipo: 'EJECUCION_COMPLETA',
          disparador: 'manual',
          ligasProcesadas: ['PL'],
          tasaAsociacion: 100,
          jugadoresProcesados: 1,
          errores: 0,
          estadoFinal: 'EXITOSO',
        },
      });

      // 2. Ejecucion standalone fuera de ciclo HTTP (requestId: null)
      clearLogs();
      await scrapingService.ejecutarPipeline('standalone');
      logs = parseBusinessLogs().filter(
        (l) => l.evento === 'SCRAPING_ESTADISTICAS',
      );
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        requestId: null,
        origen: 'STANDALONE',
        usuarioId: null,
        resultado: 'EXITO',
      });

      // 3. RECUPERACION_HUERFANA en recuperarEjecucionesAtascadas
      const huerfana = EjecucionScraping.iniciar();
      ejecucionRepo.buscarEnProgreso.mockResolvedValueOnce(huerfana);
      clearLogs();
      await scrapingService.recuperarEjecucionesAtascadas();
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        evento: 'SCRAPING_ESTADISTICAS',
        origen: 'SISTEMA',
        resultado: 'EXITO',
        datos: {
          subtipo: 'RECUPERACION_HUERFANA',
          ejecucionId: huerfana.id,
          estadoFinal: 'FALLIDO',
        },
      });

      // Sin huerfanas -> 0 eventos
      ejecucionRepo.buscarEnProgreso.mockResolvedValueOnce(null);
      clearLogs();
      await scrapingService.recuperarEjecucionesAtascadas();
      expect(parseBusinessLogs()).toHaveLength(0);

      // 4. RECHAZO_CONCURRENCIA (ConflictException) emitido una sola vez
      const activaReciente = EjecucionScraping.iniciar();
      ejecucionRepo.buscarEnProgreso.mockResolvedValueOnce(activaReciente);
      clearLogs();
      await expect(scrapingService.ejecutarPipeline('manual')).rejects.toThrow(
        ConflictException,
      );
      logs = parseBusinessLogs();
      expect(logs).toHaveLength(1);
      assertBusinessAuditSchema(logs[0]);
      expect(logs[0]).toMatchObject({
        level: 40,
        evento: 'SCRAPING_ESTADISTICAS',
        resultado: 'RECHAZADO',
        datos: {
          subtipo: 'RECHAZO_CONCURRENCIA',
          estadoFinal: 'RECHAZADO',
        },
      });

      // 5. RECUPERACION_ATASCADA + fallo con credenciales proxy en mensaje -> 0 fugas de demoUser/demoPass
      const atascada = EjecucionScraping.reconstituir({
        id: 'exec-stale-1',
        inicio: new Date(Date.now() - 60 * 60 * 1000),
        fin: null,
        estado: 'en_progreso',
        jugadoresProcesados: 0,
        errores: 0,
        detalle: [],
      });
      ejecucionRepo.buscarEnProgreso.mockResolvedValueOnce(atascada);
      playwrightMock.extraerEstadisticasLigaPorEquipos.mockRejectedValueOnce(
        new Error(
          'Proxy auth error at http://demoUser:demoPass@proxy.webshare.io:8080',
        ),
      );
      playwrightMock.extraerEstadisticasLiga = jest
        .fn()
        .mockRejectedValueOnce(
          new Error(
            'Tunnel failed via http://demoUser:demoPass@proxy.webshare.io:8080',
          ),
        );

      clearLogs();
      await expect(
        scrapingService.ejecutarPipeline('programado'),
      ).rejects.toThrow();

      logs = parseBusinessLogs();
      const staleLogs = logs.filter(
        (l) =>
          l.evento === 'SCRAPING_ESTADISTICAS' &&
          l.datos.subtipo === 'RECUPERACION_ATASCADA',
      );
      const failLogs = logs.filter(
        (l) =>
          l.evento === 'SCRAPING_ESTADISTICAS' &&
          l.datos.subtipo === 'EJECUCION_COMPLETA',
      );
      expect(staleLogs).toHaveLength(1);
      expect(failLogs).toHaveLength(1);
      assertBusinessAuditSchema(staleLogs[0]);
      assertBusinessAuditSchema(failLogs[0]);
      expect(failLogs[0].resultado).toBe('FALLIDO');
      expect(failLogs[0].motivo).toContain(
        'http://[REDACTED]@proxy.webshare.io:8080',
      );

      // Verificacion directa de sanitizacion de proxy en WhoScoredPlaywrightService
      const pwService = new WhoScoredPlaywrightService();
      const logSpy = jest
        .spyOn((pwService as any).logger, 'log')
        .mockImplementation(() => undefined);
      const warnSpy = jest
        .spyOn((pwService as any).logger, 'warn')
        .mockImplementation(() => undefined);
      (pwService as any).browser = {
        isConnected: () => false,
        close: jest
          .fn()
          .mockRejectedValue(
            new Error(
              'Close error http://demoUser:demoPass@proxy.webshare.io:8080',
            ),
          ),
      };
      await pwService.cerrarNavegador();

      const allCaptured = [
        ...capturedLines,
        ...logSpy.mock.calls.flat().map(String),
        ...warnSpy.mock.calls.flat().map(String),
      ].join('\n');
      expect(allCaptured).not.toContain('demoUser');
      expect(allCaptured).not.toContain('demoPass');
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
