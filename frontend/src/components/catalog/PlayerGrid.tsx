import React from 'react';
import type { Jugador } from '../../types/player.types';
import { PlayerCard } from './PlayerCard';

export interface PlayerGridProps {
  players: Jugador[];
  onPlayerSelect?: (id: string) => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  players,
  onPlayerSelect,
}) => {
  return (
    <div className="player-grid" data-testid="player-grid">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onSelect={onPlayerSelect}
        />
      ))}
    </div>
  );
};
