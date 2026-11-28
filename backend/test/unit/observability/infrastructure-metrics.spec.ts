import { FootballDataClient } from '../../../src/services/clients/football-data.client';
import { TeamOfTheWeekSchedulerService } from '../../../src/services/scheduler/team-of-the-week-scheduler.service';
import { MarketplaceCacheService } from '../../../src/services/marketplace-cache.service';
import { AuthService } from '../../../src/services/auth.service';
import { AppMetricsService } from '../../../src/observability/services/app-metrics.service';
import { UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';

describe('Infrastructure, Cache, TOTW & Auth Metrics (Unit Tests)', () => {
  let mockMetricsService: jest.Mocked<AppMetricsService>;

  beforeEach(() => {
    mockMetricsService = {
      recordFootballDataRequest: jest.fn(),
      setFootballDataRateLimitRemaining: jest.fn(),
      recordTotwGeneration: jest.fn(),
      recordTotwDuration: jest.fn(),
      recordCacheRequest: jest.fn(),
      recordCacheFallback: jest.fn(),
      recordAuthAttempt: jest.fn(),
      recordPasswordHashingDuration: jest.fn(),
    } as any;
  });

  describe('FootballDataClient', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('debe registrar peticiones y header de rate limit', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'x-requests-available-minute': '9' }),
        json: jest.fn().mockResolvedValue({ teams: [] }),
      } as any);

      const client = new FootballDataClient(mockMetricsService);
      await client.obtenerEquiposYJugadoresPorLiga('PL');

      expect(mockMetricsService.setFootballDataRateLimitRemaining).toHaveBeenCalledWith(9);
      expect(mockMetricsService.recordFootballDataRequest).toHaveBeenCalledWith('/competitions/PL/teams', 200);
    });
  });

  describe('TeamOfTheWeekSchedulerService', () => {
    it('debe registrar métricas al generar exitosamente el TOTW', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest
          .fn()
          .mockResolvedValueOnce([{ lock_acquired: true }])
          .mockResolvedValueOnce(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };

      const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      } as any;

      const mockEquipoSemanalService = {
        existeEquipoSemanaActual: jest.fn().mockResolvedValue(false),
        generarAutomatico: jest.fn().mockResolvedValue({
          generado: true,
          equipo: { ano: 2026, semanaIso: 45 },
        }),
      } as any;

      const mockQuotesService = {
        recalcularCotizacionesActivas: jest.fn().mockResolvedValue({}),
      } as any;

      const scheduler = new TeamOfTheWeekSchedulerService(
        mockDataSource,
        mockEquipoSemanalService,
        mockQuotesService,
        mockMetricsService,
      );

      const res = await scheduler.ejecutarGeneracionSemanal();

      expect(res.ejecutado).toBe(true);
      expect(mockMetricsService.recordTotwGeneration).toHaveBeenCalledWith('exito');
      expect(mockMetricsService.recordTotwDuration).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('MarketplaceCacheService (BaseRedisCacheService)', () => {
    it('debe registrar hits y misses en operaciones de caché', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(JSON.stringify({ test: 1 })),
        setex: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
      } as unknown as Redis;

      const cacheService = new MarketplaceCacheService(mockRedis, mockMetricsService);

      await cacheService.obtenerRanking('clave-1');
      expect(mockMetricsService.recordCacheRequest).toHaveBeenCalledWith('marketplace', 'miss');

      await cacheService.obtenerRanking('clave-1');
      expect(mockMetricsService.recordCacheRequest).toHaveBeenCalledWith('marketplace', 'hit');
    });

    it('debe registrar fallback cuando Redis no está disponible o falla', async () => {
      const mockRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis disconnected')),
        on: jest.fn(),
      } as unknown as Redis;

      const cacheService = new MarketplaceCacheService(mockRedis, mockMetricsService);
      const res = await cacheService.obtenerRanking('clave-1');

      expect(res).toBeNull();
      expect(mockMetricsService.recordCacheFallback).toHaveBeenCalledWith('marketplace');
    });
  });

  describe('AuthService', () => {
    it('debe registrar intentos fallidos y exitosos de autenticación y latencia de hashing', async () => {
      const mockUsuarioRepo = {
        buscarPorCorreo: jest.fn().mockResolvedValueOnce(null),
      } as any;
      const mockJwtService = { sign: jest.fn().mockReturnValue('mock-token') } as any;

      const authService = new AuthService(mockUsuarioRepo, mockJwtService, mockMetricsService);

      await expect(authService.login({ correo: 'inexistente@test.com', contrasena: 'Pass123!' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockMetricsService.recordAuthAttempt).toHaveBeenCalledWith('fallo');

      const mockUsuarioValido = {
        id: 'u-1',
        nombre: 'Valido',
        correo: 'valido@test.com',
        rol: 'USUARIO',
        saldo: { aNumero: () => 1000 },
        creadoEn: new Date(),
        verificarContrasena: jest.fn().mockResolvedValue(true),
      };
      mockUsuarioRepo.buscarPorCorreo.mockResolvedValueOnce(mockUsuarioValido);

      const loginRes = await authService.login({ correo: 'valido@test.com', contrasena: 'Pass123!' });
      expect(loginRes.tokenDeAcceso).toBe('mock-token');
      expect(mockMetricsService.recordAuthAttempt).toHaveBeenCalledWith('exito');
      expect(mockMetricsService.recordPasswordHashingDuration).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
