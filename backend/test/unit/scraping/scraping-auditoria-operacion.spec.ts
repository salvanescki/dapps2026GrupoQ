import { ScrapingController } from '../../../src/scraping/controllers/scraping.controller';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';
import { IEjecucionScrapingRepository } from '../../../src/scraping/domain/ejecucion-scraping.repository.interface';
import { EjecucionScraping } from '../../../src/scraping/domain/ejecucion-scraping.entity';
import { ConflictException } from '@nestjs/common';

describe('Scraping - Auditoría, Operación y Contratos HTTP (Bloque 8)', () => {
  let controller: ScrapingController;
  let mockScrapingService: Partial<ScrapingService>;
  let mockEjecucionRepo: Partial<IEjecucionScrapingRepository>;

  beforeEach(() => {
    mockScrapingService = {
      ejecutarPipeline: jest.fn(),
      obtenerEstadisticasJugador: jest.fn(),
    };

    mockEjecucionRepo = {
      buscarEnProgreso: jest.fn(),
      buscarPorId: jest.fn(),
      listarPaginado: jest.fn(),
      guardar: jest.fn(),
    };

    controller = new ScrapingController(
      mockScrapingService as ScrapingService,
      mockEjecucionRepo as IEjecucionScrapingRepository,
    );
  });

  describe('Auditoría estructurada en EjecucionScraping', () => {
    it('debe registrar métricas estructuradas por liga en el detalle JSONB', () => {
      const ejecucion = EjecucionScraping.iniciar();

      ejecucion.registrarDetalle({
        liga: 'PL',
        descubiertos: 420,
        deduplicados: 410,
        asociados: 390,
        descartados: 20,
        timestamp: new Date(),
      });

      expect(ejecucion.detalle.length).toBe(1);
      const metricaPL = ejecucion.detalle[0] as any;
      expect(metricaPL.liga).toBe('PL');
      expect(metricaPL.descubiertos).toBe(420);
      expect(metricaPL.asociados).toBe(390);
      expect(metricaPL.descartados).toBe(20);
    });

    it('debe registrar incidentes y errores conservando el estado general', () => {
      const ejecucion = EjecucionScraping.iniciar();
      ejecucion.registrarError({
        liga: 'LL',
        jugadorNombre: 'Test Player',
        mensaje: 'No coincide en BD local',
        timestamp: new Date(),
      });

      expect(ejecucion.errores).toBe(1);
      expect(ejecucion.detalle.length).toBe(1);
    });
  });

  describe('Controlador HTTP ScrapingController (Contrato REST)', () => {
    it('POST /scraping/ejecutar debe responder con código 202 y metadatos de inicio', async () => {
      const mockEjecucion = EjecucionScraping.iniciar();
      (mockEjecucionRepo.buscarEnProgreso as jest.Mock).mockResolvedValue(mockEjecucion);
      (mockScrapingService.ejecutarPipeline as jest.Mock).mockResolvedValue(mockEjecucion);

      const respuesta = await controller.ejecutarScraping();

      expect(respuesta.ejecucionId).toBe(mockEjecucion.id);
      expect(respuesta.mensaje).toBe('Proceso de scraping iniciado correctamente.');
      expect(respuesta.inicio).toBeInstanceOf(Date);
    });

    it('POST /scraping/ejecutar debe propagar ConflictException (HTTP 409) ante ejecución concurrente', async () => {
      (mockScrapingService.ejecutarPipeline as jest.Mock).mockRejectedValue(
        new ConflictException('Ya existe una ejecución de scraping en progreso.'),
      );

      await expect(controller.ejecutarScraping()).rejects.toThrow(ConflictException);
    });
  });
});
