import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerFilters } from '../../../src/hooks/usePlayerFilters';
import * as playersApi from '../../../src/api/playersApi';

vi.mock('../../../src/api/playersApi', () => ({
  getPlayerFilterOptions: vi.fn(),
  getPlayers: vi.fn(),
}));

describe('usePlayerFilters Hook', () => {
  const mockOptions = {
    ligas: [
      { id: 'l-1', codigo: 'PL', nombre: 'Premier League' },
      { id: 'l-2', codigo: 'PD', nombre: 'La Liga' },
    ],
    equipos: [
      { id: 'e-1', nombre: 'Arsenal', ligaCodigo: 'PL', ligaId: 'l-1' },
      { id: 'e-2', nombre: 'Real Madrid', ligaCodigo: 'PD', ligaId: 'l-2' },
    ],
    posiciones: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playersApi.getPlayerFilterOptions).mockResolvedValue(mockOptions);
  });

  it('debe inicializar filtros vacíos y cargar las opciones de filtro', async () => {
    const { result } = renderHook(() => usePlayerFilters());

    expect(result.current.loadingOptions).toBe(true);
    expect(result.current.filters).toEqual({
      league: '',
      teamId: '',
      position: '',
      search: '',
    });

    await waitFor(() => {
      expect(result.current.loadingOptions).toBe(false);
    });

    expect(result.current.filterOptions).toEqual(mockOptions);
    expect(result.current.filteredTeams).toEqual(mockOptions.equipos);
  });

  it('debe filtrar equipos disponibles segun la liga seleccionada', async () => {
    const { result } = renderHook(() => usePlayerFilters());

    await waitFor(() => {
      expect(result.current.loadingOptions).toBe(false);
    });

    act(() => {
      result.current.setLeague('PL');
    });

    expect(result.current.filters.league).toBe('PL');
    expect(result.current.filteredTeams).toEqual([mockOptions.equipos[0]]);
  });

  it('debe resetear teamId si el equipo actual no pertenece a la nueva liga seleccionada', async () => {
    const { result } = renderHook(() => usePlayerFilters());

    await waitFor(() => {
      expect(result.current.loadingOptions).toBe(false);
    });

    act(() => {
      result.current.setLeague('PL');
      result.current.setTeamId('e-1'); // Arsenal en PL
    });

    expect(result.current.filters.teamId).toBe('e-1');

    act(() => {
      result.current.setLeague('PD'); // Cambia a La Liga
    });

    expect(result.current.filters.league).toBe('PD');
    expect(result.current.filters.teamId).toBe('');
  });

  it('debe actualizar position y search, y calcular activeFiltersCount', async () => {
    const { result } = renderHook(() => usePlayerFilters());

    expect(result.current.activeFiltersCount).toBe(0);

    act(() => {
      result.current.setPosition('Delantero');
      result.current.setSearch('Messi');
    });

    expect(result.current.filters.position).toBe('Delantero');
    expect(result.current.filters.search).toBe('Messi');
    expect(result.current.activeFiltersCount).toBe(2);
  });

  it('debe permitir remover filtros individuales y limpiar todos los filtros', () => {
    const { result } = renderHook(() =>
      usePlayerFilters({ league: 'PL', position: 'Defensa' })
    );

    expect(result.current.filters.league).toBe('PL');
    expect(result.current.filters.position).toBe('Defensa');

    act(() => {
      result.current.removeFilter('position');
    });
    expect(result.current.filters.position).toBe('');
    expect(result.current.filters.league).toBe('PL');

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.filters).toEqual({
      league: '',
      teamId: '',
      position: '',
      search: '',
    });
  });

  it('debe aplicar filtros en bloque con applyFilters', async () => {
    const { result } = renderHook(() => usePlayerFilters());

    await waitFor(() => {
      expect(result.current.loadingOptions).toBe(false);
    });

    act(() => {
      result.current.applyFilters({
        league: 'PL',
        teamId: 'e-1',
        position: 'Mediocampista',
      });
    });

    expect(result.current.filters.league).toBe('PL');
    expect(result.current.filters.teamId).toBe('e-1');
    expect(result.current.filters.position).toBe('Mediocampista');
  });

  it('debe manejar error cuando falla la carga de opciones de filtro', async () => {
    vi.mocked(playersApi.getPlayerFilterOptions).mockRejectedValueOnce(
      new Error('Error de red')
    );

    const { result } = renderHook(() => usePlayerFilters());

    await waitFor(() => {
      expect(result.current.loadingOptions).toBe(false);
    });

    expect(result.current.filterOptions).toBeNull();
  });
});
