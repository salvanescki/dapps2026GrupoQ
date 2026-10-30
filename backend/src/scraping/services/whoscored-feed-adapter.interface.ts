/**
 * Registro de jugador devuelto por `/StatisticsFeed/1/GetPlayerStatistics`.
 *
 * Los nombres de campo reflejan EXACTAMENTE las claves JSON reales del feed de WhoScored
 * (verificadas contra la respuesta en vivo). Cada combinación category/subcategory expone
 * sólo un subconjunto de estas claves:
 *  - summary/all:       apps, subOn, minsPlayed, goal, assistTotal, yellowCard, redCard,
 *                       shotsPerGame, passSuccess, aerialWonPerGame, manOfTheMatch, rating
 *  - summary/offensive: goal, assistTotal, shotsPerGame, keyPassPerGame, dribbleWonPerGame, ...
 *  - summary/defensive: tacklePerGame, interceptionPerGame, clearancePerGame, goalOwn, ...
 *  - summary/passing:   totalPassesPerGame, passSuccess, accurateCrossesPerGame, ...
 *  - xg-stats/summary:  xG (total), xGPerNinety, totalShots, ...
 *  - saves/shotzone:    saveTotal (por partido con statsAccumulationType=0), ...
 *
 * Nota: los totales (goal, assistTotal, goalOwn, yellowCard, redCard, minsPlayed, apps, xG)
 * se devuelven acumulados; los campos `*PerGame` son promedios por partido.
 */
export interface RawWhoScoredFeedItem {
  playerId: number | string;
  name: string;
  teamId?: number | string;
  teamName?: string;
  apps?: number;
  subOn?: number;
  minsPlayed?: number;
  goal?: number;
  assistTotal?: number;
  rating?: number;
  shotsPerGame?: number | null;
  passSuccess?: number | null;
  aerialWonPerGame?: number | null;
  yellowCard?: number;
  redCard?: number;
  manOfTheMatch?: number;
  dribbleWonPerGame?: number | null;
  keyPassPerGame?: number | null;
  tacklePerGame?: number | null;
  interceptionPerGame?: number | null;
  clearancePerGame?: number | null;
  goalOwn?: number | null;
  totalPassesPerGame?: number | null;
  accurateCrossesPerGame?: number | null;
  xG?: number | null;
  xGPerNinety?: number | null;
  saveTotal?: number | null;
}

export interface WhoScoredFeedResponse {
  playerTableStats?: RawWhoScoredFeedItem[];
  stageId?: number;
  page?: number;
  totalPages?: number;
}

export class WhoScoredFeedIncompatibleException extends Error {
  constructor(mensaje: string) {
    super(`[WhoScoredFeed] Formato de feed incompatible: ${mensaje}`);
    this.name = 'WhoScoredFeedIncompatibleException';
  }
}

export function validarWhoScoredFeedPayload(payload: any): RawWhoScoredFeedItem[] {
  if (!payload || typeof payload !== 'object') {
    throw new WhoScoredFeedIncompatibleException('El payload recibido no es un objeto válido.');
  }

  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.playerTableStats)
    ? payload.playerTableStats
    : null;

  if (!items) {
    throw new WhoScoredFeedIncompatibleException(
      'El payload no contiene la lista playerTableStats ni es un array de jugadores.',
    );
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      throw new WhoScoredFeedIncompatibleException(
        `El elemento en el índice ${i} no es un objeto válido.`,
      );
    }

    if (item.playerId === undefined || item.playerId === null || String(item.playerId).trim() === '') {
      throw new WhoScoredFeedIncompatibleException(
        `El elemento en el índice ${i} carece del campo obligatorio 'playerId'.`,
      );
    }

    if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
      throw new WhoScoredFeedIncompatibleException(
        `El elemento en el índice ${i} carece del campo obligatorio 'name' o es vacío.`,
      );
    }
  }

  return items;
}
