import { Injectable, Logger } from '@nestjs/common';

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

  constructor() {
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

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

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
  }
}
