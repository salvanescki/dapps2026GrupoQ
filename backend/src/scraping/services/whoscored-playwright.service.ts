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

  public async obtenerNavegador(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log('Inicializando instancia Chromium con plugin Stealth...');
      if (!WhoScoredPlaywrightService.stealthRegistrado) {
        chromium.use(stealthPlugin());
        WhoScoredPlaywrightService.stealthRegistrado = true;
      }
      this.browser = await chromium.launch({
        headless: true,
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
      const url =
        config.seasonId && config.seasonId !== 12345
          ? `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}/Seasons/${config.seasonId}/Stages/${config.stageId}`
          : `https://www.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}`;
      this.logger.log(`Descubriendo competición WhoScored (${config.liga}): ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);

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
          'table.standings a.team-link, #standings a.team-link, a[href*="/Teams/" i], a[href*="/teams/" i]',
          (links) => {
            const seen = new Set<string>();
            const res: { whoScoredTeamId: string; nombre: string; url: string }[] = [];
            for (const a of links) {
              const href = a.getAttribute('href') || '';
              const match = href.match(/\/Teams\/(\d+)/i);
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
  ): Promise<RawWhoScoredFeedItem[]> {
    const feedUrl = `https://www.whoscored.com/StatisticsFeed/1/GetPlayerStatistics?category=summary&subcategory=all&statsAccumulationType=0&isCurrent=true&stageId=${stageId}&teamIds=${teamId}&numberOfPlayersToPick=50`;

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
    await this.extraerFilasTabla(page, 'summary', acumulador);
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
          for (const item of items) {
            const whoScoredId = String(item.playerId);
            const stats: RawWhoScoredPlayerStats = {
              whoScoredId,
              nombre: item.name,
              equipoNombre: item.teamName || equipo.nombre,
              partidosJugados: item.apps ?? 0,
              minutosJugados: item.minsPlayed ?? 0,
              goles: item.goals ?? 0,
              asistencias: item.assists ?? 0,
              rating: item.rating !== null && item.rating !== undefined ? Number(item.rating) : null,
              tarjetasAmarillas: item.yellowCard ?? 0,
              tarjetasRojas: item.redCard ?? 0,
            };
            jugadores.set(whoScoredId, stats);
          }
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

    const filas = await page.$$eval('#player-table-statistics-body tr', (rows) => {
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

        return {
          whoScoredId,
          nombre,
          equipoNombre,
          apps: getCol('apps'),
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
          passesPerGame: getCol('passesPerGame'),
          crossesPerGame: getCol('crossesPerGame'),
          savePerGame: getCol('savePerGame'),
          goalsConceded: getCol('goalsConceded'),
          savePercentage: getCol('savePercentage'),
          errorLeadToGoal: getCol('errorLeadToGoal'),
          ownGoal: getCol('ownGoal'),
        };
      });
    });

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
      }

      if (pestana === 'passing') {
        item.pasesPorPartido = parseNum(f.passesPerGame) ?? item.pasesPorPartido ?? null;
        item.centrosPorPartido = parseNum(f.crossesPerGame) ?? item.centrosPorPartido ?? null;
      }
    }
  }
}
