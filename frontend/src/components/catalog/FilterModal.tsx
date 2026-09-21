import React, { useState, useEffect, useMemo } from 'react';
import type {
  LigaItem,
  EquipoItem,
  OpcionesFiltroRespuesta,
} from '../../types/player.types';
import type { PlayerFiltersState } from '../../hooks/usePlayerFilters';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PlayerFiltersState;
  filterOptions: OpcionesFiltroRespuesta | null;
  onApply: (newFilters: Partial<PlayerFiltersState>) => void;
  onReset: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  filterOptions,
  onApply,
  onReset,
}) => {
  const [selectedLeague, setSelectedLeague] = useState(filters.league);
  const [selectedTeamId, setSelectedTeamId] = useState(filters.teamId);
  const [selectedPosition, setSelectedPosition] = useState(filters.position);

  // Sincronizar estado local al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedLeague(filters.league);
      setSelectedTeamId(filters.teamId);
      setSelectedPosition(filters.position);
    }
  }, [isOpen, filters]);

  // Manejar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista de equipos disponibles filtrada según la liga seleccionada
  const availableTeams = useMemo(() => {
    if (!filterOptions?.equipos) return [];
    if (!selectedLeague) return filterOptions.equipos;

    return filterOptions.equipos.filter((equipo) => {
      if (equipo.ligaCodigo) {
        return equipo.ligaCodigo === selectedLeague;
      }
      const ligaMatch = filterOptions.ligas.find(
        (l) => l.codigo === selectedLeague,
      );
      return ligaMatch ? equipo.ligaId === ligaMatch.id : true;
    });
  }, [filterOptions, selectedLeague]);

  // Si cambia la liga y el equipo actual no pertenece a la nueva liga, resetear el equipo seleccionado
  const handleLeagueChange = (newLeague: string) => {
    setSelectedLeague(newLeague);
    if (selectedTeamId && newLeague && filterOptions?.equipos) {
      const equipoActual = filterOptions.equipos.find(
        (e) => e.id === selectedTeamId,
      );
      if (equipoActual && equipoActual.ligaCodigo && equipoActual.ligaCodigo !== newLeague) {
        setSelectedTeamId('');
      }
    }
  };

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      league: selectedLeague,
      teamId: selectedTeamId,
      position: selectedPosition,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedLeague('');
    setSelectedTeamId('');
    setSelectedPosition('');
    onReset();
    onClose();
  };

  return (
    <div
      className="filter-modal-backdrop"
      onClick={onClose}
      data-testid="filter-modal-backdrop"
    >
      <div
        className="filter-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-modal-title"
        data-testid="filter-modal"
      >
        <div className="filter-modal-header">
          <h2 id="filter-modal-title" className="filter-modal-title">
            Filtros de Jugadores
          </h2>
          <button
            type="button"
            className="filter-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal de filtros"
            data-testid="filter-modal-close-btn"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleApply} className="filter-modal-body">
          {/* Selector de Liga */}
          <div className="filter-form-group">
            <label htmlFor="filter-league" className="filter-form-label">
              Liga de Competición
            </label>
            <select
              id="filter-league"
              className="filter-form-select"
              value={selectedLeague}
              onChange={(e) => handleLeagueChange(e.target.value)}
              data-testid="filter-league-select"
            >
              <option value="">Todas las 5 Grandes Ligas</option>
              {filterOptions?.ligas.map((liga) => (
                <option key={liga.id} value={liga.codigo}>
                  {liga.nombre} ({liga.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Equipo */}
          <div className="filter-form-group">
            <label htmlFor="filter-team" className="filter-form-label">
              Equipo / Club
            </label>
            <select
              id="filter-team"
              className="filter-form-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              data-testid="filter-team-select"
            >
              <option value="">Todos los equipos</option>
              {availableTeams.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Posición */}
          <div className="filter-form-group">
            <label htmlFor="filter-position" className="filter-form-label">
              Posición Táctica
            </label>
            <select
              id="filter-position"
              className="filter-form-select"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              data-testid="filter-position-select"
            >
              <option value="">Todas las posiciones</option>
              {filterOptions?.posiciones.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-modal-footer">
            <button
              type="button"
              className="btn-modal-reset"
              onClick={handleReset}
              data-testid="filter-modal-reset-btn"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="btn-modal-apply"
              data-testid="filter-modal-apply-btn"
            >
              Aplicar Filtros
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
