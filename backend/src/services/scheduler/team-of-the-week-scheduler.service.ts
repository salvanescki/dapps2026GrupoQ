import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EquipoSemanalService } from '../equipo-semanal.service';
import { QuotesService } from '../quotes.service';
import {
  EquipoSemanal,
  obtenerAnoYSemanaIso,
} from '../../domain/equipo-semanal.entity';
import { AppMetricsService } from '../../observability/services/app-metrics.service';
import { AuditAspectRegistry } from '../../observability/aspects/audit-aspect.registry';
import { AuditarOperacion } from '../../observability/aspects/auditar-operacion.decorator';

@Injectable()
export class TeamOfTheWeekSchedulerService {
  private readonly logger = new Logger(TeamOfTheWeekSchedulerService.name);
  private static readonly ADVISORY_LOCK_ID = 20261102; // ID determinista único para Team of the Week

  constructor(
    private readonly dataSource: DataSource,
    private readonly equipoSemanalService: EquipoSemanalService,
    private readonly quotesService: QuotesService,
    @Optional() private readonly metricsService?: AppMetricsService,
  ) {}

  @AuditarOperacion({
    evento: 'CALCULO_TEAM_OF_THE_WEEK',
    origen: 'PROGRAMADO',
    debeEmitir: (_res, _args, meta) => !meta.delegadoAGenerarAutomatico,
    extraerResultadoExito: (_res, _args, meta) => {
      const periodo = obtenerAnoYSemanaIso(new Date());
      return {
        resultado: 'OMITIDO',
        motivo:
          (meta.motivoOmision as string) ??
          'Generacion semanal omitida por condicion previa',
        datos: {
          ano: periodo.ano,
          semanaIso: periodo.semanaIso,
          estrategiaId: null,
          estrategiaVersion: null,
          cantidadMiembros: 0,
        },
      };
    },
    extraerDatosError: () => {
      const periodo = obtenerAnoYSemanaIso(new Date());
      return {
        ano: periodo.ano,
        semanaIso: periodo.semanaIso,
        estrategiaId: null,
        estrategiaVersion: null,
        cantidadMiembros: 0,
      };
    },
  })
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
    const start = Date.now();
    try {
      const res = await queryRunner.query(
        `SELECT pg_try_advisory_lock($1) AS lock_acquired`,
        [TeamOfTheWeekSchedulerService.ADVISORY_LOCK_ID],
      );

      lockAdquirido = res?.[0]?.lock_acquired === true;
      if (!lockAdquirido) {
        AuditAspectRegistry.getContext()?.registrarMetadatos({
          motivoOmision:
            'Otra instancia posee el advisory lock de Team of the Week',
        });
        this.logger.warn(
          'Otra instancia se encuentra ejecutando la generación del Equipo de la Semana. Omitiendo ejecución concurrente.',
        );
        return { ejecutado: false };
      }

      if (await this.equipoSemanalService.existeEquipoSemanaActual()) {
        AuditAspectRegistry.getContext()?.registrarMetadatos({
          motivoOmision:
            'Ya existe un Equipo de la Semana para la semana ISO en curso',
        });
        this.logger.log(
          'Ya existe un Equipo de la Semana para la semana ISO en curso. Se omite la ejecución automática.',
        );
        return { ejecutado: false };
      }

      this.logger.log(
        'Lock adquirido. Recalculando cotizaciones con las estadísticas más recientes...',
      );
      await this.quotesService.recalcularCotizacionesActivas({
        origen: 'PROGRAMADO_TOTW',
        usuarioId: null,
      });

      AuditAspectRegistry.getContext()?.registrarMetadatos({
        delegadoAGenerarAutomatico: true,
      });
      const resultado = await this.equipoSemanalService.generarAutomatico();
      if (!resultado.generado) {
        return { ejecutado: false };
      }

      const duracionSegundos = (Date.now() - start) / 1000;
      this.metricsService?.recordTotwGeneration('exito');
      this.metricsService?.recordTotwDuration(duracionSegundos);

      this.logger.log(
        `Generación automática del Equipo de la Semana completada con éxito para la semana ${resultado.equipo.ano}-W${resultado.equipo.semanaIso}.`,
      );
      return { ejecutado: true, equipo: resultado.equipo };
    } catch (error) {
      this.metricsService?.recordTotwGeneration('fallo');
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

