import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Optional,
} from '@nestjs/common';
import { chromium } from 'playwright-extra';
import { ScrapingCacheService } from './scraping-cache.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stealthPluginPkg = require('puppeteer-extra-plugin-stealth');
const stealthPlugin: () => any =
  typeof stealthPluginPkg === 'function'
    ? stealthPluginPkg
    : (stealthPluginPkg as any)?.default ?? stealthPluginPkg;

import { Browser, BrowserContext, Page } from 'playwright';
import {
  validarWhoScoredFeedPayload,
  WhoScoredFeedIncompatibleException,
  RawWhoScoredFeedItem,
} from './whoscored-feed-adapter.interface';
import {
  LigaScrapingConfig,
  ScrapingConfig,
  getScrapingConfig,
} from '../../config/scraping.config';

export interface EquipoWhoScoredDescubierto {
  whoScoredTeamId: string;
  nombre: string;
  url: string;
}

export interface EstructuraCompeticionWhoScored {
  tournamentId: number;
  seasonId: number;
  stageId: number;
  competencia: string;
  etapa: string;
  temporadaEtiqueta?: string;
  equipos: EquipoWhoScoredDescubierto[];
}

export interface IncidenciaScraping {
  tipo: string;
  equipoId?: string;
  equipoNombre?: string;
  detalle: string;
}

export interface ResultadoExtraccionLiga {
  jugadores: Map<string, RawWhoScoredPlayerStats>;
  incidencias: IncidenciaScraping[];
}

export interface RawWhoScoredPlayerStats {
  whoScoredId: string;
  nombre: string;
  equipoNombre?: string;
  partidosJugados?: number;
  minutosJugados?: number;
  goles?: number;
  asistencias?: number;
  tirosPorPartido?: number | null;
  precisionPase?: number | null;
  duelosAereosGanadosPorPartido?: number | null;
  rating?: number | null;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
  regatesCompletadosPorPartido?: number | null;
  pasesClavePorPartido?: number | null;
  xgPorPartido?: number | null;
  xaPorPartido?: number | null;
  grandesOcasionesPorPartido?: number | null;
  entradasPorPartido?: number | null;
  intercepccionesPorPartido?: number | null;
  despejesPorPartido?: number | null;
  pasesPorPartido?: number | null;
  centrosPorPartido?: number | null;
  atajadas?: number | null;
  golesRecibidos?: number | null;
  porcentajeAtajadas?: number | null;
  erroresQueGeneraronGol?: number | null;
  autogoles?: number | null;
}

export interface OpcionesFeedEquipo {
  category?: string;
  subcategory?: string;
  extraQuery?: string;
}

interface FeedComplementarioWhoScored extends OpcionesFeedEquipo {
  clave: string;
  aplicar: (item: RawWhoScoredFeedItem, stats: RawWhoScoredPlayerStats) => void;
}

/** Convierte un valor del feed a número finito; null si está ausente o no es numérico. */
const numeroFeed = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
};

/** Igual que numeroFeed pero redondeado a entero (para totales acumulados). */
const enteroFeed = (valor: unknown): number | null => {
  const n = numeroFeed(valor);
  return n === null ? null : Math.round(n);
};

/**
 * Feeds complementarios al summary/all. Los parámetros category/subcategory replican
 * exactamente los que usa la web de WhoScored en las pestañas de la página de equipo
 * (Defensive / Offensive / Passing / xG / Detailed > Saves).
 * Sólo se asignan valores presentes en el feed (nunca se pisa un dato con null).
 */
export const FEEDS_COMPLEMENTARIOS_WHOSCORED: FeedComplementarioWhoScored[] = [
  {
    clave: 'offensive',
    category: 'summary',
    subcategory: 'offensive',
    aplicar: (item, stats) => {
      const regates = numeroFeed(item.dribbleWonPerGame);
      if (regates !== null) stats.regatesCompletadosPorPartido = regates;
      const pasesClave = numeroFeed(item.keyPassPerGame);
      if (pasesClave !== null) stats.pasesClavePorPartido = pasesClave;
    },
  },
  {
    clave: 'defensive',
    category: 'summary',
    subcategory: 'defensive',
    aplicar: (item, stats) => {
      const entradas = numeroFeed(item.tacklePerGame);
      if (entradas !== null) stats.entradasPorPartido = entradas;
      const intercepciones = numeroFeed(item.interceptionPerGame);
      if (intercepciones !== null) stats.intercepccionesPorPartido = intercepciones;
      const despejes = numeroFeed(item.clearancePerGame);
      if (despejes !== null) stats.despejesPorPartido = despejes;
      const autogoles = enteroFeed(item.goalOwn);
      if (autogoles !== null) stats.autogoles = autogoles;
    },
  },
  {
    clave: 'passing',
    category: 'summary',
    subcategory: 'passing',
    aplicar: (item, stats) => {
      const pases = numeroFeed(item.totalPassesPerGame);
      if (pases !== null) stats.pasesPorPartido = pases;
      const centros = numeroFeed(item.accurateCrossesPerGame);
      if (centros !== null) stats.centrosPorPartido = centros;
    },
  },
  {
    clave: 'xg',
    category: 'xg-stats',
    subcategory: 'summary',
    extraQuery: '&incPens=true',
    aplicar: (item, stats) => {
      // El feed entrega xG acumulado de la temporada; se normaliza por partido jugado
      // (mismo criterio "por partido" que los campos *PerGame de WhoScored).
      const xg = numeroFeed(item.xG);
      const apps = numeroFeed(item.apps);
      if (xg !== null && apps !== null && apps > 0) {
        stats.xgPorPartido = xg / apps;
      }
    },
  },
  {
    clave: 'saves',
    category: 'saves',
    subcategory: 'shotzone',
    aplicar: (item, stats) => {
      // Con statsAccumulationType=0 saveTotal es el promedio de atajadas por partido.
      const atajadas = numeroFeed(item.saveTotal);
      if (atajadas !== null) stats.atajadas = atajadas;
    },
  },
];

/** Mapea un registro del feed summary/all al modelo interno de estadísticas crudas. */
export function mapearItemResumenWhoScored(
  item: RawWhoScoredFeedItem,
  equipoNombreFallback?: string,
): RawWhoScoredPlayerStats {
  return {
    whoScoredId: String(item.playerId),
    nombre: item.name,
    equipoNombre: item.teamName || equipoNombreFallback,
    partidosJugados: enteroFeed(item.apps) ?? 0,
    minutosJugados: enteroFeed(item.minsPlayed) ?? 0,
    goles: enteroFeed(item.goal) ?? 0,
    asistencias: enteroFeed(item.assistTotal) ?? 0,
    tirosPorPartido: numeroFeed(item.shotsPerGame),
    precisionPase: numeroFeed(item.passSuccess),
    duelosAereosGanadosPorPartido: numeroFeed(item.aerialWonPerGame),
    rating: numeroFeed(item.rating),
    tarjetasAmarillas: enteroFeed(item.yellowCard) ?? 0,
    tarjetasRojas: enteroFeed(item.redCard) ?? 0,
  };
}

@Injectable()
export class WhoScoredPlaywrightService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WhoScoredPlaywrightService.name);
  private browser: Browser | null = null;
  private scrapingConfig: ScrapingConfig;

  constructor(
    @Optional() private readonly cacheService?: ScrapingCacheService,
  ) {
    this.scrapingConfig = getScrapingConfig();
  }

  async onModuleInit(): Promise<void> {
    // Inicialización bajo demanda para no bloquear inicio si no se ejecuta scraping inmediatamente
  }

  async onModuleDestroy(): Promise<void> {
    await this.cerrarNavegador();
  }

  private static stealthRegistrado = false;

  private obtenerProxyConfig():
    | { server: string; username?: string; password?: string }
    | undefined {
    const raw =
      process.env.SCRAPING_PROXY_URL ||
      process.env.SCRAPING_PROXY_SERVER ||
      process.env.HTTP_PROXY;
    if (!raw) return undefined;

    try {
      const url = new URL(raw);
      if (url.username || url.password) {
        return {
          server: `${url.protocol}//${url.host}`,
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
        };
      }
    } catch {
      // Usar raw directamente si no es parseable como URL completa
    }

    return {
      server: raw,
      username: process.env.SCRAPING_PROXY_USERNAME || undefined,
      password: process.env.SCRAPING_PROXY_PASSWORD || undefined,
    };
  }

  private async esperarSiHayChallenge(page: Page): Promise<void> {
    try {
      const isChallenge = await page.evaluate(
        () =>
          document.body?.innerText?.includes('security verification') ||
          document.title?.includes('Just a moment'),
      );
      if (isChallenge) {
        this.logger.log('Detectado challenge de Cloudflare, esperando resolución automática...');
        await page.waitForTimeout(7000);
      }
    } catch {
      // Ignorar error al verificar challenge
    }
  }

  public async obtenerNavegador(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log('Inicializando instancia Chromium con plugin Stealth...');
      if (!WhoScoredPlaywrightService.stealthRegistrado) {
        chromium.use(stealthPlugin());
        WhoScoredPlaywrightService.stealthRegistrado = true;
      }
      const proxy = this.obtenerProxyConfig();
      if (proxy) {
        this.logger.log(`Chromium configurado con proxy: ${proxy.server}`);
      }
      this.browser = await chromium.launch({
        headless: true,
        proxy,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  public async cerrarNavegador(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        this.logger.warn(`Error cerrando navegador: ${(err as Error).message}`);
      } finally {
        this.browser = null;
      }
    }
  }

  public async descubrirEstructuraCompeticion(
    config: LigaScrapingConfig,
  ): Promise<EstructuraCompeticionWhoScored> {
    if (this.cacheService) {
      const cached = await this.cacheService.obtenerEstructuraCompeticion(
        config.nombreTorneo || config.liga,
        this.scrapingConfig.seasonLabel,
      );
      if (cached) {
        return cached;
      }
    }

    const browser = await this.obtenerNavegador();
    const context: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
    });

    const page: Page = await context.newPage();
    let competencia = config.nombreTorneo || config.liga;
    let etapa = 'Regular Season';
    let equipos: EquipoWhoScoredDescubierto[] = [];

    try {
      await this.configurarInterceptores(page);
      const esIdPlaceholder =
        !config.seasonId || config.seasonId >= 10000 || String(config.seasonId).startsWith('1234');
      const url =
        !esIdPlaceholder && config.stageId && config.stageId < 20000
          ? `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}/Seasons/${config.seasonId}/Stages/${config.stageId}`
          : `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}`;
      this.logger.log(`Descubriendo competición WhoScored (${config.liga}): ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
      await this.esperarSiHayChallenge(page);

      try {
        const meta = await page.evaluate(() => {
          let sId: number | null = null;
          let stId: number | null = null;
          const links = Array.from(document.querySelectorAll('a[href*="/stages/" i], a[href*="/seasons/" i]'));
          for (const a of links) {
            const m = (a.getAttribute('href') || '').match(/seasons\/(\d+)\/stages\/(\d+)/i);
            if (m) {
              sId = Number(m[1]);
              stId = Number(m[2]);
              break;
            }
          }
          return { seasonId: sId, stageId: stId };
        });
        if (meta.seasonId) {
          config.seasonId = meta.seasonId;
        }
        if (meta.stageId) {
          config.stageId = meta.stageId;
        }
      } catch {
        // Fallback a config
      }

      try {
        const titulo = await page.$eval(
          'h1, .tournament-title, .header-title',
          (el) => el.textContent?.trim() || '',
        );
        if (titulo) {
          competencia = titulo.split(/\d{4}\/\d{4}/)[0].trim() || competencia;
        }
      } catch {
        // Fallback a config
      }

      try {
        const etapaTexto = await page.$eval(
          '#stages option:checked, .stage-name',
          (el) => el.textContent?.trim() || '',
        );
        if (etapaTexto) {
          etapa = etapaTexto;
        }
      } catch {
        // Fallback
      }

      try {
        equipos = await page.$$eval(
          'table.standings a.team-link, #standings a.team-link, a[href*="/teams/"], a[href*="/Teams/"]',
          (links) => {
            const seen = new Set<string>();
            const res: { whoScoredTeamId: string; nombre: string; url: string }[] = [];
            for (const a of links) {
              const href = a.getAttribute('href') || '';
              const match = href.match(/\/teams\/(\d+)/i);
              if (match) {
                const id = match[1];
                if (!seen.has(id)) {
                  seen.add(id);
                  res.push({
                    whoScoredTeamId: id,
                    nombre: a.textContent?.trim() || '',
                    url: href,
                  });
                }
              }
            }
            return res;
          },
        );
      } catch {
        equipos = [];
      }
    } finally {
      await page.close().catch(() => null);
      await context.close().catch(() => null);
    }

    const resEstructura: EstructuraCompeticionWhoScored = {
      tournamentId: config.tournamentId,
      seasonId: config.seasonId,
      stageId: config.stageId,
      competencia,
      etapa,
      temporadaEtiqueta: this.scrapingConfig.seasonLabel,
      equipos,
    };

    if (this.cacheService && equipos.length > 0) {
      await this.cacheService.guardarEstructuraCompeticion(
        config.nombreTorneo || config.liga,
        this.scrapingConfig.seasonLabel,
        resEstructura,
      );
    }

    return resEstructura;
  }

  public async consultarFeedEquipo(
    context: BrowserContext,
    stageId: number,
    teamId: string,
    refererUrl: string,
    page?: Page,
    opciones?: OpcionesFeedEquipo,
  ): Promise<RawWhoScoredFeedItem[]> {
    const category = opciones?.category ?? 'summary';
    const subcategory = opciones?.subcategory ?? 'all';
    const extraQuery = opciones?.extraQuery ?? '';
    const feedUrl = `https://www.whoscored.com/StatisticsFeed/1/GetPlayerStatistics?category=${category}&subcategory=${subcategory}&statsAccumulationType=0&isCurrent=true&stageId=${stageId}&teamIds=${teamId}&numberOfPlayersToPick=50${extraQuery}`;

    let json: any = null;

    if (page && !page.isClosed()) {
      try {
        json = await page.evaluate(async (url) => {
          const res = await fetch(url, {
            headers: {
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return await res.json();
        }, feedUrl);
      } catch {
        json = null;
      }
    }

    if (!json) {
      const response = await context.request.get(feedUrl, {
        headers: {
          Referer: refererUrl,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (response.status() !== 200) {
        throw new WhoScoredFeedIncompatibleException(
          `El feed retornó status HTTP ${response.status()}`,
        );
      }

      json = await response.json();
    }

    return validarWhoScoredFeedPayload(json);
  }

  public async pausaRateLimit(ms: number = 10000): Promise<void> {
    this.logger.warn(`Pausa por rate limiting (HTTP 429) de ${ms}ms...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async extraerEquipoDesdeDOM(
    page: Page,
    equipo: EquipoWhoScoredDescubierto,
    config?: LigaScrapingConfig,
  ): Promise<RawWhoScoredPlayerStats[]> {
    this.logger.warn(
      `Ejecutando fallback DOM observable para equipo ${equipo.nombre} (${equipo.whoScoredTeamId})`,
    );
    const url = equipo.url.startsWith('http')
      ? equipo.url
      : `https://www.whoscored.com${equipo.url}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.delayHumano(1000, 2000);

    const acumulador = new Map<string, RawWhoScoredPlayerStats>();
    const pestanasEquipo = [
      { nombre: 'summary', selectorTab: null },
      { nombre: 'defensive', selectorTab: 'a[href="#team-squad-stats-defensive"]' },
      { nombre: 'offensive', selectorTab: 'a[href="#team-squad-stats-offensive"]' },
      { nombre: 'passing', selectorTab: 'a[href="#team-squad-stats-passing"]' },
    ];

    for (const pestana of pestanasEquipo) {
      try {
        if (pestana.selectorTab) {
          const tabVisible = await page.$(pestana.selectorTab);
          if (tabVisible) {
            await tabVisible.click();
            await this.delayHumano(1000, 2000);
          }
        }
        await this.extraerFilasTabla(page, pestana.nombre, acumulador);
      } catch (tabErr) {
        this.logger.warn(
          `Error en fallback DOM pestaña ${pestana.nombre} para equipo ${equipo.nombre}: ${(tabErr as Error).message}`,
        );
      }
    }

    return Array.from(acumulador.values());
  }

  public async extraerEstadisticasLigaPorEquipos(
    config: LigaScrapingConfig,
    equipos?: EquipoWhoScoredDescubierto[],
  ): Promise<ResultadoExtraccionLiga> {
    const browser = await this.obtenerNavegador();
    const context: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
    });

    const page: Page = await context.newPage();
    const jugadores = new Map<string, RawWhoScoredPlayerStats>();
    const incidencias: IncidenciaScraping[] = [];

    try {
      await this.configurarInterceptores(page);

      let listaEquipos = equipos;
      if (!listaEquipos || listaEquipos.length === 0) {
        const estructura = await this.descubrirEstructuraCompeticion(config);
        listaEquipos = estructura.equipos;
        if (estructura.stageId) {
          config.stageId = estructura.stageId;
        }
        if (estructura.seasonId) {
          config.seasonId = estructura.seasonId;
        }
      }

      const refererUrl = `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}/Seasons/${config.seasonId}/Stages/${config.stageId}`;

      for (const equipo of listaEquipos) {
        await this.delayHumano(1500, 3500);
        let items: RawWhoScoredFeedItem[] | null = null;
        let intentos = 0;
        const maxIntentos = 3;

        while (intentos < maxIntentos && items === null) {
          intentos++;
          try {
            items = await this.consultarFeedEquipo(
              context,
              config.stageId,
              equipo.whoScoredTeamId,
              refererUrl,
              page,
            );
          } catch (err: any) {
            const isRateLimit = err?.status === 429 || String(err?.message).includes('429');
            if (isRateLimit) {
              await this.pausaRateLimit(10000);
            } else if (err instanceof WhoScoredFeedIncompatibleException) {
              break;
            } else if (intentos < maxIntentos) {
              await new Promise((r) => setTimeout(r, 1000 * intentos));
            }
          }
        }

        if (items && items.length > 0) {
          const jugadoresEquipo = new Map<string, RawWhoScoredPlayerStats>();
          for (const item of items) {
            const stats = mapearItemResumenWhoScored(item, equipo.nombre);
            jugadoresEquipo.set(stats.whoScoredId, stats);
            jugadores.set(stats.whoScoredId, stats);
          }

          await this.enriquecerConFeedsComplementarios(
            context,
            config.stageId,
            equipo,
            refererUrl,
            page,
            jugadoresEquipo,
            incidencias,
          );
        } else {
          this.logger.warn(
            `Activando fallback DOM observable para equipo ${equipo.nombre} (${equipo.whoScoredTeamId})`,
          );
          incidencias.push({
            tipo: 'FALLBACK_DOM_ACTIVADO',
            equipoId: equipo.whoScoredTeamId,
            equipoNombre: equipo.nombre,
            detalle: `Fallback DOM activado tras falla o incompatibilidad en el feed para equipo ${equipo.nombre}`,
          });

          try {
            const statsDom = await this.extraerEquipoDesdeDOM(page, equipo, config);
            for (const s of statsDom) {
              jugadores.set(s.whoScoredId, s);
            }
          } catch (domErr: any) {
            this.logger.error(
              `Fallo de extracción en equipo ${equipo.nombre} (${equipo.whoScoredTeamId}) tanto en feed como en DOM: ${domErr.message}`,
            );
            incidencias.push({
              tipo: 'EQUIPO_FALLIDO_AISLADO',
              equipoId: equipo.whoScoredTeamId,
              equipoNombre: equipo.nombre,
              detalle: `Aislamiento de falla: ${domErr.message}`,
            });
          }
        }
      }
    } finally {
      await page.close().catch(() => null);
      await context.close().catch(() => null);
    }

    return { jugadores, incidencias };
  }

  /**
   * Consulta los feeds complementarios (offensive, defensive, passing, xG, saves) de un equipo
   * y fusiona sus valores sobre los jugadores ya obtenidos del summary. Es best-effort: una
   * falla en un feed complementario no descarta los datos del summary ni activa el fallback DOM;
   * sólo se registra como incidencia observable.
   */
  private async enriquecerConFeedsComplementarios(
    context: BrowserContext,
    stageId: number,
    equipo: EquipoWhoScoredDescubierto,
    refererUrl: string,
    page: Page,
    jugadoresEquipo: Map<string, RawWhoScoredPlayerStats>,
    incidencias: IncidenciaScraping[],
  ): Promise<void> {
    for (const feed of FEEDS_COMPLEMENTARIOS_WHOSCORED) {
      await this.delayHumano(300, 700);
      let items: RawWhoScoredFeedItem[] | null = null;
      let ultimoError: string | null = null;

      for (let intento = 1; intento <= 2 && items === null; intento++) {
        try {
          items = await this.consultarFeedEquipo(
            context,
            stageId,
            equipo.whoScoredTeamId,
            refererUrl,
            page,
            { category: feed.category, subcategory: feed.subcategory, extraQuery: feed.extraQuery },
          );
        } catch (err: any) {
          ultimoError = err?.message ?? String(err);
          const isRateLimit = err?.status === 429 || String(err?.message).includes('429');
          if (isRateLimit && intento < 2) {
            await this.pausaRateLimit(10000);
          }
        }
      }

      if (!items) {
        this.logger.warn(
          `Feed complementario '${feed.clave}' no disponible para equipo ${equipo.nombre} (${equipo.whoScoredTeamId}): ${ultimoError}`,
        );
        incidencias.push({
          tipo: 'FEED_COMPLEMENTARIO_FALLIDO',
          equipoId: equipo.whoScoredTeamId,
          equipoNombre: equipo.nombre,
          detalle: `Feed '${feed.clave}' (${feed.category}/${feed.subcategory}) no disponible: ${ultimoError}`,
        });
        continue;
      }

      for (const item of items) {
        const stats = jugadoresEquipo.get(String(item.playerId));
        if (stats) {
          feed.aplicar(item, stats);
        }
      }
    }
  }

  private async configurarInterceptores(page: Page): Promise<void> {
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  private async delayHumano(minMs?: number, maxMs?: number): Promise<void> {
    const min = this.scrapingConfig.delayMinMs === 0 ? 0 : (minMs ?? this.scrapingConfig.delayMinMs);
    const max = this.scrapingConfig.delayMaxMs === 0 ? 0 : (maxMs ?? this.scrapingConfig.delayMaxMs);
    if (max <= 0) return;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  public async extraerEstadisticasLiga(
    config: LigaScrapingConfig,
  ): Promise<Map<string, RawWhoScoredPlayerStats>> {
    const browser = await this.obtenerNavegador();
    const context: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
    });

    const page: Page = await context.newPage();
    const resultado = new Map<string, RawWhoScoredPlayerStats>();

    try {
      await this.configurarInterceptores(page);

      const url = `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}/Seasons/${config.seasonId}/Stages/${config.stageId}/PlayerStatistics`;
      this.logger.log(`Navegando a WhoScored (${config.liga}): ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await this.esperarSiHayChallenge(page);
      await this.delayHumano(1500, 3000);

      // Pestañas a consultar
      const pestanas = [
        { nombre: 'summary', selectorTab: 'a[href="#stage-top-player-stats-summary"]' },
        { nombre: 'defensive', selectorTab: 'a[href="#stage-top-player-stats-defensive"]' },
        { nombre: 'offensive', selectorTab: 'a[href="#stage-top-player-stats-offensive"]' },
        { nombre: 'passing', selectorTab: 'a[href="#stage-top-player-stats-passing"]' },
      ];

      for (const pestana of pestanas) {
        try {
          if (pestana.selectorTab) {
            const tabVisible = await page.$(pestana.selectorTab);
            if (tabVisible) {
              await tabVisible.click();
              await this.delayHumano(1000, 2000);
            }
          }

          await this.extraerFilasTabla(page, pestana.nombre, resultado);
        } catch (tabErr) {
          this.logger.warn(
            `Error al procesar pestaña ${pestana.nombre} en liga ${config.liga}: ${(tabErr as Error).message}`,
          );
        }
      }
    } finally {
      await page.close();
      await context.close();
    }

    return resultado;
  }

  private async extraerFilasTabla(
    page: Page,
    pestana: string,
    acumulador: Map<string, RawWhoScoredPlayerStats>,
  ): Promise<void> {
    try {
      await page.waitForSelector('#player-table-statistics-body', {
        timeout: 10000,
      });
    } catch {
      return;
    }

    let pagina = 1;
    const maxPaginas = 60;
    let ultimoPrimerId: string | null = null;

    while (pagina <= maxPaginas) {
      const selectorTabla =
        '#team-squad-stats #statistics-table-' +
        pestana +
        ' #player-table-statistics-body tr, #stage-top-player-stats-' +
        pestana +
        ' #player-table-statistics-body tr, #player-table-statistics-body tr';
      const filas = await page.$$eval(selectorTabla, (rows) => {
        return rows.map((tr) => {
          const playerLink = tr.querySelector('a.player-link');
          const href = playerLink?.getAttribute('href') || '';
          const idMatch = href.match(/\/Players\/(\d+)/i);
          const whoScoredId = idMatch ? idMatch[1] : href || tr.getAttribute('data-player-id') || '';
          let nombre = '';
          if (playerLink) {
            const clone = playerLink.cloneNode(true) as HTMLElement;
            clone.querySelector('.table-ranking')?.remove();
            nombre = clone.textContent?.trim() || '';
            nombre = nombre.replace(/^\d+\s*/, '').trim();
          }

          const teamLink = tr.querySelector('a.team-link') || tr.querySelector('.team-name');
          let equipoNombre = teamLink?.textContent?.trim() || '';
          equipoNombre = equipoNombre.replace(/,\s*$/, '').trim();

          const getCol = (colName: string) => {
            const el = tr.querySelector(`td[class*="${colName}"]`) || tr.querySelector(`td[data-field="${colName}"]`);
            return el?.textContent?.trim() || '';
          };

          // En las tablas de equipo, la columna Apps tiene encabezado <th class="ap"> pero el <td>
          // carece de clase (es la celda inmediatamente anterior a td.minsPlayed).
          let appsVal = getCol('apps');
          if (!appsVal) {
            const minsCell = tr.querySelector('td[class*="minsPlayed"]');
            const prevText = minsCell?.previousElementSibling?.textContent?.trim() || '';
            if (prevText) {
              const mApps = prevText.match(/^(\d+)(?:\((\d+)\))?$/);
              appsVal = mApps ? String(Number(mApps[1]) + (mApps[2] ? Number(mApps[2]) : 0)) : prevText;
            }
          }

          return {
            whoScoredId,
            nombre,
            equipoNombre,
            apps: appsVal,
            minsPlayed: getCol('minsPlayed'),
            goal: getCol('goal'),
            assistTotal: getCol('assistTotal'),
            shotsPerGame: getCol('shotsPerGame'),
            passSuccess: getCol('passSuccess'),
            aerialWonPerGame: getCol('aerialWonPerGame'),
            rating: getCol('rating'),
            yellowCard: getCol('yellowCard'),
            redCard: getCol('redCard'),
            dribbleWonPerGame: getCol('dribbleWonPerGame'),
            keyPassPerGame: getCol('keyPassPerGame'),
            xgPerGame: getCol('xgPerGame'),
            xaPerGame: getCol('xaPerGame'),
            bigChancePerGame: getCol('bigChancePerGame'),
            tacklePerGame: getCol('tacklePerGame'),
            interceptionPerGame: getCol('interceptionPerGame'),
            clearancePerGame: getCol('clearancePerGame'),
            passesPerGame: getCol('totalPassesPerGame'),
            crossesPerGame: getCol('accurateCrossesPerGame'),
            savePerGame: getCol('savePerGame'),
            goalsConceded: getCol('goalsConceded'),
            savePercentage: getCol('savePercentage'),
            errorLeadToGoal: getCol('errorLeadToGoal'),
            ownGoal: getCol('goalOwn'),
          };
        });
      });

      if (!filas || filas.length === 0) {
        break;
      }

      for (const f of filas) {
        if (!f.whoScoredId && !f.nombre) continue;
        const id = f.whoScoredId || f.nombre;

        let item = acumulador.get(id);
        if (!item) {
          item = {
            whoScoredId: id,
            nombre: f.nombre,
            equipoNombre: f.equipoNombre,
          };
          acumulador.set(id, item);
        }

        const parseNum = (val: string | undefined): number | null => {
          if (!val || val === '-' || val === 'N/A') return null;
          const n = Number.parseFloat(val);
          return Number.isNaN(n) ? null : n;
        };

        const parseIntVal = (val: string | undefined, defaultVal = 0): number => {
          const n = parseNum(val);
          return n !== null ? Math.round(n) : defaultVal;
        };

        if (pestana === 'summary') {
          item.partidosJugados = parseIntVal(f.apps, item.partidosJugados ?? 0);
          item.minutosJugados = parseIntVal(f.minsPlayed, item.minutosJugados ?? 0);
          item.goles = parseIntVal(f.goal, item.goles ?? 0);
          item.asistencias = parseIntVal(f.assistTotal, item.asistencias ?? 0);
          item.tirosPorPartido = parseNum(f.shotsPerGame) ?? item.tirosPorPartido ?? null;
          item.precisionPase = parseNum(f.passSuccess) ?? item.precisionPase ?? null;
          item.duelosAereosGanadosPorPartido = parseNum(f.aerialWonPerGame) ?? item.duelosAereosGanadosPorPartido ?? null;
          item.rating = parseNum(f.rating) ?? item.rating ?? null;
          item.tarjetasAmarillas = parseIntVal(f.yellowCard, item.tarjetasAmarillas ?? 0);
          item.tarjetasRojas = parseIntVal(f.redCard, item.tarjetasRojas ?? 0);
        }

        if (pestana === 'offensive') {
          item.regatesCompletadosPorPartido = parseNum(f.dribbleWonPerGame) ?? item.regatesCompletadosPorPartido ?? null;
          item.pasesClavePorPartido = parseNum(f.keyPassPerGame) ?? item.pasesClavePorPartido ?? null;
          item.grandesOcasionesPorPartido = parseNum(f.bigChancePerGame) ?? item.grandesOcasionesPorPartido ?? null;
        }

        if (pestana === 'defensive') {
          item.entradasPorPartido = parseNum(f.tacklePerGame) ?? item.entradasPorPartido ?? null;
          item.intercepccionesPorPartido = parseNum(f.interceptionPerGame) ?? item.intercepccionesPorPartido ?? null;
          item.despejesPorPartido = parseNum(f.clearancePerGame) ?? item.despejesPorPartido ?? null;
          item.atajadas = parseNum(f.savePerGame) ?? item.atajadas ?? null;
          const gc = parseNum(f.goalsConceded);
          if (gc !== null) item.golesRecibidos = Math.round(gc);
          const og = parseNum(f.ownGoal);
          if (og !== null) item.autogoles = Math.round(og);
        }

        if (pestana === 'passing') {
          item.pasesPorPartido = parseNum(f.passesPerGame) ?? item.pasesPorPartido ?? null;
          item.centrosPorPartido = parseNum(f.crossesPerGame) ?? item.centrosPorPartido ?? null;
        }
      }

      const primerIdActual = filas[0]?.whoScoredId || filas[0]?.nombre || '';
      if (primerIdActual && primerIdActual === ultimoPrimerId) {
        break;
      }
      ultimoPrimerId = primerIdActual;

      let nextBtn: any = null;
      try {
        nextBtn = await page.$(
          `#statistics-paging-${pestana} a#next, #statistics-paging-${pestana} a.next, a#next:not(.disabled), a.next:not(.disabled)`,
        );
      } catch {
        nextBtn = null;
      }

      if (!nextBtn) {
        break;
      }

      let deshabilitado = true;
      try {
        const evalRes = await page.evaluate((btn: any) => {
          if (!btn) return true;
          const cl = btn.className || '';
          return (
            cl.includes('disabled') ||
            btn.getAttribute('aria-disabled') === 'true' ||
            btn.getAttribute('disabled') !== null ||
            btn.style?.display === 'none'
          );
        }, nextBtn);
        deshabilitado = evalRes === undefined ? true : Boolean(evalRes);
      } catch {
        deshabilitado = true;
      }

      if (deshabilitado) {
        break;
      }

      try {
        await nextBtn.click();
        pagina++;
        await this.delayHumano(800, 1500);
      } catch {
        break;
      }
    }
  }
}
