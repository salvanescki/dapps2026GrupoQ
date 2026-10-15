import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveFiltersBar } from '../../../../src/components/catalog/ActiveFiltersBar';
import { FilterModal } from '../../../../src/components/catalog/FilterModal';
import { SearchBar } from '../../../../src/components/catalog/SearchBar';

const mockFilterOptions = {
  ligas: [
    { id: 'l-1', codigo: 'PL', nombre: 'Premier League' },
    { id: 'l-2', codigo: 'PD', nombre: 'La Liga' },
  ],
  equipos: [
    { id: 'e-1', nombre: 'Arsenal FC', ligaCodigo: 'PL', ligaId: 'l-1' },
    { id: 'e-2', nombre: 'FC Barcelona', ligaCodigo: 'PD', ligaId: 'l-2' },
  ],
  posiciones: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
};

describe('Catalog Filter Components', () => {
  describe('ActiveFiltersBar', () => {
    it('no debe renderizar nada si no hay filtros activos', () => {
      const { container } = render(
        <ActiveFiltersBar
          filters={{ league: '', teamId: '', position: '', search: '' }}
          filterOptions={mockFilterOptions}
          onRemoveFilter={vi.fn()}
          onClearAll={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('debe renderizar chips para cada filtro activo y permitir eliminarlos', async () => {
      const user = userEvent.setup();
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={{
            league: 'PL',
            teamId: 'e-1',
            position: 'Delantero',
            search: 'Saka',
          }}
          filterOptions={mockFilterOptions}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByTestId('filter-chip-league')).toHaveTextContent('Premier League (PL)');
      expect(screen.getByTestId('filter-chip-teamId')).toHaveTextContent('Arsenal FC');
      expect(screen.getByTestId('filter-chip-position')).toHaveTextContent('Delantero');
      expect(screen.getByTestId('filter-chip-search')).toHaveTextContent('"Saka"');

      // Click remove en chip de liga
      const removeLeagueBtn = screen.getByTestId('remove-filter-league');
      await user.click(removeLeagueBtn);
      expect(onRemoveFilter).toHaveBeenCalledWith('league');

      // Click en limpiar todos
      const clearAllBtn = screen.getByTestId('clear-all-filters-btn');
      await user.click(clearAllBtn);
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('FilterModal', () => {
    it('no debe renderizarse si isOpen es false', () => {
      render(
        <FilterModal
          isOpen={false}
          onClose={vi.fn()}
          filters={{ league: '', teamId: '', position: '', search: '' }}
          filterOptions={mockFilterOptions}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.queryByTestId('filter-modal')).not.toBeInTheDocument();
    });

    it('debe aplicar filtros seleccionados y cerrar el modal', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <FilterModal
          isOpen={true}
          onClose={onClose}
          filters={{ league: '', teamId: '', position: '', search: '' }}
          filterOptions={mockFilterOptions}
          onApply={onApply}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByTestId('filter-modal')).toBeInTheDocument();

      // Cambiar liga
      await user.selectOptions(screen.getByTestId('filter-league-select'), 'PL');
      // Cambiar posicion
      await user.selectOptions(screen.getByTestId('filter-position-select'), 'Delantero');

      // Aplicar filtros
      await user.click(screen.getByTestId('filter-modal-apply-btn'));

      expect(onApply).toHaveBeenCalledWith({
        league: 'PL',
        teamId: '',
        position: 'Delantero',
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('debe resetear filtros al pulsar restablecer', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      const onClose = vi.fn();

      render(
        <FilterModal
          isOpen={true}
          onClose={onClose}
          filters={{ league: 'PL', teamId: 'e-1', position: 'Delantero', search: '' }}
          filterOptions={mockFilterOptions}
          onApply={vi.fn()}
          onReset={onReset}
        />
      );

      await user.click(screen.getByTestId('filter-modal-reset-btn'));

      expect(onReset).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('debe cerrar modal al pulsar la tecla Escape o el backdrop', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <FilterModal
          isOpen={true}
          onClose={onClose}
          filters={{ league: '', teamId: '', position: '', search: '' }}
          filterOptions={mockFilterOptions}
          onApply={vi.fn()}
          onReset={vi.fn()}
        />
      );

      // Click en backdrop
      await user.click(screen.getByTestId('filter-modal-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);

      // Presionar tecla Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('SearchBar', () => {
    it('debe permitir escribir y limpiar texto de búsqueda', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SearchBar value="Messi" onChange={onChange} debounceMs={50} />);

      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('Messi');

      const clearBtn = screen.getByTestId('search-clear-btn');
      await user.click(clearBtn);

      expect(input.value).toBe('');
      expect(onChange).toHaveBeenCalledWith('');
    });
  });
});
