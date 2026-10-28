import { EjecucionScraping } from './ejecucion-scraping.entity';

export const I_EJECUCION_SCRAPING_REPOSITORY = 'IEjecucionScrapingRepository';

export interface IEjecucionScrapingRepository {
  guardar(ejecucion: EjecucionScraping): Promise<EjecucionScraping>;
  buscarPorId(id: string): Promise<EjecucionScraping | null>;
  buscarUltima(): Promise<EjecucionScraping | null>;
  buscarEnProgreso(): Promise<EjecucionScraping | null>;
  listarPaginado(
    pagina: number,
    limite: number,
  ): Promise<{ datos: EjecucionScraping[]; total: number }>;
}
