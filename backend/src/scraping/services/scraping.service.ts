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
import { EjecucionScraping } from '../domain/ejecucion-scraping.entity';
import {
  getScrapingConfig,
  ScrapingConfig,
  LigaScrapingConfig,
} from '../../config/scraping.config';
import { AppMetricsService } from '../../observability/services/app-metrics.service';
import { AuditAspectRegistry } from '../../observability/aspects/audit-aspect.registry';
import { AuditarOperacion } from '../../observability/aspects/auditar-operacion.decorator';
import { OrigenEventoNegocio } from '../../observability/types/audit-log.types';
import { sanitizarTexto } from '../../observability/utils/audit-sanitizer.util';

interface ResumenAuditoriaScraping {
  ejecucionId: string | null;
  ligasProcesadas: string[];
  tasasAsociacion: number[];
  conteoIncidencias: number;
  jugadoresProcesados: number;
  errores: number;
}

function mapearOrigenScraping(trigger?: string): OrigenEventoNegocio {
  if (trigger === 'manual') return 'MANUAL';
  if (trigger === 'programado') return 'PROGRAMADO';
  if (trigger === 'standalone') return 'STANDALONE';
  return 'SISTEMA';
}

function calcularPromedioTasas(tasas: number[]): number | null {
  if (!tasas || tasas.length === 0) return null;
  const suma = tasas.reduce((acc, v) => acc + v, 0);
  return Number((suma / tasas.length).toFixed(2));
}

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
    @Optional()
    private readonly metricsService?: AppMetricsService,
  ) {
    this.config = getScrapingConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.recuperarEjecucionesAtascadas();
  }

  @AuditarOperacion({
    evento: 'SCRAPING_ESTADISTICAS',
    origen: 'SISTEMA',
    debeEmitir: (_res, _args, meta) => Boolean(meta.recuperada),
    extraerResultadoExito: (_res, _args, meta) => ({
      resultado: 'EXITO',
      datos: {
        subtipo: 'RECUPERACION_HUERFANA',
        ejecucionId: (meta.ejecucionId as string) ?? null,
        disparador: 'SISTEMA',
        ligasProcesadas: [],
        tasaAsociacion: null,
        conteoIncidencias: 1,
        jugadoresProcesados: (meta.jugadoresProcesados as number) ?? 0,
        errores: (meta.errores as number) ?? 1,
        estadoFinal: 'FALLIDO',
      },
    }),
  })
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
        AuditAspectRegistry.getContext()?.registrarMetadatos({
          recuperada: true,
          ejecucionId: enProgreso.id,
          jugadoresProcesados: enProgreso.jugadoresProcesados,
          errores: enProgreso.errores,
        });
        this.metricsService?.recordScrapingExecution('recuperada_atasco');
        this.logger.log(`Ejecución huérfana ${enProgreso.id} marcada como fallida.`);
      }
    } catch (err) {
      this.logger.error(
        `Error al recuperar ejecuciones atascadas: ${sanitizarTexto((err as Error).message)}`,
      );
    }
  }

  public async publicarLigaTransaccional(
    estadisticas: EstadisticaJugador[],
    jugadoresEnriquecidos: Jugador[] = [],
  ): Promise<void> {
    if (this.dataSource?.isInitialized) {
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

  private coincideClubEnAsociacion(
    rawEquipoNombre: string | undefined,
    normRawTeam: string,
    jugador: Jugador,
  ): boolean {
    if (!normRawTeam || !jugador.equipo?.nombre) {
      return true;
    }

    const normLocalTeam = this.normalizador.normalizarTexto(jugador.equipo.nombre);
    const normLocalShort = jugador.equipo.nombreCorto
      ? this.normalizador.normalizarTexto(jugador.equipo.nombreCorto)
      : '';

    const coincidePorDiccionario =
      this.normalizador.coincidenClubes(rawEquipoNombre, jugador.equipo.nombre) ||
      Boolean(
        jugador.equipo.nombreCorto &&
          this.normalizador.coincidenClubes(
            rawEquipoNombre,
            jugador.equipo.nombreCorto,
          ),
      );

    if (coincidePorDiccionario) {
      return true;
    }

    const coincideNombreLargo =
      normLocalTeam.includes(normRawTeam) || normRawTeam.includes(normLocalTeam);
    const coincideNombreCorto = Boolean(
      normLocalShort &&
        (normLocalShort.includes(normRawTeam) ||
          normRawTeam.includes(normLocalShort)),
    );

    return coincideNombreLargo || coincideNombreCorto;
  }

  private asociarJugadorIndividual(
    raw: RawWhoScoredPlayerStats,
    jugadoresLocales: Jugador[],
    asociados: Array<{ jugador: Jugador; stats: RawWhoScoredPlayerStats }>,
    descartados: Array<{ raw: RawWhoScoredPlayerStats; motivo: string }>,
    enriquecidos: Jugador[],
  ): void {
    const matchNivel1 = jugadoresLocales.filter(
      (j) => j.whoScoredPlayerId && j.whoScoredPlayerId === raw.whoScoredId,
    );

    if (matchNivel1.length === 1) {
      asociados.push({ jugador: matchNivel1[0], stats: raw });
      return;
    }

    if (matchNivel1.length > 1) {
      descartados.push({
        raw,
        motivo: `Ambigüedad: múltiples jugadores locales comparten whoScoredPlayerId=${raw.whoScoredId}`,
      });
      return;
    }

    const normRawName = this.normalizador.normalizarTexto(raw.nombre);
    const normRawTeam = this.normalizador.normalizarTexto(raw.equipoNombre);

    const candidatos = jugadoresLocales.filter(
      (j) =>
        this.normalizador.normalizarTexto(j.nombre) === normRawName &&
        this.coincideClubEnAsociacion(raw.equipoNombre, normRawTeam, j),
    );

    if (candidatos.length === 1) {
      const candidato = candidatos[0];
      if (!candidato.whoScoredPlayerId) {
        candidato.asociarWhoScored(raw.whoScoredId);
        enriquecidos.push(candidato);
      }
      asociados.push({ jugador: candidato, stats: raw });
      return;
    }

    const motivo =
      candidatos.length > 1
        ? `ambigüedad detectada: ${candidatos.length} jugadores con el mismo nombre normalizado en el club local. Descarte preventivo.`
        : 'No encontrado en catálogo local';
    descartados.push({ raw, motivo });
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
      this.asociarJugadorIndividual(
        raw,
        jugadoresLocales,
        asociados,
        descartados,
        enriquecidos,
      );
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

    const cargarPagina = async (pagina: number): Promise<void> => {
      const { items, total } = await this.jugadorRepo.buscarConFiltros(
        new CriterioFiltroJugador({ ligaCodigo, pagina, limite }),
      );
      jugadores.push(...items);
      if (items.length < limite || jugadores.length >= total) {
        return;
      }
      await cargarPagina(pagina + 1);
    };

    await cargarPagina(1);
    return jugadores;
  }

  @AuditarOperacion({
    evento: 'SCRAPING_ESTADISTICAS',
    origen: 'SISTEMA',
    debeEmitir: (_res, _args, meta) => Boolean(meta.recuperada),
    debeEmitirError: () => false,
    extraerResultadoExito: (_res, _args, meta) => ({
      resultado: 'EXITO',
      datos: {
        subtipo: 'RECUPERACION_ATASCADA',
        ejecucionId: (meta.ejecucionId as string) ?? null,
        disparador: 'SISTEMA',
        ligasProcesadas: [],
        tasaAsociacion: null,
        conteoIncidencias: 1,
        jugadoresProcesados: (meta.jugadoresProcesados as number) ?? 0,
        errores: (meta.errores as number) ?? 1,
        estadoFinal: 'FALLIDO',
      },
    }),
  })
  private async resolverEjecucionEnProgreso(): Promise<void> {
    const enProgreso = await this.ejecucionRepo.buscarEnProgreso();
    if (!enProgreso) return;

    const STALE_TIMEOUT_MS =
      Number(process.env.WHOSCORED_STALE_EXECUTION_TIMEOUT_MS) || 15 * 60 * 1000;
    const duracionMs = Date.now() - enProgreso.inicio.getTime();
    if (duracionMs <= STALE_TIMEOUT_MS) {
      throw new ConflictException(
        'Ya existe una ejecución de scraping en progreso.',
      );
    }

    this.logger.warn(
      `Ejecución previa ${enProgreso.id} atascada en progreso por ${Math.round(duracionMs / 60000)} min. Finalizándola como fallida para recuperar el servicio...`,
    );
    enProgreso.finalizarFallido({
      liga: 'GLOBAL',
      mensaje: 'Ejecución interrumpida o expirada por timeout (stale execution recovery)',
      timestamp: new Date(),
    });
    await this.ejecucionRepo.guardar(enProgreso);
    AuditAspectRegistry.getContext()?.registrarMetadatos({
      recuperada: true,
      ejecucionId: enProgreso.id,
      jugadoresProcesados: enProgreso.jugadoresProcesados,
      errores: enProgreso.errores,
    });
    this.metricsService?.recordScrapingExecution('recuperada_atasco');
  }

  private async extraerEstadisticasDeLiga(
    leagueConfig: LigaScrapingConfig,
  ): Promise<Map<string, RawWhoScoredPlayerStats>> {
    if (typeof this.playwrightService.extraerEstadisticasLigaPorEquipos !== 'function') {
      return this.playwrightService.extraerEstadisticasLiga(leagueConfig);
    }

    try {
      const resExtraccion =
        await this.playwrightService.extraerEstadisticasLigaPorEquipos(leagueConfig);
      return resExtraccion.jugadores;
    } catch {
      return this.playwrightService.extraerEstadisticasLiga(leagueConfig);
    }
  }

  private ligaRechazadaPorCobertura(
    leagueConfig: LigaScrapingConfig,
    deduplicados: RawWhoScoredPlayerStats[],
    ejecucion: EjecucionScraping,
  ): boolean {
    const minimo = this.config.minJugadoresPorLiga;
    if (!minimo || minimo <= 0) return false;

    const valCob = this.validarCoberturaLiga(deduplicados, minimo);
    if (valCob.valida) return false;

    this.logger.warn(
      `Liga ${leagueConfig.liga} rechazada por cobertura insuficiente (${valCob.totalConMinutos} < ${minimo})`,
    );
    ejecucion.registrarError({
      liga: leagueConfig.liga,
      mensaje: `Liga rechazada por cobertura insuficiente (${valCob.totalConMinutos} jugadores con minutos)`,
      timestamp: new Date(),
    });
    return true;
  }

  private resolverDescartados(
    descartados: ResultadoAsociacionLocal['descartados'],
    leagueConfig: LigaScrapingConfig,
    jugadoresLocales: Jugador[],
    asociados: ResultadoAsociacionLocal['asociados'],
    jugadoresEnriquecidos: Jugador[],
    ejecucion: EjecucionScraping,
  ): void {
    for (const { raw, motivo } of descartados) {
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
  }

  private crearEstadisticaDesdeRaw(
    jugadorId: string,
    raw: RawWhoScoredPlayerStats,
    leagueConfig: LigaScrapingConfig,
  ): EstadisticaJugador {
    return EstadisticaJugador.crear({
      jugadorId,
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
  }

  private construirEstadisticas(
    asociados: ResultadoAsociacionLocal['asociados'],
    leagueConfig: LigaScrapingConfig,
    ejecucion: EjecucionScraping,
  ): Map<string, EstadisticaJugador> {
    const estadisticasMap = new Map<string, EstadisticaJugador>();

    for (const { jugador: matchLocal, stats: raw } of asociados) {
      try {
        const entidad = this.crearEstadisticaDesdeRaw(matchLocal.id, raw, leagueConfig);

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

    return estadisticasMap;
  }

  @AuditarOperacion({
    evento: 'SCRAPING_LIGA',
    origen: 'SISTEMA',
    extraerResultadoExito: (_res, [leagueConfig, ejecucion], meta) => ({
      resultado: meta.rechazadaPorCobertura ? 'RECHAZADO' : 'EXITO',
      motivo: meta.rechazadaPorCobertura
        ? 'Liga rechazada por cobertura insuficiente'
        : null,
      datos: {
        ejecucionId: ejecucion?.id ?? '',
        liga: leagueConfig?.liga ?? '',
        descubiertos: (meta.descubiertos as number) ?? 0,
        deduplicados: (meta.deduplicados as number) ?? 0,
        asociados: (meta.asociados as number) ?? 0,
        descartados: (meta.descartados as number) ?? 0,
        tasaAsociacion: (meta.tasaAsociacion as number) ?? 0,
        conteoIncidencias: (meta.conteoIncidencias as number) ?? 0,
        rechazadaPorCobertura: Boolean(meta.rechazadaPorCobertura),
      },
    }),
    extraerDatosError: (_err, [leagueConfig, ejecucion], meta) => ({
      ejecucionId: ejecucion?.id ?? '',
      liga: leagueConfig?.liga ?? '',
      descubiertos: (meta.descubiertos as number) ?? 0,
      deduplicados: (meta.deduplicados as number) ?? 0,
      asociados: (meta.asociados as number) ?? 0,
      descartados: (meta.descartados as number) ?? 0,
      tasaAsociacion: (meta.tasaAsociacion as number) ?? 0,
      conteoIncidencias: (meta.conteoIncidencias as number) ?? 1,
      rechazadaPorCobertura: false,
    }),
  })
  private async procesarLiga(
    leagueConfig: LigaScrapingConfig,
    ejecucion: EjecucionScraping,
    resumenAuditoria?: ResumenAuditoriaScraping,
  ): Promise<void> {
    const startLiga = Date.now();
    this.logger.log(`Procesando liga ${leagueConfig.liga}...`);

    const jugadoresLocales = await this.cargarJugadoresLocales(leagueConfig.liga);
    const rawStatsMap = await this.extraerEstadisticasDeLiga(leagueConfig);

    const { deduplicados, incidencias: incidenciasDedup } =
      this.deduplicarYConsolidarJugadores(Array.from(rawStatsMap.values()));

    if (this.ligaRechazadaPorCobertura(leagueConfig, deduplicados, ejecucion)) {
      AuditAspectRegistry.getContext()?.registrarMetadatos({
        descubiertos: rawStatsMap.size,
        deduplicados: deduplicados.length,
        asociados: 0,
        descartados: deduplicados.length,
        tasaAsociacion: 0,
        conteoIncidencias: incidenciasDedup.length + 1,
        rechazadaPorCobertura: true,
      });
      if (resumenAuditoria) {
        resumenAuditoria.ligasProcesadas.push(leagueConfig.liga);
        resumenAuditoria.conteoIncidencias += incidenciasDedup.length + 1;
      }
      return;
    }

    const asociacion = this.asociarJugadoresLocales(deduplicados, jugadoresLocales);
    const asociados = [...asociacion.asociados];
    const jugadoresEnriquecidos = [...asociacion.enriquecidos];

    this.resolverDescartados(
      asociacion.descartados,
      leagueConfig,
      jugadoresLocales,
      asociados,
      jugadoresEnriquecidos,
      ejecucion,
    );

    const incidenciasLiga =
      incidenciasDedup.length + (asociacion.valida ? 0 : 1);

    if (!asociacion.valida) {
      this.metricsService?.recordScrapingIncident(leagueConfig.liga);
      this.logger.warn(
        `Liga ${leagueConfig.liga}: tasa de asociación exacta baja (${asociacion.tasaAsociacion.toFixed(1)}%)`,
      );
    }

    this.metricsService?.setPlayerMatchRate(leagueConfig.liga, asociacion.tasaAsociacion);
    const durationSeconds = (Date.now() - startLiga) / 1000;
    this.metricsService?.recordScrapingDuration(leagueConfig.liga, durationSeconds);

    const estadisticasMap = this.construirEstadisticas(asociados, leagueConfig, ejecucion);
    const estadisticasAGuardar = Array.from(estadisticasMap.values());
    const enriquecidosUnicos = Array.from(
      new Map(jugadoresEnriquecidos.map((j) => [j.id, j])).values(),
    );

    if (estadisticasAGuardar.length > 0 || enriquecidosUnicos.length > 0) {
      await this.publicarLigaTransaccional(estadisticasAGuardar, enriquecidosUnicos);
    }

    const tasaRedondeada = Number(asociacion.tasaAsociacion.toFixed(2));
    const descartadosFinal = Math.max(
      0,
      deduplicados.length - estadisticasAGuardar.length,
    );

    AuditAspectRegistry.getContext()?.registrarMetadatos({
      descubiertos: rawStatsMap.size,
      deduplicados: deduplicados.length,
      asociados: estadisticasAGuardar.length,
      descartados: descartadosFinal,
      tasaAsociacion: tasaRedondeada,
      conteoIncidencias: incidenciasLiga,
      rechazadaPorCobertura: false,
    });

    if (resumenAuditoria) {
      resumenAuditoria.ligasProcesadas.push(leagueConfig.liga);
      resumenAuditoria.tasasAsociacion.push(tasaRedondeada);
      resumenAuditoria.conteoIncidencias += incidenciasLiga;
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

  @AuditarOperacion({
    evento: 'SCRAPING_ESTADISTICAS',
    origen: ([trigger]) => mapearOrigenScraping(trigger),
    extraerUsuarioId: ([, usuarioId]) => usuarioId ?? null,
    extraerResultadoExito: (res: EjecucionScraping, [trigger], meta) => {
      const resumen = meta.resumenAuditoria as
        | ResumenAuditoriaScraping
        | undefined;
      return {
        resultado: 'EXITO',
        datos: {
          subtipo: 'EJECUCION_COMPLETA',
          ejecucionId: res?.id ?? resumen?.ejecucionId ?? null,
          disparador: trigger ?? 'manual',
          ligasProcesadas: resumen?.ligasProcesadas ?? [],
          tasaAsociacion: calcularPromedioTasas(resumen?.tasasAsociacion ?? []),
          conteoIncidencias: resumen?.conteoIncidencias ?? 0,
          jugadoresProcesados: res?.jugadoresProcesados ?? 0,
          errores: res?.errores ?? 0,
          estadoFinal: 'EXITOSO',
        },
      };
    },
    extraerDatosError: (err, [trigger], meta) => {
      const resumen = meta.resumenAuditoria as
        | ResumenAuditoriaScraping
        | undefined;
      const esConcurrencia = err instanceof ConflictException;
      return {
        subtipo: esConcurrencia ? 'RECHAZO_CONCURRENCIA' : 'EJECUCION_COMPLETA',
        ejecucionId: resumen?.ejecucionId ?? null,
        disparador: trigger ?? 'manual',
        ligasProcesadas: resumen?.ligasProcesadas ?? [],
        tasaAsociacion: calcularPromedioTasas(resumen?.tasasAsociacion ?? []),
        conteoIncidencias: (resumen?.conteoIncidencias ?? 0) + (esConcurrencia ? 0 : 1),
        jugadoresProcesados: resumen?.jugadoresProcesados ?? 0,
        errores: resumen?.errores ?? (esConcurrencia ? 0 : 1),
        estadoFinal: esConcurrencia ? 'RECHAZADO' : 'FALLIDO',
      };
    },
  })
  public async ejecutarPipeline(
    trigger = 'manual',
    _usuarioId?: string | null,
  ): Promise<EjecucionScraping> {
    const resumenAuditoria: ResumenAuditoriaScraping = {
      ejecucionId: null,
      ligasProcesadas: [],
      tasasAsociacion: [],
      conteoIncidencias: 0,
      jugadoresProcesados: 0,
      errores: 0,
    };
    AuditAspectRegistry.getContext()?.registrarMetadatos({ resumenAuditoria });

    await this.resolverEjecucionEnProgreso();

    const ejecucion = EjecucionScraping.iniciar();
    resumenAuditoria.ejecucionId = ejecucion.id;
    await this.ejecucionRepo.guardar(ejecucion);
    this.logger.log(`Iniciando corrida de scraping (${trigger}): ${ejecucion.id}`);

    try {
      await this.config.leagueConfigs.reduce<Promise<void>>(
        async (prev, leagueConfig) => {
          await prev;
          await this.procesarLiga(leagueConfig, ejecucion, resumenAuditoria);
        },
        Promise.resolve(),
      );

      ejecucion.finalizarExitoso();
      resumenAuditoria.jugadoresProcesados = ejecucion.jugadoresProcesados;
      resumenAuditoria.errores = ejecucion.errores;
      await this.ejecucionRepo.guardar(ejecucion);
      this.metricsService?.recordScrapingExecution('exitoso');
      this.logger.log(`Scraping finalizado exitosamente. Procesados: ${ejecucion.jugadoresProcesados}, Errores: ${ejecucion.errores}`);
      return ejecucion;
    } catch (error) {
      const mensajeSanitizado = sanitizarTexto((error as Error).message);
      this.metricsService?.recordScrapingExecution('fallido');
      this.metricsService?.recordScrapingIncident('GLOBAL');
      this.logger.error(`Fallo crítico en pipeline de scraping: ${mensajeSanitizado}`);
      ejecucion.finalizarFallido({
        liga: 'GLOBAL',
        mensaje: mensajeSanitizado,
        timestamp: new Date(),
      });
      resumenAuditoria.jugadoresProcesados = ejecucion.jugadoresProcesados;
      resumenAuditoria.errores = ejecucion.errores;
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
