import * as dotenv from 'dotenv';

dotenv.config();

export interface LigaScrapingConfig {
  liga: string;
  regionId: number;
  tournamentId: number;
  seasonId: number;
  stageId: number;
  nombreTorneo?: string;
}

export interface ScrapingConfig {
  delayMinMs: number;
  delayMaxMs: number;
  seasonLabel: string;
  minJugadoresPorLiga: number;
  minJugadoresGlobal: number;
  leagueConfigs: LigaScrapingConfig[];
}

export const DEFAULT_LEAGUE_CONFIGS: LigaScrapingConfig[] = [
  { liga: 'PL', regionId: 252, tournamentId: 2, seasonId: 12345, stageId: 22345, nombreTorneo: 'Premier League' },
  { liga: 'PD', regionId: 206, tournamentId: 4, seasonId: 12346, stageId: 22346, nombreTorneo: 'LaLiga' },
  { liga: 'SA', regionId: 108, tournamentId: 5, seasonId: 12347, stageId: 22347, nombreTorneo: 'Serie A' },
  { liga: 'BL1', regionId: 81, tournamentId: 3, seasonId: 12348, stageId: 22348, nombreTorneo: 'Bundesliga' },
  { liga: 'FL1', regionId: 74, tournamentId: 22, seasonId: 12349, stageId: 22349, nombreTorneo: 'Ligue 1' },
];

export const getScrapingConfig = (): ScrapingConfig => {
  let leagueConfigs: LigaScrapingConfig[] = DEFAULT_LEAGUE_CONFIGS;

  if (process.env.WHOSCORED_LEAGUE_CONFIGS) {
    try {
      leagueConfigs = JSON.parse(process.env.WHOSCORED_LEAGUE_CONFIGS);
    } catch {
      leagueConfigs = DEFAULT_LEAGUE_CONFIGS;
    }
  }

  return {
    delayMinMs: Number.parseInt(process.env.WHOSCORED_DELAY_MIN_MS || '1500', 10),
    delayMaxMs: Number.parseInt(process.env.WHOSCORED_DELAY_MAX_MS || '3500', 10),
    seasonLabel: process.env.WHOSCORED_SEASON_LABEL || '2025/2026',
    minJugadoresPorLiga: Number.parseInt(process.env.WHOSCORED_MIN_JUGADORES_LIGA || '350', 10),
    minJugadoresGlobal: Number.parseInt(process.env.WHOSCORED_MIN_JUGADORES_GLOBAL || '2000', 10),
    leagueConfigs,
  };
};
