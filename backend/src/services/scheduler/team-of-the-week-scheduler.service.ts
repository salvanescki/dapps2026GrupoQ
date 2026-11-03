import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EquipoSemanalService } from '../equipo-semanal.service';
import { QuotesService } from '../quotes.service';
import { EquipoSemanal } from '../../domain/equipo-semanal.entity';

@Injectable()
export class TeamOfTheWeekSchedulerService {
  private readonly logger = new Logger(TeamOfTheWeekSchedulerService.name);
  private static readonly ADVISORY_LOCK_ID = 20261102; // ID determinista único para Team of the Week

  constructor(
    private readonly dataSource: DataSource,
    private readonly equipoSemanalService: EquipoSemanalService,
    private readonly quotesService: QuotesService,
  ) {}

  @Cron(process.env.TEAM_OF_THE_WEEK_CRON || '0 1 * * 1') // Cada lunes a las 01:00 UTC
  public async ejecutarGeneracionSemanal(): Promise<{
    ejecutado: boolean;
    equipo?: EquipoSemanal;
  }> {
    this.logger.log(
      'Intentando adquirir lock para generación automática del Equipo de la Semana...',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let lockAdquirido = false;
    try {
      const res = await queryRunner.query(
        `SELECT pg_try_advisory_lock($1) AS lock_acquired`,
        [TeamOfTheWeekSchedulerService.ADVISORY_LOCK_ID],
      );

      lockAdquirido = res?.[0]?.lock_acquired === true;
      if (!lockAdquirido) {
        this.logger.warn(
          'Otra instancia se encuentra ejecutando la generación del Equipo de la Semana. Omitiendo ejecución concurrente.',
        );
        return { ejecutado: false };
      }

      if (await this.equipoSemanalService.existeEquipoSemanaActual()) {
        this.logger.log(
          'Ya existe un Equipo de la Semana para la semana ISO en curso. Se omite la ejecución automática.',
        );
        return { ejecutado: false };
      }

      this.logger.log(
        'Lock adquirido. Recalculando cotizaciones con las estadísticas más recientes...',
      );
      await this.quotesService.recalcularCotizacionesActivas();

      const resultado = await this.equipoSemanalService.generarAutomatico();
      if (!resultado.generado) {
        return { ejecutado: false };
      }

      this.logger.log(
        `Generación automática del Equipo de la Semana completada con éxito para la semana ${resultado.equipo.ano}-W${resultado.equipo.semanaIso}.`,
      );
      return { ejecutado: true, equipo: resultado.equipo };
    } catch (error) {
      this.logger.error(
        `Error crítico durante la generación del Equipo de la Semana: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      if (lockAdquirido) {
        try {
          await queryRunner.query(`SELECT pg_advisory_unlock($1)`, [
            TeamOfTheWeekSchedulerService.ADVISORY_LOCK_ID,
          ]);
          this.logger.log('Lock de Equipo de la Semana liberado.');
        } catch (unlockErr) {
          this.logger.warn(
            `Error al liberar lock de Equipo de la Semana: ${(unlockErr as Error).message}`,
          );
        }
      }
      await queryRunner.release();
    }
  }
}

