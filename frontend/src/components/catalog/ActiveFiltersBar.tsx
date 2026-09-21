import React from 'react';
import type { PlayerFiltersState } from '../../hooks/usePlayerFilters';
import type { OpcionesFiltroRespuesta } from '../../types/player.types';

interface ActiveFiltersBarProps {
  filters: PlayerFiltersState;
  filterOptions: OpcionesFiltroRespuesta | null;
  onRemoveFilter: (key: keyof PlayerFiltersState) => void;
  onClearAll: () => void;
}

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  filters,
  filterOptions,
  onRemoveFilter,
  onClearAll,
}) => {
  const chips: Array<{
    key: keyof PlayerFiltersState;
    label: string;
    value: string;
  }> = [];

  if (filters.league) {
    const liga = filterOptions?.ligas.find((l) => l.codigo === filters.league);
    chips.push({
      key: 'league',
      label: 'Liga',
      value: liga ? `${liga.nombre} (${liga.codigo})` : filters.league,
    });
  }

  if (filters.teamId) {
    const equipo = filterOptions?.equipos.find((e) => e.id === filters.teamId);
    chips.push({
      key: 'teamId',
      label: 'Equipo',
      value: equipo ? equipo.nombre : 'Equipo seleccionado',
    });
  }

  if (filters.position) {
    chips.push({
      key: 'position',
      label: 'Posición',
      value: filters.position,
    });
  }

  if (filters.search) {
    chips.push({
      key: 'search',
      label: 'Búsqueda',
      value: `"${filters.search}"`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filters-bar" data-testid="active-filters-bar">
      <span className="active-filters-label">Filtros activos:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="filter-chip"
          data-testid={`filter-chip-${chip.key}`}
        >
          <strong>{chip.label}:</strong> {chip.value}
          <button
            type="button"
            className="filter-chip-remove"
            onClick={() => onRemoveFilter(chip.key)}
            aria-label={`Eliminar filtro ${chip.label}`}
            data-testid={`remove-filter-${chip.key}`}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        className="btn-clear-all-filters"
        onClick={onClearAll}
        data-testid="clear-all-filters-btn"
      >
        Limpiar todos
      </button>
    </div>
  );
};
