import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditAspectRegistry } from '../../../src/observability/aspects/audit-aspect.registry';
import { AuditarOperacion } from '../../../src/observability/aspects/auditar-operacion.decorator';
import { AuditContextService } from '../../../src/observability/services/audit-context.service';
import { AuditLoggerService } from '../../../src/observability/services/audit-logger.service';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('@AuditarOperacion & AuditAspectRegistry', () => {
  let registrarEventoNegocio: jest.Mock;
  let contextService: AuditContextService;

  beforeEach(() => {
    AuditAspectRegistry.clear();
    registrarEventoNegocio = jest.fn();
    contextService = new AuditContextService();
  });

  afterEach(() => {
    AuditAspectRegistry.clear();
  });

  class DemoService {
    @AuditarOperacion({
      evento: 'TRANSACCION_TOKENS',
      origen: 'HTTP',
      extraerUsuarioId: ([usuarioId]) => usuarioId ?? null,
      extraerResultadoExito: (res, [usuarioId], metadatos) => ({
        resultado: 'EXITO',
        datos: {
          compradorId: usuarioId,
          vendedorId: metadatos.vendedorId ?? null,
          total: res.total,
        },
      }),
      extraerDatosError: (_err, [usuarioId], metadatos) => ({
        compradorId: usuarioId,
        vendedorId: metadatos.vendedorId ?? null,
      }),
    })
    async comprar(usuarioId: string, modo: 'ok' | 'regla' | 'http400' | 'http500' | 'err') {
      AuditAspectRegistry.getContext()?.registrarMetadatos({
        vendedorId: 'seller-1',
      });
      if (modo === 'regla') {
        throw new ReglaDeNegocioException('Saldo insuficiente');
      }
      if (modo === 'http400') {
        throw new BadRequestException(['Slippage excedido']);
      }
      if (modo === 'http500') {
        throw new InternalServerErrorException('Fallo interno');
      }
      if (modo === 'err') {
        throw new Error('Error con Bearer secreto123');
      }
      return { total: 250 };
    }

    @AuditarOperacion({
      evento: 'CALCULO_COTIZACIONES',
      origen: 'PROGRAMADO',
      debeEmitir: (res) => !res.ejecutado,
      extraerResultadoExito: () => ({
        resultado: 'OMITIDO',
        motivo: 'Lock no adquirido',
        datos: {
          estrategiaId: null,
          estrategiaVersion: null,
          procesados: 0,
          sinEstadisticas: 0,
          fallidos: 0,
        },
      }),
    })
    @Cron('0 0 * * 0')
    async schedulerRecalculo(delegarError: boolean, omitir: boolean) {
      if (omitir) {
        return { ejecutado: false };
      }
      if (delegarError) {
        await this.servicioInternoQueFalla();
      }
      return { ejecutado: true };
    }

    @AuditarOperacion({
      evento: 'CALCULO_COTIZACIONES',
      origen: 'PROGRAMADO',
      extraerResultadoExito: () => ({ resultado: 'EXITO', datos: {} }),
    })
    async servicioInternoQueFalla() {
      throw new Error('Error dentro del servicio interno');
    }

    @AuditarOperacion({
      evento: 'SCRAPING_ESTADISTICAS',
      origen: 'SISTEMA',
      debeEmitirError: () => false,
      extraerResultadoExito: () => ({ resultado: 'EXITO', datos: {} }),
    })
    async operacionConSupresionDeError() {
      throw new ConflictException('Ya en curso');
    }

    @AuditarOperacion({
      evento: 'CALCULO_TEAM_OF_THE_WEEK',
      origen: () => 'MANUAL',
      extraerResultadoExito: () => {
        throw new Error('Fallo interno del extractor');
      },
    })
    metodoSincronoConExtractorRoto(): string {
      return 'resultado-intacto';
    }
  }

  it('opera como no-op seguro cuando AuditAspectRegistry no esta inicializado', async () => {
    const service = new DemoService();
    const res = await service.comprar('u-1', 'ok');

    expect(res).toEqual({ total: 250 });
    expect(registrarEventoNegocio).not.toHaveBeenCalled();
  });

  it('registra EXITO con metadatos contextuales, tiempoEjecucion >= 0 y sin mutar el retorno', async () => {
    AuditAspectRegistry.registerLogger({
      registrarEventoNegocio,
    } as unknown as AuditLoggerService);
    AuditAspectRegistry.registerContext(contextService);

    const service = new DemoService();
    const res = await service.comprar('buyer-1', 'ok');

    expect(res).toEqual({ total: 250 });
    expect(registrarEventoNegocio).toHaveBeenCalledTimes(1);
    expect(registrarEventoNegocio.mock.calls[0][0]).toMatchObject({
      evento: 'TRANSACCION_TOKENS',
      origen: 'HTTP',
      usuarioId: 'buyer-1',
      resultado: 'EXITO',
      motivo: null,
      datos: {
        compradorId: 'buyer-1',
        vendedorId: 'seller-1',
        total: 250,
      },
    });
    expect(
      registrarEventoNegocio.mock.calls[0][0].tiempoEjecucion,
    ).toBeGreaterThanOrEqual(0);
  });

  it('clasifica ReglaDeNegocioException y HttpException 4xx como RECHAZADO y 5xx/Error como FALLIDO', async () => {
    AuditAspectRegistry.registerLogger({
      registrarEventoNegocio,
    } as unknown as AuditLoggerService);
    AuditAspectRegistry.registerContext(contextService);

    const service = new DemoService();

    await expect(service.comprar('buyer-1', 'regla')).rejects.toThrow(
      ReglaDeNegocioException,
    );
    expect(registrarEventoNegocio.mock.calls[0][0]).toMatchObject({
      resultado: 'RECHAZADO',
      motivo: 'Saldo insuficiente',
      datos: { compradorId: 'buyer-1', vendedorId: 'seller-1' },
    });

    await expect(service.comprar('buyer-1', 'http400')).rejects.toThrow(
      BadRequestException,
    );
    expect(registrarEventoNegocio.mock.calls[1][0]).toMatchObject({
      resultado: 'RECHAZADO',
      motivo: 'Slippage excedido',
    });

    await expect(service.comprar('buyer-1', 'http500')).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(registrarEventoNegocio.mock.calls[2][0]).toMatchObject({
      resultado: 'FALLIDO',
      motivo: 'Fallo interno',
    });

    await expect(service.comprar('buyer-1', 'err')).rejects.toThrow(Error);
    expect(registrarEventoNegocio.mock.calls[3][0]).toMatchObject({
      resultado: 'FALLIDO',
      motivo: 'Error con Bearer [REDACTED]',
    });
  });

  it('respeta debeEmitir, debeEmitirError y deduplica errores anidados del mismo evento', async () => {
    AuditAspectRegistry.registerLogger({
      registrarEventoNegocio,
    } as unknown as AuditLoggerService);
    AuditAspectRegistry.registerContext(contextService);

    const service = new DemoService();

    // debeEmitir: false cuando ejecutado === true
    await service.schedulerRecalculo(false, false);
    expect(registrarEventoNegocio).not.toHaveBeenCalled();

    // debeEmitir: true cuando ejecutado === false (OMITIDO)
    await service.schedulerRecalculo(false, true);
    expect(registrarEventoNegocio).toHaveBeenCalledTimes(1);
    expect(registrarEventoNegocio.mock.calls[0][0].resultado).toBe('OMITIDO');

    registrarEventoNegocio.mockClear();

    // Error propagado desde servicioInternoQueFalla con mismo evento -> emite solo 1 vez
    await expect(service.schedulerRecalculo(true, false)).rejects.toThrow(
      'Error dentro del servicio interno',
    );
    expect(registrarEventoNegocio).toHaveBeenCalledTimes(1);
    expect(registrarEventoNegocio.mock.calls[0][0].resultado).toBe('FALLIDO');

    registrarEventoNegocio.mockClear();

    // debeEmitirError: () => false suprime emision pero re-lanza error
    await expect(service.operacionConSupresionDeError()).rejects.toThrow(
      ConflictException,
    );
    expect(registrarEventoNegocio).not.toHaveBeenCalled();
  });

  it('preserva metadatos Reflect del decorador @Cron en el metodo envuelto', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      DemoService.prototype,
      'schedulerRecalculo',
    );
    const keys = Reflect.getMetadataKeys(descriptor?.value);

    expect(keys.length).toBeGreaterThan(0);
    const cronMetadata = keys.find((k) =>
      String(k).toLowerCase().includes('cron'),
    );
    expect(cronMetadata).toBeDefined();
    expect(Reflect.getMetadata(cronMetadata!, descriptor?.value)).toMatchObject(
      { cronTime: '0 0 * * 0' },
    );
  });

  it('mantiene aislamiento fail-safe si el extractor de resultados falla en un metodo sincrono', () => {
    AuditAspectRegistry.registerLogger({
      registrarEventoNegocio,
    } as unknown as AuditLoggerService);

    const service = new DemoService();
    expect(service.metodoSincronoConExtractorRoto()).toBe('resultado-intacto');
    expect(registrarEventoNegocio).not.toHaveBeenCalled();
  });
});
