import React, { useState } from 'react';
import type { Jugador, PosicionJugador } from '../../types/player.types';

interface PlayerCardProps {
  player: Jugador;
}

function getPositionBadgeClass(posicion: PosicionJugador): string {
  switch (posicion) {
    case 'Portero':
      return 'badge-portero';
    case 'Defensa':
      return 'badge-defensa';
    case 'Mediocampista':
      return 'badge-mediocampista';
    case 'Delantero':
      return 'badge-delantero';
    default:
      return 'badge-no-clasificado';
  }
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  const [crestError, setCrestError] = useState(false);

  return (
    <article className="player-card" data-testid={`player-card-${player.id}`}>
      <div className="player-card-header">
        <div className="player-identity">
          <h3 className="player-name">{player.nombre}</h3>
          <span className="player-nationality">{player.nacionalidad}</span>
        </div>
        {player.dorsal !== null && player.dorsal !== undefined && (
          <div className="player-dorsal-tag" title={`Dorsal #${player.dorsal}`}>
            #{player.dorsal}
          </div>
        )}
      </div>

      <div className="player-card-body">
        <div className="player-team-row">
          {player.equipo.escudoUrl && !crestError ? (
            <img
              src={player.equipo.escudoUrl}
              alt={`Escudo de ${player.equipo.nombre}`}
              className="player-team-crest"
              loading="lazy"
              onError={() => setCrestError(true)}
            />
          ) : (
            <div className="player-team-crest-placeholder">
              {player.equipo.tla || player.equipo.nombre.substring(0, 3).toUpperCase()}
            </div>
          )}
          <div className="player-team-details">
            <span className="player-team-name" title={player.equipo.nombre}>
              {player.equipo.nombre}
            </span>
            <span className="player-league-name">
              {player.liga.nombre} ({player.liga.codigo})
            </span>
          </div>
        </div>
      </div>

      <div className="player-card-footer">
        <span
          className={`position-badge ${getPositionBadgeClass(player.posicion)}`}
        >
          {player.posicion}
        </span>
        {player.posicionOriginal && player.posicionOriginal !== player.posicion && (
          <span className="player-league-name" title="Posición táctica externa">
            {player.posicionOriginal}
          </span>
        )}
      </div>
    </article>
  );
};
