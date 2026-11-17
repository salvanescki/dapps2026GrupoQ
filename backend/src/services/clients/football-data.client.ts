import { Injectable, Logger, Optional } from '@nestjs/common';
import { AppMetricsService } from '../../observability/services/app-metrics.service';

export interface FootballDataArea {
  id?: number;
  name: string;
  code?: string;
  flag?: string;
}

export interface FootballDataCompetition {
  id: number;
  name: string;
  code: string;
  type?: string;
  emblem?: string;
  area?: FootballDataArea;
}

export interface FootballDataSquadMember {
  id: number;
  name: string;
  position?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  shirtNumber?: number | null;
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
  squad?: FootballDataSquadMember[];
}

export interface FootballDataCompetitionTeamsResponse {
  count?: number;
  competition: FootballDataCompetition;
  season?: Record<string, any>;
  teams: FootballDataTeam[];
}

@Injectable()
export class FootballDataClient {
  private readonly logger = new Logger(FootballDataClient.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';
  private readonly apiKey: string;
  private readonly headerName: string;

  constructor(@Optional() private readonly metricsService?: AppMetricsService) {
    this.apiKey = process.env.FOOTBALL_DATA_API_KEY || '';
    this.headerName = process.env.FOOTBALL_DATA_HEADER || 'X-Auth-Token';
  }

  async obtenerEquiposYJugadoresPorLiga(
    codigoLiga: string,
  ): Promise<FootballDataCompetitionTeamsResponse> {
    const url = `${this.baseUrl}/competitions/${codigoLiga}/teams`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey && this.apiKey !== 'tu_api_key') {
      headers[this.headerName] = this.apiKey;
    }

    this.logger.log(`Consultando football-data.org para liga ${codigoLiga}...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const rateLimitHeader =
        response.headers?.get?.('x-requests-available-minute') ||
        response.headers?.get?.('X-Requests-Available-Minute');
      if (rateLimitHeader) {
        const remaining = Number.parseInt(rateLimitHeader, 10);
        if (!Number.isNaN(remaining)) {
          this.metricsService?.setFootballDataRateLimitRemaining(remaining);
        }
      }
      this.metricsService?.recordFootballDataRequest(`/competitions/${codigoLiga}/teams`, response.status);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `Error al consultar football-data.org para ${codigoLiga}: HTTP ${response.status} - ${errorBody}`,
        );
        throw new Error(
          `Error en football-data.org: HTTP ${response.status} al consultar liga ${codigoLiga}`,
        );
      }

      return (await response.json()) as FootballDataCompetitionTeamsResponse;
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith('Error en football-data.org'))) {
        this.metricsService?.recordFootballDataRequest(`/competitions/${codigoLiga}/teams`, 'error');
      }
      throw error;
    }
  }
}
