import React from 'react';
import type { EquipoSemanalUI } from '../../types/team-of-the-week.types';
import { PitchPlayerCard } from './PitchPlayerCard';

interface SoccerPitchProps {
  equipo: EquipoSemanalUI;
  onSeleccionarJugador: (id: string) => void;
}

export const SoccerPitch: React.FC<SoccerPitchProps> = ({
  equipo,
  onSeleccionarJugador,
}) => {
  // Filtrar miembros por posición
  const portero = equipo.miembros
    .filter((m) => m.posicion === 'Portero')
    .sort((a, b) => a.orden - b.orden);
  const defensas = equipo.miembros
    .filter((m) => m.posicion === 'Defensa')
    .sort((a, b) => a.orden - b.orden);
  const mediocampistas = equipo.miembros
    .filter((m) => m.posicion === 'Mediocampista')
    .sort((a, b) => a.orden - b.orden);
  const delanteros = equipo.miembros
    .filter((m) => m.posicion === 'Delantero')
    .sort((a, b) => a.orden - b.orden);

  return (
    <div
      className="soccer-pitch-wrapper"
      data-testid="soccer-pitch"
      style={{
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        overflowX: 'hidden',
      }}
    >
      <div
        className="soccer-pitch"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          minHeight: '520px',
          backgroundColor: '#064e3b', // verde cancha
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, transparent 60px, rgba(255, 255, 255, 0.15) 60px, rgba(255, 255, 255, 0.15) 62px, transparent 62px)
          `,
          borderRadius: '12px',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.5))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem 0.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Línea media cancha */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Círculo central */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '90px',
            height: '90px',
            border: '2px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Área Delantera (Superior) - 3 Delanteros */}
        <div
          className="pitch-row pitch-row-forwards"
          data-testid="pitch-row-forwards"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1,
            width: '100%',
          }}
        >
          {delanteros.map((m) => (
            <PitchPlayerCard
              key={m.jugadorId}
              miembro={m}
              onClick={onSeleccionarJugador}
            />
          ))}
        </div>

        {/* Fila Media - 3 Mediocampistas */}
        <div
          className="pitch-row pitch-row-midfielders"
          data-testid="pitch-row-midfielders"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1,
            width: '100%',
          }}
        >
          {mediocampistas.map((m) => (
            <PitchPlayerCard
              key={m.jugadorId}
              miembro={m}
              onClick={onSeleccionarJugador}
            />
          ))}
        </div>

        {/* Fila Baja - 4 Defensas */}
        <div
          className="pitch-row pitch-row-defenders"
          data-testid="pitch-row-defenders"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1,
            width: '100%',
          }}
        >
          {defensas.map((m) => (
            <PitchPlayerCard
              key={m.jugadorId}
              miembro={m}
              onClick={onSeleccionarJugador}
            />
          ))}
        </div>

        {/* Fila Base (Inferior) - 1 Portero */}
        <div
          className="pitch-row pitch-row-goalkeeper"
          data-testid="pitch-row-goalkeeper"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            width: '100%',
          }}
        >
          {portero.map((m) => (
            <PitchPlayerCard
              key={m.jugadorId}
              miembro={m}
              onClick={onSeleccionarJugador}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

