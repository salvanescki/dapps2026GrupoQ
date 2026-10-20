import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { WhoScoredPlaywrightService } from './whoscored-playwright.service';
import { NormalizadorJugadorService } from './normalizador-jugador.service';
import {
  IEstadisticaJugadorRepository,
  I_ESTADISTICA_JUGADOR_REPOSITORY,
} from '../domain/estadistica-jugador.repository.interface';
import {
  IEjecucionScrapingRepository,
  I_EJECUCION_SCRAPING_REPOSITORY,
} from '../domain/ejecucion-scraping.repository.interface';
import {
  IJugadorRepository,
  I_JUGADOR_REPOSITORY,
} from '../../domain/jugador.repository.interface';
import { CriterioFiltroJugador } from '../../domain/jugador.entity';
import { EstadisticaJugador } from '../domain/estadistica-jugador.entity';
import {
  EjecucionScraping,
  ErrorScrapingDetalle,
} from '../domain/ejecucion-scraping.entity';
import { getScrapingConfig, ScrapingConfig } from '../../config/scraping.config';

export interface EstadisticasJugadorResponse {
  jugador: {
    id: string;
    nombre: string;
    posicion: string;
    dorsal: number | null;
  };
  temporada: string;
  liga: string;
  rol: 'portero' | 'jugador_campo';
  estadisticas: Record<string, any>;
  fechaActualizacion: Date;
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private readonly config: ScrapingConfig;

  constructor(
    private readonly playwrightService: WhoScoredPlaywrightService,
    private readonly normalizador: NormalizadorJugadorService,
    @Inject(I_ESTADISTICA_JUGADOR_REPOSITORY)
    private readonly estadisticaRepo: IEstadisticaJugadorRepository,
    @Inject(I_EJECUCION_SCRAPING_REPOSITORY)
    private readonly ejecucionRepo: IEjecucionScrapingRepository,
    @Inject(I_JUGADOR_REPOSITORY)
    private readonly jugadorRepo: IJugadorRepository,
  ) {
    this.config = getScrapingConfig();
  }

  public async ejecutarPipeline(trigger = 'manual'): Promise<EjecucionScraping> {
    const enProgreso = await this.ejecucionRepo.buscarEnProgreso();
    if (enProgreso) {
      throw new ConflictException(
        'Ya existe una ejecución de scraping en progreso.',
      );
    }

    const ejecucion = EjecucionScraping.iniciar();
    await this.ejecucionRepo.guardar(ejecucion);
    this.logger.log(`Iniciando corrida de scraping (${trigger}): ${ejecucion.id}`);

    try {
      for (const leagueConfig of this.config.leagueConfigs) {
        this.logger.log(`Procesando liga ${leagueConfig.liga}...`);

        // Obtener jugadores locales para cotejar
        const criterio = new CriterioFiltroJugador({
          ligaCodigo: leagueConfig.liga,
          limite: 1000,
        });
        const busquedaLocal = await this.jugadorRepo.buscarConFiltros(criterio);
        const jugadoresLocales = busquedaLocal.items;

        // Extraer datos WhoScored
        const rawStatsMap = await this.playwrightService.extraerEstadisticasLiga(
          leagueConfig,
        );

        const estadisticasAGuardar: EstadisticaJugador[] = [];

        for (const [rawId, raw] of rawStatsMap.entries()) {
          const matchLocal = this.normalizador.buscarCoincidencia(
            raw.nombre,
            raw.equipoNombre,
            leagueConfig.liga,
            jugadoresLocales,
          );

          if (!matchLocal) {
            const errorDetalle: ErrorScrapingDetalle = {
              liga: leagueConfig.liga,
              jugadorNombre: raw.nombre,
              mensaje: `No se encontró jugador en la base de datos local para nombre='${raw.nombre}' equipo='${raw.equipoNombre || 'N/A'}'`,
              timestamp: new Date(),
            };
            ejecucion.registrarError(errorDetalle);
            continue;
          }

          try {
            const entidad = EstadisticaJugador.crear({
              jugadorId: matchLocal.id,
              temporada: this.config.seasonLabel,
              liga: leagueConfig.liga,
              fuente: 'whoscored',
              fechaActualizacion: new Date(),
              partidosJugados: raw.partidosJugados ?? 0,
              minutosJugados: raw.minutosJugados ?? 0,
              goles: raw.goles ?? 0,
              asistencias: raw.asistencias ?? 0,
              tirosPorPartido: raw.tirosPorPartido ?? null,
              precisionPase: raw.precisionPase ?? null,
              duelosAereosGanadosPorPartido: raw.duelosAereosGanadosPorPartido ?? null,
              rating: raw.rating ?? null,
              tarjetasAmarillas: raw.tarjetasAmarillas ?? 0,
              tarjetasRojas: raw.tarjetasRojas ?? 0,
              regatesCompletadosPorPartido: raw.regatesCompletadosPorPartido ?? null,
              pasesClavePorPartido: raw.pasesClavePorPartido ?? null,
              xgPorPartido: raw.xgPorPartido ?? null,
              xaPorPartido: raw.xaPorPartido ?? null,
              grandesOcasionesPorPartido: raw.grandesOcasionesPorPartido ?? null,
              entradasPorPartido: raw.entradasPorPartido ?? null,
              intercepccionesPorPartido: raw.intercepccionesPorPartido ?? null,
              despejesPorPartido: raw.despejesPorPartido ?? null,
              pasesPorPartido: raw.pasesPorPartido ?? null,
              centrosPorPartido: raw.centrosPorPartido ?? null,
              atajadas: raw.atajadas ?? null,
              golesRecibidos: raw.golesRecibidos ?? null,
              porcentajeAtajadas: raw.porcentajeAtajadas ?? null,
              erroresQueGeneraronGol: raw.erroresQueGeneraronGol ?? null,
              autogoles: raw.autogoles ?? null,
            });

            estadisticasAGuardar.push(entidad);
            ejecucion.incrementarJugadoresProcesados(1);
          } catch (valErr) {
            ejecucion.registrarError({
              liga: leagueConfig.liga,
              jugadorNombre: raw.nombre,
              mensaje: `Error validando invariantes: ${(valErr as Error).message}`,
              timestamp: new Date(),
            });
          }
        }

        if (estadisticasAGuardar.length > 0) {
          await this.estadisticaRepo.guardarMuchos(estadisticasAGuardar);
        }
      }

      ejecucion.finalizarExitoso();
      await this.ejecucionRepo.guardar(ejecucion);
      this.logger.log(`Scraping finalizado exitosamente. Procesados: ${ejecucion.jugadoresProcesados}, Errores: ${ejecucion.errores}`);
      return ejecucion;
    } catch (error) {
      this.logger.error(`Fallo crítico en pipeline de scraping: ${(error as Error).message}`);
      ejecucion.finalizarFallido({
        liga: 'GLOBAL',
        mensaje: (error as Error).message,
        timestamp: new Date(),
      });
      await this.ejecucionRepo.guardar(ejecucion);
      throw error;
    }
  }

  public async obtenerEstadisticasJugador(
    jugadorId: string,
    temporada?: string,
  ): Promise<EstadisticasJugadorResponse> {
    const jugador = await this.jugadorRepo.buscarPorId(jugadorId);
    if (!jugador) {
      throw new NotFoundException(`Jugador con ID '${jugadorId}' no encontrado.`);
    }

    const temporadaBuscada = temporada || this.config.seasonLabel;
    const stats = await this.estadisticaRepo.buscarPorJugadorYTemporada(
      jugadorId,
      temporadaBuscada,
    );

    if (!stats) {
      throw new NotFoundException(
        `No se encontraron estadísticas para el jugador en la temporada '${temporadaBuscada}'.`,
      );
    }

    const esPortero = jugador.posicion === 'Portero';
    const rol: 'portero' | 'jugador_campo' = esPortero ? 'portero' : 'jugador_campo';

    const estadisticasPayload: Record<string, any> = {
      partidosJugados: stats.partidosJugados,
      minutosJugados: stats.minutosJugados,
      rating: stats.rating,
      tarjetasAmarillas: stats.tarjetasAmarillas,
      tarjetasRojas: stats.tarjetasRojas,
      precisionPase: stats.precisionPase,
      pasesPorPartido: stats.pasesPorPartido,
      duelosAereosGanadosPorPartido: stats.duelosAereosGanadosPorPartido,
    };

    if (esPortero) {
      estadisticasPayload.atajadas = stats.atajadas;
      estadisticasPayload.golesRecibidos = stats.golesRecibidos;
      estadisticasPayload.porcentajeAtajadas = stats.porcentajeAtajadas;
      estadisticasPayload.despejesPorPartido = stats.despejesPorPartido;
      estadisticasPayload.erroresQueGeneraronGol = stats.erroresQueGeneraronGol;
    } else {
      estadisticasPayload.goles = stats.goles;
      estadisticasPayload.asistencias = stats.asistencias;
      estadisticasPayload.tirosPorPartido = stats.tirosPorPartido;
      estadisticasPayload.xgPorPartido = stats.xgPorPartido;
      estadisticasPayload.xaPorPartido = stats.xaPorPartido;
      estadisticasPayload.grandesOcasionesPorPartido = stats.grandesOcasionesPorPartido;
      estadisticasPayload.regatesCompletadosPorPartido = stats.regatesCompletadosPorPartido;
      estadisticasPayload.pasesClavePorPartido = stats.pasesClavePorPartido;
      estadisticasPayload.entradasPorPartido = stats.entradasPorPartido;
      estadisticasPayload.intercepccionesPorPartido = stats.intercepccionesPorPartido;
      estadisticasPayload.despejesPorPartido = stats.despejesPorPartido;
      estadisticasPayload.centrosPorPartido = stats.centrosPorPartido;
    }

    return {
      jugador: {
        id: jugador.id,
        nombre: jugador.nombre,
        posicion: jugador.posicion,
        dorsal: jugador.dorsal,
      },
      temporada: stats.temporada,
      liga: stats.liga,
      rol,
      estadisticas: estadisticasPayload,
      fechaActualizacion: stats.fechaActualizacion,
    };
  }
}
