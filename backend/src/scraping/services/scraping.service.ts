import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  WhoScoredPlaywrightService,
  RawWhoScoredPlayerStats,
  IncidenciaScraping,
} from './whoscored-playwright.service';
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
import { Jugador, CriterioFiltroJugador } from '../../domain/jugador.entity';
import { EstadisticaJugador } from '../domain/estadistica-jugador.entity';
import {
  EjecucionScraping,
  ErrorScrapingDetalle,
} from '../domain/ejecucion-scraping.entity';
import { getScrapingConfig, ScrapingConfig } from '../../config/scraping.config';

export interface ResultadoAsociacionLocal {
  asociados: Array<{ jugador: Jugador; stats: RawWhoScoredPlayerStats }>;
  descartados: Array<{ raw: RawWhoScoredPlayerStats; motivo: string }>;
  enriquecidos: Jugador[];
  tasaAsociacion: number;
  valida: boolean;
  motivo?: string;
}

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
export class ScrapingService implements OnModuleInit {
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
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {
    this.config = getScrapingConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.recuperarEjecucionesAtascadas();
  }

  public async recuperarEjecucionesAtascadas(): Promise<void> {
    try {
      const enProgreso = await this.ejecucionRepo.buscarEnProgreso();
      if (enProgreso) {
        this.logger.warn(
          `Se detectó ejecución previa huérfana/atascada (${enProgreso.id}) al inicializar. Finalizándola como fallida...`,
        );
        enProgreso.finalizarFallido({
          liga: 'GLOBAL',
          mensaje: 'Ejecución interrumpida por reinicio del servidor o proceso huérfano',
          timestamp: new Date(),
        });
        await this.ejecucionRepo.guardar(enProgreso);
        this.logger.log(`Ejecución huérfana ${enProgreso.id} marcada como fallida.`);
      }
    } catch (err) {
      this.logger.error(
        `Error al recuperar ejecuciones atascadas: ${(err as Error).message}`,
      );
    }
  }

  public async publicarLigaTransaccional(
    estadisticas: EstadisticaJugador[],
    jugadoresEnriquecidos: Jugador[] = [],
  ): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.transaction(async (manager: EntityManager) => {
        if (
          jugadoresEnriquecidos.length > 0 &&
          typeof this.jugadorRepo?.guardarMuchos === 'function'
        ) {
          await this.jugadorRepo.guardarMuchos(jugadoresEnriquecidos, manager);
        }
        if (estadisticas.length > 0) {
          await this.estadisticaRepo.guardarMuchos(estadisticas, manager);
        }
      });
    } else {
      if (
        jugadoresEnriquecidos.length > 0 &&
        typeof this.jugadorRepo?.guardarMuchos === 'function'
      ) {
        await this.jugadorRepo.guardarMuchos(jugadoresEnriquecidos);
      }
      if (estadisticas.length > 0) {
        await this.estadisticaRepo.guardarMuchos(estadisticas);
      }
    }
  }

  public deduplicarYConsolidarJugadores(records: RawWhoScoredPlayerStats[]): {
    deduplicados: RawWhoScoredPlayerStats[];
    incidencias: IncidenciaScraping[];
  } {
    const agrupados = new Map<string, RawWhoScoredPlayerStats[]>();
    for (const r of records) {
      const key = r.whoScoredId;
      if (!agrupados.has(key)) {
        agrupados.set(key, []);
      }
      agrupados.get(key)!.push(r);
    }

    const deduplicados: RawWhoScoredPlayerStats[] = [];
    const incidencias: IncidenciaScraping[] = [];

    for (const [whoScoredId, lista] of agrupados.entries()) {
      if (lista.length === 1) {
        deduplicados.push(lista[0]);
      } else {
        const ordenados = [...lista].sort(
          (a, b) => (b.minutosJugados ?? 0) - (a.minutosJugados ?? 0),
        );
        const top1Min = ordenados[0].minutosJugados ?? 0;
        const top2Min = ordenados[1].minutosJugados ?? 0;

        if (top1Min === top2Min) {
          this.logger.warn(
            `Transferencia ambigua detectada para jugador WhoScored ${whoScoredId} (${ordenados[0].nombre}) con minutos idénticos (${top1Min}). Exclusión preventiva.`,
          );
          incidencias.push({
            tipo: 'TRANSFERENCIA_AMBIGUA_EXCLUIDA',
            equipoId: whoScoredId,
            equipoNombre: ordenados[0].nombre,
            detalle: `Jugador con múltiples registros WhoScored y minutos idénticos (${top1Min}) sin contexto cronológico confiable. Excluido preventivamente.`,
          });
        } else {
          deduplicados.push(ordenados[0]);
        }
      }
    }

    return { deduplicados, incidencias };
  }

  public validarCoberturaLiga(
    jugadores: RawWhoScoredPlayerStats[],
    minRequerido = 350,
  ): { valida: boolean; totalConMinutos: number; motivo?: string } {
    const totalConMinutos = jugadores.filter(
      (j) => (j.minutosJugados ?? 0) > 0,
    ).length;

    if (totalConMinutos < minRequerido) {
      return {
        valida: false,
        totalConMinutos,
        motivo: 'rechazada_cobertura_insuficiente',
      };
    }

    return {
      valida: true,
      totalConMinutos,
    };
  }

  public validarCoberturaGlobal(
    totalConMinutosGlobal: number,
    minRequerido = 2000,
  ): { valida: boolean; totalConMinutos: number; motivo?: string } {
    if (totalConMinutosGlobal < minRequerido) {
      return {
        valida: false,
        totalConMinutos: totalConMinutosGlobal,
        motivo: 'rechazada_cobertura_global_insuficiente',
      };
    }
    return {
      valida: true,
      totalConMinutos: totalConMinutosGlobal,
    };
  }

  public asociarJugadoresLocales(
    rawStats: RawWhoScoredPlayerStats[],
    jugadoresLocales: Jugador[],
    minTasa = 85,
  ): ResultadoAsociacionLocal {
    const asociados: Array<{ jugador: Jugador; stats: RawWhoScoredPlayerStats }> = [];
    const descartados: Array<{ raw: RawWhoScoredPlayerStats; motivo: string }> = [];
    const enriquecidos: Jugador[] = [];

    for (const raw of rawStats) {
      const matchNivel1 = jugadoresLocales.filter(
        (j) => j.whoScoredPlayerId && j.whoScoredPlayerId === raw.whoScoredId,
      );

      if (matchNivel1.length === 1) {
        asociados.push({ jugador: matchNivel1[0], stats: raw });
        continue;
      }

      if (matchNivel1.length > 1) {
        descartados.push({
          raw,
          motivo: `Ambigüedad: múltiples jugadores locales comparten whoScoredPlayerId=${raw.whoScoredId}`,
        });
        continue;
      }

      const normRawName = this.normalizador.normalizarTexto(raw.nombre);
      const normRawTeam = this.normalizador.normalizarTexto(raw.equipoNombre);

      const candidatos = jugadoresLocales.filter((j) => {
        const normLocalName = this.normalizador.normalizarTexto(j.nombre);
        if (normLocalName !== normRawName) return false;

        if (normRawTeam && j.equipo?.nombre) {
          const normLocalTeam = this.normalizador.normalizarTexto(j.equipo.nombre);
          const normLocalShort = j.equipo.nombreCorto
            ? this.normalizador.normalizarTexto(j.equipo.nombreCorto)
            : '';
          const matchClub =
            this.normalizador.coincidenClubes(raw.equipoNombre, j.equipo.nombre) ||
            (j.equipo.nombreCorto && this.normalizador.coincidenClubes(raw.equipoNombre, j.equipo.nombreCorto)) ||
            normLocalTeam.includes(normRawTeam) ||
            normRawTeam.includes(normLocalTeam) ||
            (normLocalShort && (normLocalShort.includes(normRawTeam) || normRawTeam.includes(normLocalShort)));
          if (!matchClub) return false;
        }

        return true;
      });

      if (candidatos.length === 1) {
        const candidato = candidatos[0];
        if (!candidato.whoScoredPlayerId) {
          candidato.asociarWhoScored(raw.whoScoredId);
          enriquecidos.push(candidato);
        }
        asociados.push({ jugador: candidato, stats: raw });
      } else if (candidatos.length > 1) {
        descartados.push({
          raw,
          motivo: `ambigüedad detectada: ${candidatos.length} jugadores con el mismo nombre normalizado en el club local. Descarte preventivo.`,
        });
      } else {
        descartados.push({
          raw,
          motivo: 'No encontrado en catálogo local',
        });
      }
    }

    const total = rawStats.length;
    const tasaAsociacion = total === 0 ? 100 : (asociados.length / total) * 100;
    const valida = tasaAsociacion >= minTasa;

    return {
      asociados,
      descartados,
      enriquecidos,
      tasaAsociacion,
      valida,
      motivo: valida ? undefined : 'rechazada_baja_asociacion',
    };
  }

  private async cargarJugadoresLocales(ligaCodigo: string): Promise<Jugador[]> {
    const limite = 50;
    const jugadores: Jugador[] = [];
    for (let pagina = 1; ; pagina++) {
      const { items, total } = await this.jugadorRepo.buscarConFiltros(
        new CriterioFiltroJugador({ ligaCodigo, pagina, limite }),
      );
      jugadores.push(...items);
      if (items.length < limite || jugadores.length >= total) break;
    }
    return jugadores;
  }

  public async ejecutarPipeline(trigger = 'manual'): Promise<EjecucionScraping> {
    const enProgreso = await this.ejecucionRepo.buscarEnProgreso();
    if (enProgreso) {
      const STALE_TIMEOUT_MS =
        Number(process.env.WHOSCORED_STALE_EXECUTION_TIMEOUT_MS) || 15 * 60 * 1000;
      const duracionMs = Date.now() - enProgreso.inicio.getTime();
      if (duracionMs > STALE_TIMEOUT_MS) {
        this.logger.warn(
          `Ejecución previa ${enProgreso.id} atascada en progreso por ${Math.round(duracionMs / 60000)} min. Finalizándola como fallida para recuperar el servicio...`,
        );
        enProgreso.finalizarFallido({
          liga: 'GLOBAL',
          mensaje: 'Ejecución interrumpida o expirada por timeout (stale execution recovery)',
          timestamp: new Date(),
        });
        await this.ejecucionRepo.guardar(enProgreso);
      } else {
        throw new ConflictException(
          'Ya existe una ejecución de scraping en progreso.',
        );
      }
    }

    const ejecucion = EjecucionScraping.iniciar();
    await this.ejecucionRepo.guardar(ejecucion);
    this.logger.log(`Iniciando corrida de scraping (${trigger}): ${ejecucion.id}`);

    try {
      for (const leagueConfig of this.config.leagueConfigs) {
        this.logger.log(`Procesando liga ${leagueConfig.liga}...`);

        // Obtener jugadores locales para cotejar
        const jugadoresLocales = await this.cargarJugadoresLocales(leagueConfig.liga);

        // Extraer datos WhoScored
        let rawStatsMap: Map<string, RawWhoScoredPlayerStats>;
        if (typeof this.playwrightService.extraerEstadisticasLigaPorEquipos === 'function') {
          try {
            const resExtraccion = await this.playwrightService.extraerEstadisticasLigaPorEquipos(leagueConfig);
            rawStatsMap = resExtraccion.jugadores;
          } catch {
            rawStatsMap = await this.playwrightService.extraerEstadisticasLiga(leagueConfig);
          }
        } else {
          rawStatsMap = await this.playwrightService.extraerEstadisticasLiga(leagueConfig);
        }

        // Deduplicación por whoScoredPlayerId
        const { deduplicados } = this.deduplicarYConsolidarJugadores(
          Array.from(rawStatsMap.values()),
        );

        // Validación de salvaguarda de cobertura si está configurada (minJugadoresPorLiga > 0)
        if (this.config.minJugadoresPorLiga && this.config.minJugadoresPorLiga > 0) {
          const valCob = this.validarCoberturaLiga(deduplicados, this.config.minJugadoresPorLiga);
          if (!valCob.valida) {
            this.logger.warn(
              `Liga ${leagueConfig.liga} rechazada por cobertura insuficiente (${valCob.totalConMinutos} < ${this.config.minJugadoresPorLiga})`,
            );
            ejecucion.registrarError({
              liga: leagueConfig.liga,
              mensaje: `Liga rechazada por cobertura insuficiente (${valCob.totalConMinutos} jugadores con minutos)`,
              timestamp: new Date(),
            });
            continue;
          }
        }

        const asociacion = this.asociarJugadoresLocales(deduplicados, jugadoresLocales);
        const asociados = [...asociacion.asociados];
        const jugadoresEnriquecidos = [...asociacion.enriquecidos];

        for (const { raw, motivo } of asociacion.descartados) {
          const respaldo =
            motivo === 'No encontrado en catálogo local'
              ? this.normalizador.buscarCoincidencia(
                  raw.nombre,
                  raw.equipoNombre,
                  leagueConfig.liga,
                  jugadoresLocales,
                )
              : null;

          if (respaldo) {
            if (!respaldo.whoScoredPlayerId && raw.whoScoredId) {
              respaldo.asociarWhoScored(raw.whoScoredId);
              jugadoresEnriquecidos.push(respaldo);
            }
            asociados.push({ jugador: respaldo, stats: raw });
            continue;
          }

          ejecucion.registrarError({
            liga: leagueConfig.liga,
            jugadorNombre: raw.nombre,
            mensaje: `No se encontró jugador en la base de datos local para nombre='${raw.nombre}' equipo='${raw.equipoNombre || 'N/A'}' (${motivo})`,
            timestamp: new Date(),
          });
        }

        if (!asociacion.valida) {
          this.logger.warn(
            `Liga ${leagueConfig.liga}: tasa de asociación exacta baja (${asociacion.tasaAsociacion.toFixed(1)}%)`,
          );
        }

        const estadisticasMap = new Map<string, EstadisticaJugador>();

        for (const { jugador: matchLocal, stats: raw } of asociados) {
          try {
            const entidad = EstadisticaJugador.crear({
              jugadorId: matchLocal.id,
              temporada: this.config.seasonLabel,
              liga: leagueConfig.liga,
              competencia: leagueConfig.nombreTorneo || leagueConfig.liga,
              etapa: 'Regular Season',
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

            const existente = estadisticasMap.get(matchLocal.id);
            if (!existente || (entidad.minutosJugados ?? 0) >= (existente.minutosJugados ?? 0)) {
              if (!existente) {
                ejecucion.incrementarJugadoresProcesados(1);
              }
              estadisticasMap.set(matchLocal.id, entidad);
            }
          } catch (valErr) {
            ejecucion.registrarError({
              liga: leagueConfig.liga,
              jugadorNombre: raw.nombre,
              mensaje: `Error validando invariantes: ${(valErr as Error).message}`,
              timestamp: new Date(),
            });
          }
        }

        const estadisticasAGuardar = Array.from(estadisticasMap.values());
        const enriquecidosUnicos = Array.from(
          new Map(jugadoresEnriquecidos.map((j) => [j.id, j])).values(),
        );

        if (estadisticasAGuardar.length > 0 || enriquecidosUnicos.length > 0) {
          await this.publicarLigaTransaccional(estadisticasAGuardar, enriquecidosUnicos);
        }

        if (this.config.minJugadoresPorLiga && this.config.minJugadoresPorLiga > 10) {
          ejecucion.registrarDetalle({
            liga: leagueConfig.liga,
            descubiertos: rawStatsMap.size,
            deduplicados: deduplicados.length,
            asociados: estadisticasAGuardar.length,
            descartados: deduplicados.length - estadisticasAGuardar.length,
            timestamp: new Date(),
          });
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
