import React from 'react';
import type { MiembroEquipoSemanalUI } from '../../types/team-of-the-week.types';
import { formatearCreditos } from '../../utils/formato-mercado';
import { abreviarNombreJugador } from '../../utils/nombre-jugador';

function tamanoFuenteNombre(nombre: string): string {
  if (nombre.length <= 11) return '0.78rem';
  if (nombre.length <= 14) return '0.68rem';
  return '0.6rem';
}

interface PitchPlayerCardProps {
  miembro: MiembroEquipoSemanalUI;
  onClick: (jugadorId: string) => void;
}

export const PitchPlayerCard: React.FC<PitchPlayerCardProps> = ({
  miembro,
  onClick,
}) => {
  const nombreCorto = abreviarNombreJugador(miembro.nombre);

  const handleClick = () => {
    onClick(miembro.jugadorId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(miembro.jugadorId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="pitch-player-card"
      data-testid={`pitch-player-${miembro.jugadorId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem 0.5rem',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-card, rgba(18, 24, 38, 0.9))',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
        boxShadow: 'var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.4))',
        cursor: 'pointer',
        textAlign: 'center',
        font: 'inherit',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        minWidth: '70px',
        maxWidth: '105px',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--color-emerald-400, #34d399)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.5))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.12))';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.4))';
      }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: tamanoFuenteNombre(nombreCorto),
          lineHeight: 1.15,
          color: 'var(--text-primary, #f1f5f9)',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          width: '100%',
        }}
        title={miembro.nombre}
      >
        {nombreCorto}
      </span>
      <span
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-secondary, #94a3b8)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          marginTop: '2px',
        }}
        title={miembro.equipoNombre}
      >
        {miembro.equipoNombre}
      </span>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--color-emerald-400, #34d399)',
          marginTop: '3px',
        }}
      >
        {formatearCreditos(miembro.cotizacion)} pts
      </span>
    </button>
  );
};

