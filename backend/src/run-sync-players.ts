import { NestFactory } from '@nestjs/core';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { SincronizacionJugadoresService } from './services/sincronizacion-jugadores.service';
import { Logger } from '@nestjs/common';

export async function bootstrapSyncPlayers(exitProcess = true): Promise<number> {
  const logger = new Logger('RunSyncPlayers');
  logger.log('Iniciando contexto de aplicación standalone para sincronización con football-data.org...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      bufferLogs: true,
      logger: ['log', 'error', 'warn'],
    });

    if (typeof app.useLogger === 'function') {
      try {
        const pinoLogger = app.get(PinoNestLogger, { strict: false });
        if (pinoLogger) {
          app.useLogger(pinoLogger);
        }
      } catch {
        // Fallback silencioso si LoggerModule no esta registrado
      }
    }

    const sincronizacionService = app.get(SincronizacionJugadoresService);
    logger.log('Disparando sincronización de ligas, equipos y planteles...');
    const resultado = await sincronizacionService.sincronizarLigasYPlanteles();

    logger.log(
      `Sincronización completada exitosamente. Ligas: ${resultado.totalLigas}, Equipos: ${resultado.totalEquipos}, Jugadores procesados: ${resultado.totalJugadores}`,
    );

    await app.close();
    logger.log('Contexto standalone cerrado.');

    if (exitProcess) {
      process.exit(0);
    }
    return 0;
  } catch (error) {
    logger.error(
      `Error durante sincronización standalone: ${(error as Error).message}`,
      (error as Error).stack,
    );
    if (exitProcess) {
      process.exit(1);
    }
    return 1;
  }
}

if (require.main === module) {
  void bootstrapSyncPlayers(true);
}
