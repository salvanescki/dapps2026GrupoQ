import { NestFactory } from '@nestjs/core';
import { bootstrapScraper } from '../../../src/run-scraper';
import { ScrapingService } from '../../../src/scraping/services/scraping.service';

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn(),
  },
}));

describe('RunScraper Standalone Script (Unit Tests)', () => {
  let mockAppContext: any;
  let mockScrapingService: any;

  beforeEach(() => {
    mockScrapingService = {
      ejecutarPipeline: jest.fn().mockResolvedValue(undefined),
    };

    mockAppContext = {
      get: jest.fn().mockImplementation((token) => {
        if (token === ScrapingService) return mockScrapingService;
        return null;
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.createApplicationContext as jest.Mock).mockResolvedValue(
      mockAppContext,
    );
  });

  it('debe ejecutar el pipeline y retornar código 0 al finalizar exitosamente', async () => {
    const exitCode = await bootstrapScraper(false);

    expect(NestFactory.createApplicationContext).toHaveBeenCalled();
    expect(mockScrapingService.ejecutarPipeline).toHaveBeenCalledWith('programado');
    expect(mockAppContext.close).toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it('debe capturar errores del pipeline y retornar código 1 ante excepciones', async () => {
    mockScrapingService.ejecutarPipeline.mockRejectedValueOnce(
      new Error('Fallo crítico en conexión'),
    );

    const exitCode = await bootstrapScraper(false);

    expect(exitCode).toBe(1);
  });
});
