import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapingService } from './scraping/services/scraping.service';
import { Logger } from '@nestjs/common';

export async function bootstrapScraper(exitProcess = true): Promise<number> {
  const logger = new Logger('RunScraper');
  logger.log('Iniciando contexto de aplicación standalone para WhoScored scraper...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    const scrapingService = app.get(ScrapingService);
    await scrapingService.ejecutarPipeline('programado');

    await app.close();
    logger.log('Scraper standalone finalizado exitosamente.');

    if (exitProcess) {
      process.exit(0);
    }
    return 0;
  } catch (error) {
    logger.error(
      `Error durante ejecución standalone: ${(error as Error).message}`,
      (error as Error).stack,
    );
    if (exitProcess) {
      process.exit(1);
    }
    return 1;
  }
}

if (require.main === module) {
  bootstrapScraper(true);
}
