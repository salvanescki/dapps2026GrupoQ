import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PlayersCatalogView } from '../../src/views/PlayersCatalogView';
import type {
  RespuestaCatalogoJugadores,
  OpcionesFiltroRespuesta,
} from '../../src/types/player.types';

// Mock del cliente API
vi.mock('../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
  getPlayerFilterOptions: vi.fn(),
  getPlayerById: vi.fn(),
}));

// Mock del hook useAuth
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Test User', correo: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

import { getPlayers, getPlayerFilterOptions } from '../../src/api/playersApi';

const mockGetPlayers = vi.mocked(getPlayers);
const mockGetPlayerFilterOptions = vi.mocked(getPlayerFilterOptions);

const mockFilterOptions: OpcionesFiltroRespuesta = {
  ligas: [
    {
      id: 'l1',
      codigo: 'PL',
      nombre: 'Premier League',
      pais: 'Inglaterra',
      emblemaUrl: 'https://crests.football-data.org/PL.png',
    },
    {
      id: 'l2',
      codigo: 'PD',
      nombre: 'La Liga',
      pais: 'España',
      emblemaUrl: 'https://crests.football-data.org/PD.png',
    },
  ],
  equipos: [
    {
      id: 'e1',
      nombre: 'Arsenal FC',
      nombreCorto: 'Arsenal',
      tla: 'ARS',
      escudoUrl: 'https://crests.football-data.org/57.png',
      ligaId: 'l1',
      ligaCodigo: 'PL',
    },
    {
      id: 'e2',
      nombre: 'Real Madrid CF',
      nombreCorto: 'Real Madrid',
      tla: 'RMA',
      escudoUrl: 'https://crests.football-data.org/86.png',
      ligaId: 'l2',
      ligaCodigo: 'PD',
    },
  ],
  posiciones: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
};

const mockRespuestaCatalogo: RespuestaCatalogoJugadores = {
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
        nombreCorto: 'Arsenal',
        tla: 'ARS',
        escudoUrl: 'https://crests.football-data.org/57.png',
      },
      liga: {
        id: 'l1',
        codigo: 'PL',
        nombre: 'Premier League',
        pais: 'Inglaterra',
      },
    },
    {
      id: 'j2',
      externalId: 3190,
      nombre: 'Luka Modrić',
      posicion: 'Mediocampista',
      posicionOriginal: 'Central Midfield',
      nacionalidad: 'Croatia',
      dorsal: 10,
      equipo: {
        id: 'e2',
        nombre: 'Real Madrid CF',
        nombreCorto: 'Real Madrid',
        tla: 'RMA',
        escudoUrl: 'https://crests.football-data.org/86.png',
      },
      liga: {
        id: 'l2',
        codigo: 'PD',
        nombre: 'La Liga',
        pais: 'España',
      },
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasMore: false,
};

function renderCatalogView() {
  return render(
    <BrowserRouter>
      <PlayersCatalogView />
    </BrowserRouter>,
  );
}

describe('PlayersCatalogView (US1 - Exploración del Catálogo de Jugadores)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerFilterOptions.mockResolvedValue(mockFilterOptions);
  });

  it('debe renderizar el título del catálogo y el estado inicial', async () => {
    mockGetPlayers.mockResolvedValue(mockRespuestaCatalogo);

    renderCatalogView();

    expect(
      screen.getByRole('heading', {
        name: /catálogo de jugadores de las 5 grandes ligas/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/2 futbolistas disponibles/i)).toBeInTheDocument();
    });
  });

  it('debe renderizar las tarjetas de los futbolistas con sus datos esenciales', async () => {
    mockGetPlayers.mockResolvedValue(mockRespuestaCatalogo);

    renderCatalogView();

    await waitFor(() => {
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
      expect(screen.getByText('Luka Modrić')).toBeInTheDocument();
    });

    expect(screen.getByText('Arsenal FC')).toBeInTheDocument();
    expect(screen.getByText('Real Madrid CF')).toBeInTheDocument();
    expect(screen.getByText('England')).toBeInTheDocument();
    expect(screen.getByText('Croatia')).toBeInTheDocument();
    expect(screen.getByText('Delantero')).toBeInTheDocument();
    expect(screen.getByText('Mediocampista')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('#10')).toBeInTheDocument();
  });

  it('debe mostrar mensaje de error si falla la llamada a la API', async () => {
    mockGetPlayers.mockRejectedValue(new Error('Fallo de conexión'));

    renderCatalogView();

    await waitFor(() => {
      expect(screen.getByTestId('catalog-error')).toBeInTheDocument();
      expect(screen.getByText('Fallo de conexión')).toBeInTheDocument();
    });
  });

  it('debe renderizar la barra de búsqueda y el botón para desplegar filtros', async () => {
    mockGetPlayers.mockResolvedValue(mockRespuestaCatalogo);

    renderCatalogView();

    expect(
      screen.getByPlaceholderText(/buscar futbolista por nombre/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('btn-open-filters')).toBeInTheDocument();
  });
});
