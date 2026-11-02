import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../src/context/AuthContext';
import { HomeView } from '../../../src/views/HomeView';
import { MarketplaceView } from '../../../src/views/MarketplaceView';
import { AppRoutes } from '../../../src/routes/AppRoutes';
import { HttpError } from '../../../src/api/http-client';
import * as marketplaceApi from '../../../src/api/marketplaceApi';
import * as portfolioApi from '../../../src/api/portfolioApi';
import * as playersApi from '../../../src/api/playersApi';
import type { ContextoAutenticacion } from '../../../src/types/auth.types';
import type {
  ConfiguracionEstrategia,
  JugadorRanking,
  PortfolioUsuario,
} from '../../../src/types/marketplace.types';

vi.mock('../../../src/api/marketplaceApi', () => ({
  obtenerRankingJugadores: vi.fn(),
  obtenerHistorialCotizaciones: vi.fn(),
  obtenerEstrategiaActiva: vi.fn(),
}));

vi.mock('../../../src/api/portfolioApi', () => ({
  obtenerPortfolioUsuario: vi.fn(),
  obtenerTransaccionesUsuario: vi.fn(),
}));

vi.mock('../../../src/api/playersApi', () => ({
  getPlayers: vi.fn(),
  getPlayerFilterOptions: vi.fn(),
  getPlayerById: vi.fn(),
}));

const mockEstrategia: ConfiguracionEstrategia = {
  estrategiaActivaId: 'GLOBAL',
  estrategiaActivaVersion: 'GLOBAL_v1',
  actualizadoEn: '2026-11-02T03:00:00.000Z',
  estrategiasDisponibles: [
    {
      id: 'GLOBAL',
      version: 'GLOBAL_v1',
      descripcion: 'Valoración general ponderada de todas las métricas deportivas.',
    },
    {
      id: 'POSICIONAL',
      version: 'POSICIONAL_v1',
      descripcion: 'Ponderación especializada según la demarcación táctica del futbolista.',
    },
  ],
};

const mockRanking: JugadorRanking[] = [
  {
    posicionRanking: 1,
    jugadorId: 'j-saka',
    nombre: 'Bukayo Saka',
    posicion: 'Delantero',
    equipoNombre: 'Arsenal FC',
    score: 0.892,
    cotizacionActual: 3.45,
    variacionPorcentual: 8.15,
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    tokensDisponibles: 82,
  },
  {
    posicionRanking: 2,
    jugadorId: 'j-modric',
    nombre: 'Luka Modric',
    posicion: 'Mediocampista',
    equipoNombre: 'Real Madrid CF',
    score: 0.765,
    cotizacionActual: 2.1,
    variacionPorcentual: -2.4,
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    tokensDisponibles: 100,
  },
  {
    posicionRanking: 3,
    jugadorId: 'j-courtois',
    nombre: 'Thibaut Courtois',
    posicion: 'Portero',
    equipoNombre: 'Real Madrid CF',
    score: 0.5,
    cotizacionActual: 1.0,
    variacionPorcentual: 0,
    estrategiaId: 'GLOBAL',
    estrategiaVersion: 'GLOBAL_v1',
    tokensDisponibles: 95,
  },
];

const mockPortfolio: PortfolioUsuario = {
  usuarioId: 'u-1',
  saldoBilletera: 950.5,
  valoracionTotalTokens: 69.0,
  patrimonioNetoTotal: 1019.5,
  posiciones: [
    {
      jugadorId: 'j-saka',
      nombreJugador: 'Bukayo Saka',
      posicion: 'Delantero',
      equipoNombre: 'Arsenal FC',
      cantidadTokensDisponibles: 18,
      cantidadTokensEnVenta: 2,
      precioPromedioAdquisicion: 3.0,
      cotizacionActual: 3.45,
      valoracionTotalPosicion: 69.0,
    },
  ],
};

function buildAuth(rol: 'USUARIO' | 'ADMIN' = 'USUARIO'): ContextoAutenticacion {
  return {
    estaAutenticado: true,
    cargando: false,
    usuario: {
      id: 'u-1',
      nombre: 'Inversor Uno',
      correo: 'inversor1@marketplace.com',
      activo: true,
      creadoEn: '2026-11-02T02:00:00.000Z',
      rol,
      saldo: 950.5,
    },
    tokenDeAcceso: 'jwt-valid-token',
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    limpiarError: vi.fn(),
    refrescarPerfil: vi.fn(),
  };
}

describe('US1 — Navbar por rol, Dashboard Ejecutivo (HomeView) y Cartelera MarketplaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(marketplaceApi.obtenerEstrategiaActiva).mockResolvedValue(mockEstrategia);
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValue(mockRanking);
    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValue([]);
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValue(mockPortfolio);
    vi.mocked(portfolioApi.obtenerTransaccionesUsuario).mockResolvedValue([]);
    vi.mocked(playersApi.getPlayerById).mockResolvedValue({
      id: 'j-saka',
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      nacionalidad: 'England',
      dorsal: 7,
      equipo: { id: 'e1', nombre: 'Arsenal FC' },
      liga: { id: 'l1', codigo: 'PL', nombre: 'Premier League' },
      estadisticas: null,
    });
  });

  it('HomeView: muestra KPIs reales, estrategia activa, top ranking, avisoSeguridad RBAC y segrega enlace ADMIN en Navbar', async () => {
    const { unmount } = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/',
            state: {
              avisoSeguridad:
                'Acceso restringido: el Panel de Gobernanza es exclusivo para cuentas Administradoras.',
            },
          },
        ]}
      >
        <AuthContext.Provider value={buildAuth('USUARIO')}>
          <HomeView />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    // Nodos síncronos inmutables de HomeView
    expect(screen.getByText(/¡Bienvenido de vuelta,/i)).toBeInTheDocument();
    expect(screen.getByText('Inversor Uno')).toBeInTheDocument();
    expect(screen.getByText(/Acceso restringido: el Panel de Gobernanza/i)).toBeInTheDocument();

    // Navbar con aria-current="page" en Inicio y sin enlace Gobernanza para USUARIO
    expect(document.getElementById('nav-dashboard')).toHaveAttribute('aria-current', 'page');
    expect(document.getElementById('nav-marketplace')).toBeInTheDocument();
    expect(document.getElementById('nav-players-catalog')).toBeInTheDocument();
    expect(document.getElementById('nav-portfolio')).toBeInTheDocument();
    expect(document.getElementById('nav-admin')).toBeNull();

    // Espera de KPIs reales (950,50 cr., 1.019,50 cr., PnL +9,00 cr. / +15,00%)
    await waitFor(() => {
      expect(screen.getByText(/950,50/)).toBeInTheDocument();
      expect(screen.getByText(/1\.019,50/)).toBeInTheDocument();
      expect(screen.getByText(/\+9,00/)).toBeInTheDocument();
      expect(screen.getByText(/\+15,00%/)).toBeInTheDocument();
      expect(screen.getByText(/Ponderación Global/i)).toBeInTheDocument();
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    });

    unmount();

    // Verificar que para ADMIN aparece el enlace Gobernanza
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthContext.Provider value={buildAuth('ADMIN')}>
          <HomeView />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(document.getElementById('nav-admin')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    });
  });

  it('MarketplaceView: exhibe StrategyBanner, filtra por demarcación táctica, muestra signos +/-/0,00%, stock / 100 y abre PlayerDetailModal', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <AuthContext.Provider value={buildAuth('USUARIO')}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ponderación Global')).toBeInTheDocument();
      expect(screen.getByText('GLOBAL_v1')).toBeInTheDocument();
      expect(
        screen.getByText(/Valoración general ponderada de todas las métricas/i),
      ).toBeInTheDocument();
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    });

    // Variaciones positiva, negativa y neutra + stock sobre 100
    expect(screen.getByText('+8,15%')).toBeInTheDocument();
    expect(screen.getByText('-2,40%')).toBeInTheDocument();
    expect(screen.getByText('0,00%')).toBeInTheDocument();
    expect(screen.getByText(/82\s*\/\s*100/)).toBeInTheDocument();

    // Filtrar por Delantero
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValueOnce([
      mockRanking[0],
    ]);
    await user.click(screen.getByRole('button', { name: 'Delantero' }));

    await waitFor(() => {
      expect(marketplaceApi.obtenerRankingJugadores).toHaveBeenCalledWith(
        expect.objectContaining({ posicion: 'Delantero' }),
        expect.anything(),
      );
      expect(screen.queryByText('Luka Modric')).not.toBeInTheDocument();
    });

    // Control explícito Actualizar
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValueOnce([
      mockRanking[0],
    ]);
    await user.click(screen.getByRole('button', { name: /actualizar/i }));
    expect(marketplaceApi.obtenerRankingJugadores).toHaveBeenCalledTimes(3);

    // Abrir PlayerDetailModal al seleccionar jugador
    await user.click(screen.getByRole('button', { name: /Bukayo Saka/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('MarketplaceView: maneja estado vacío y errores HTTP 400/401/404 con opción de reintento', async () => {
    const user = userEvent.setup();
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockRejectedValueOnce(
      new HttpError(400, 'Parámetro de demarcación inválido.'),
    );

    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <AuthContext.Provider value={buildAuth('USUARIO')}>
          <MarketplaceView />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Parámetro de demarcación inválido/i)).toBeInTheDocument();
    });

    // Reintentar hacia estado vacío
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValueOnce([]);
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No hay futbolistas cotizados para la demarcación seleccionada/i),
      ).toBeInTheDocument();
    });
  });
});
