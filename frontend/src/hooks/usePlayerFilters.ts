import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  LigaItem,
  EquipoItem,
  OpcionesFiltroRespuesta,
} from '../types/player.types';
import { getPlayerFilterOptions } from '../api/playersApi';

export interface PlayerFiltersState {
  league: string;
  teamId: string;
  position: string;
  search: string;
}

export interface UsePlayerFiltersResult {
  filters: PlayerFiltersState;
  filterOptions: OpcionesFiltroRespuesta | null;
  filteredTeams: EquipoItem[];
  loadingOptions: boolean;
  activeFiltersCount: number;
  setLeague: (code: string) => void;
  setTeamId: (id: string) => void;
  setPosition: (pos: string) => void;
  setSearch: (term: string) => void;
  removeFilter: (filterKey: keyof PlayerFiltersState) => void;
  clearFilters: () => void;
  applyFilters: (newFilters: Partial<PlayerFiltersState>) => void;
}

export function usePlayerFilters(
  initialFilters: Partial<PlayerFiltersState> = {},
): UsePlayerFiltersResult {
  const [filters, setFilters] = useState<PlayerFiltersState>({
    league: initialFilters.league || '',
    teamId: initialFilters.teamId || '',
    position: initialFilters.position || '',
    search: initialFilters.search || '',
  });

  const [filterOptions, setFilterOptions] =
    useState<OpcionesFiltroRespuesta | null>(null);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);

  // Cargar metadatos de filtros una sola vez
  useEffect(() => {
    let isMounted = true;
    getPlayerFilterOptions()
      .then((opts) => {
        if (isMounted) {
          setFilterOptions(opts);
        }
      })
      .catch((err) => {
        console.error('Error al cargar opciones de filtro:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingOptions(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrado jerárquico de equipos dependiente de la liga activa
  const filteredTeams = useMemo(() => {
    if (!filterOptions?.equipos) return [];
    if (!filters.league) return filterOptions.equipos;

    return filterOptions.equipos.filter((equipo) => {
      if (equipo.ligaCodigo) {
        return equipo.ligaCodigo === filters.league;
      }
      // Fallback por ID de liga
      const ligaMatch = filterOptions.ligas.find(
        (l) => l.codigo === filters.league,
      );
      return ligaMatch ? equipo.ligaId === ligaMatch.id : true;
    });
  }, [filterOptions, filters.league]);

  // Selección de Liga: si cambia y el equipo activo no pertenece, resetear equipo
  const setLeague = useCallback(
    (code: string) => {
      setFilters((prev) => {
        let newTeamId = prev.teamId;
        if (prev.teamId && code && filterOptions?.equipos) {
          const equipoActual = filterOptions.equipos.find(
            (e) => e.id === prev.teamId,
          );
          if (equipoActual && equipoActual.ligaCodigo && equipoActual.ligaCodigo !== code) {
            newTeamId = '';
          }
        }
        return {
          ...prev,
          league: code,
          teamId: newTeamId,
        };
      });
    },
    [filterOptions],
  );

  const setTeamId = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, teamId: id }));
  }, []);

  const setPosition = useCallback((pos: string) => {
    setFilters((prev) => ({ ...prev, position: pos }));
  }, []);

  const setSearch = useCallback((term: string) => {
    setFilters((prev) => ({ ...prev, search: term }));
  }, []);

  const removeFilter = useCallback((filterKey: keyof PlayerFiltersState) => {
    setFilters((prev) => ({ ...prev, [filterKey]: '' }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      league: '',
      teamId: '',
      position: '',
      search: '',
    });
  }, []);

  const applyFilters = useCallback(
    (newFilters: Partial<PlayerFiltersState>) => {
      setFilters((prev) => {
        const next = { ...prev, ...newFilters };
        // Validar consistencia relacional jerárquica
        if (next.league && next.teamId && filterOptions?.equipos) {
          const equipoActual = filterOptions.equipos.find(
            (e) => e.id === next.teamId,
          );
          if (equipoActual && equipoActual.ligaCodigo && equipoActual.ligaCodigo !== next.league) {
            next.teamId = '';
          }
        }
        return next;
      });
    },
    [filterOptions],
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.league) count++;
    if (filters.teamId) count++;
    if (filters.position) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filterOptions,
    filteredTeams,
    loadingOptions,
    activeFiltersCount,
    setLeague,
    setTeamId,
    setPosition,
    setSearch,
    removeFilter,
    clearFilters,
    applyFilters,
  };
}
