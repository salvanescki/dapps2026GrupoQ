import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class FootballDataHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(FootballDataHealthIndicator.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly headerName: string;
  private readonly timeoutMs: number = 3000;

  constructor(
    @Optional() @Inject('FOOTBALL_DATA_BASE_URL') customBaseUrl?: string,
  ) {
    super();
    this.baseUrl = customBaseUrl || 'https://api.football-data.org/v4';
    this.apiKey = process.env.FOOTBALL_DATA_API_KEY || '';
    this.headerName = process.env.FOOTBALL_DATA_HEADER || 'X-Auth-Token';
  }

  async isHealthy(key: string = 'footballData'): Promise<HealthIndicatorResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey && this.apiKey !== 'tu_api_key') {
        headers[this.headerName] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/competitions`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Football-Data devuelve 200, o 403/400 si falta api key, pero la conectividad con el servicio es exitosa
      // Un 5xx indicaría indisponibilidad del servicio externo
      if (response.status < 500) {
        return this.getStatus(key, true, { httpStatus: response.status });
      }

      throw new Error(`Servicio externo respondió con status ${response.status}`);
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      const errorMsg = isTimeout
        ? `Timeout de conexión tras ${this.timeoutMs}ms al consultar Football-Data`
        : error.message;

      const result = this.getStatus(key, false, { message: errorMsg });
      throw new HealthCheckError('Fallo en health check de Football-Data', result);
    }
  }
}
