import React from 'react';
import type { Jugador } from '../../types/player.types';
import { PlayerCard } from './PlayerCard';

interface PlayerGridProps {
  players: Jugador[];
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({ players }) => {
  return (
    <div className="player-grid" data-testid="player-grid">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
};
