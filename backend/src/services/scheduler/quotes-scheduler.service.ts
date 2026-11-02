import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { QuotesService } from '../quotes.service';

@Injectable()
export class QuotesSchedulerService {
  private readonly logger = new Logger(QuotesSchedulerService.name);
  private static readonly ADVISORY_LOCK_ID = 20261101; // ID determinista para pg_try_advisory_lock

  constructor(
    private readonly dataSource: DataSource,
    private readonly quotesService: QuotesService,
  ) {}

  @Cron('0 0 * * 0') // Cada domingo a las 00:00
  public async ejecutarRecalculoSemanal(): Promise<{
    ejecutado: boolean;
    procesados?: number;
    fallidos?: number;
    duracionMs?: number;
  }> {
    this.logger.log('Intentando adquirir lock para recálculo semanal de cotizaciones...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let lockAdquirido = false;
    try {
      const res = await queryRunner.query(
        `SELECT pg_try_advisory_lock($1) AS lock_acquired`,
        [QuotesSchedulerService.ADVISORY_LOCK_ID],
      );

      lockAdquirido = res?.[0]?.lock_acquired === true;
      if (!lockAdquirido) {
        this.logger.warn(
          'Otra instancia se encuentra ejecutando el recálculo semanal. Omitiendo ejecución concurrente.',
        );
        return { ejecutado: false };
      }

      this.logger.log('Lock adquirido. Iniciando recálculo masivo semanal...');
      const resultado = await this.quotesService.recalcularCotizacionesActivas();
      this.logger.log(
        `Recálculo semanal finalizado exitosamente. Procesados: ${resultado.procesados}, Fallidos: ${resultado.fallidos}, Duración: ${resultado.duracionMs} ms`,
      );
      return { ejecutado: true, ...resultado };
    } catch (error) {
      this.logger.error(
        `Error crítico durante el recálculo semanal de cotizaciones: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      if (lockAdquirido) {
        try {
          await queryRunner.query(`SELECT pg_advisory_unlock($1)`, [
            QuotesSchedulerService.ADVISORY_LOCK_ID,
          ]);
          this.logger.log('Lock de recálculo semanal liberado.');
        } catch (unlockErr) {
          this.logger.warn(`Error al liberar lock de recálculo: ${(unlockErr as Error).message}`);
        }
      }
      await queryRunner.release();
    }
  }
}
