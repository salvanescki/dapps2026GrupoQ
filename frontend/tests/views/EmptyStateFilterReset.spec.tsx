import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PlayersCatalogView } from '../../src/views/PlayersCatalogView';
import type {
  RespuestaCatalogoJugadores,
  OpcionesFiltroRespuesta,
} from '../../src/types/player.types';

vi.mock('../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
  getPlayerFilterOptions: vi.fn(),
  getPlayerById: vi.fn(),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Test User', correo: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

import { getPlayers, getPlayerFilterOptions } from '../../src/api/playersApi';

const mockGetPlayers = vi.mocked(getPlayers);
const mockGetPlayerFilterOptions = vi.mocked(getPlayerFilterOptions);

const mockEmptyResponse: RespuestaCatalogoJugadores = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasMore: false,
};

const mockPopulatedResponse: RespuestaCatalogoJugadores = {
  items: [
    {
      id: 'j1',
      externalId: 3189,
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      posicionOriginal: 'Right Winger',
      nacionalidad: 'England',
      dorsal: 7,
      equipo: {
        id: 'e1',
        nombre: 'Arsenal FC',
        tla: 'ARS',
      },
      liga: {
        id: 'l1',
        codigo: 'PL',
        nombre: 'Premier League',
      },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasMore: false,
};

const mockFilterOptions: OpcionesFiltroRespuesta = {
  ligas: [
    {
      id: 'l1',
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
    },
  ],
  equipos: [
    {
      id: 'e1',
      nombre: 'Arsenal FC',
      ligaId: 'l1',
      ligaCodigo: 'PL',
    },
  ],
  posiciones: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
};

describe('EmptyState & Filter Reset (US3 - Restablecimiento de Filtros)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerFilterOptions.mockResolvedValue(mockFilterOptions);
  });

  it('debe mostrar el estado vacío con mensaje amigable cuando la búsqueda no devuelve resultados', async () => {
    mockGetPlayers.mockResolvedValue(mockEmptyResponse);

    render(
      <BrowserRouter>
        <PlayersCatalogView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/sin coincidencias en el catálogo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /no se encontraron jugadores que coincidan con los filtros seleccionados/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-reset-btn')).toBeInTheDocument();
  });

  it('debe restablecer los filtros y recargar los jugadores al presionar Restablecer Filtros en el estado vacío', async () => {
    const user = userEvent.setup();

    // Primero retorna lista vacía
    mockGetPlayers.mockResolvedValueOnce(mockEmptyResponse);

    render(
      <BrowserRouter>
        <PlayersCatalogView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-state-reset-btn')).toBeInTheDocument();
    });

    // Siguiente llamada (al resetear) retorna lista poblada
    mockGetPlayers.mockResolvedValueOnce(mockPopulatedResponse);

    await user.click(screen.getByTestId('empty-state-reset-btn'));

    await waitFor(() => {
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    });
  });

  it('debe permitir abrir el modal de filtros y seleccionar opciones', async () => {
    const user = userEvent.setup();
    mockGetPlayers.mockResolvedValue(mockPopulatedResponse);

    render(
      <BrowserRouter>
        <PlayersCatalogView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-open-filters')).toBeInTheDocument();
    });

    // Abrir modal de filtros
    await user.click(screen.getByTestId('btn-open-filters'));

    expect(screen.getByTestId('filter-modal')).toBeInTheDocument();
    expect(screen.getByTestId('filter-league-select')).toBeInTheDocument();
    expect(screen.getByTestId('filter-team-select')).toBeInTheDocument();
    expect(screen.getByTestId('filter-position-select')).toBeInTheDocument();

    // Cerrar modal
    await user.click(screen.getByTestId('filter-modal-close-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('filter-modal')).not.toBeInTheDocument();
    });
  });
});
