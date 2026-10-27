import React, { useEffect, useRef } from 'react';
import { usePlayerDetail } from '../../hooks/usePlayerDetail';
import { StatsGrid } from './StatsGrid';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';
import './PlayerDetailModal.css';

export interface PlayerDetailModalProps {
  playerId: string | null;
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  playerId,
  onClose,
}) => {
  const { jugador, loading, error, retry } = usePlayerDetail(playerId);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus management and escape key listener
  useEffect(() => {
    if (!playerId) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on close button
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [playerId, onClose]);

  if (!playerId) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="player-detail-overlay"
      data-testid="player-detail-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="player-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-detail-title"
      >
        <header className="player-detail-header">
          <div className="player-detail-header-info">
            <h2 id="player-detail-title" className="player-detail-title">
              {loading && !jugador ? 'Cargando jugador...' : jugador?.nombre || 'Detalle del Jugador'}
            </h2>
            {jugador && (
              <div className="player-detail-subtitle">
                <span>{jugador.equipo.nombre}</span>
                <span>•</span>
                <span>{jugador.posicion}</span>
                {jugador.dorsal !== null && jugador.dorsal !== undefined && (
                  <>
                    <span>•</span>
                    <span>#{jugador.dorsal}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            ref={closeButtonRef}
            id="player-detail-close"
            className="player-detail-close-btn"
            aria-label="Cerrar detalle del jugador"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="player-detail-body">
          {loading && (
            <div className="modal-loading-container" data-testid="modal-loading-spinner">
              <Spinner size="lg" ariaLabel="Cargando detalle del jugador..." />
              <span>Cargando datos y estadísticas...</span>
            </div>
          )}

          {!loading && error && (
            <div className="modal-error-container">
              <Alert tipo="error" mensaje={error} />
              <button
                type="button"
                className="modal-retry-btn"
                onClick={retry}
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && jugador && (
            <>
              {/* Ficha básica */}
              <div className="player-ficha-card">
                <div className="player-ficha-item">
                  <span className="player-ficha-label">Posición</span>
                  <span className="player-ficha-value">{jugador.posicion}</span>
                </div>

                {jugador.posicionOriginal && jugador.posicionOriginal !== jugador.posicion && (
                  <div className="player-ficha-item">
                    <span className="player-ficha-label">Posición Original</span>
                    <span className="player-ficha-value">{jugador.posicionOriginal}</span>
                  </div>
                )}

                <div className="player-ficha-item">
                  <span className="player-ficha-label">Nacionalidad</span>
                  <span className="player-ficha-value">{jugador.nacionalidad}</span>
                </div>

                {jugador.fechaNacimiento && (
                  <div className="player-ficha-item">
                    <span className="player-ficha-label">Nacimiento</span>
                    <span className="player-ficha-value">{jugador.fechaNacimiento}</span>
                  </div>
                )}

                {jugador.dorsal !== null && jugador.dorsal !== undefined && (
                  <div className="player-ficha-item">
                    <span className="player-ficha-label">Dorsal</span>
                    <span className="player-ficha-value">#{jugador.dorsal}</span>
                  </div>
                )}

                <div className="player-ficha-item">
                  <span className="player-ficha-label">Equipo</span>
                  <span className="player-ficha-value">
                    {jugador.equipo.escudoUrl && (
                      <img
                        src={jugador.equipo.escudoUrl}
                        alt={`Escudo de ${jugador.equipo.nombre}`}
                        className="player-team-crest-sm"
                      />
                    )}
                    {jugador.equipo.nombre}
                  </span>
                </div>

                <div className="player-ficha-item">
                  <span className="player-ficha-label">Liga</span>
                  <span className="player-ficha-value">
                    {jugador.liga.emblemaUrl && (
                      <img
                        src={jugador.liga.emblemaUrl}
                        alt={`Emblema de ${jugador.liga.nombre}`}
                        className="player-league-emblem-sm"
                      />
                    )}
                    {jugador.liga.nombre} ({jugador.liga.codigo})
                  </span>
                </div>
              </div>

              {/* Estadísticas WhoScored o mensaje vacío */}
              {jugador.estadisticas ? (
                <StatsGrid
                  estadisticas={jugador.estadisticas}
                  posicion={jugador.posicion}
                />
              ) : (
                <div className="stats-empty-notice" data-testid="stats-empty-notice">
                  Las estadísticas de WhoScored no están disponibles aún para este jugador.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
