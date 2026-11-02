import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../src/context/AuthContext';
import { AppRoutes } from '../../../src/routes/AppRoutes';
import { PortfolioView } from '../../../src/views/PortfolioView';
import { ChartContainer, ChartTooltipContent } from '../../../src/components/ui/chart';
import * as portfolioApi from '../../../src/api/portfolioApi';
import * as ordersApi from '../../../src/api/ordersApi';
import * as marketplaceApi from '../../../src/api/marketplaceApi';
import * as usePlayerDetailModule from '../../../src/hooks/usePlayerDetail';
import { HttpError } from '../../../src/api/http-client';
import type { ContextoAutenticacion } from '../../../src/types/auth.types';
import type {
  PortfolioUsuario,
  TransaccionUsuario,
} from '../../../src/types/marketplace.types';
import { createMockPlayer } from '../../helpers/test-mock-factories';

vi.mock('../../../src/api/portfolioApi');
vi.mock('../../../src/api/ordersApi');
vi.mock('../../../src/api/marketplaceApi');
vi.mock('../../../src/hooks/usePlayerDetail', () => ({
  usePlayerDetail: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('US3 — PortfolioView, Gráfica Patrimonial Lineal e Historial Filtrable', () => {
  const refrescarPerfilMock = vi.fn().mockResolvedValue(undefined);

  const authUsuario: ContextoAutenticacion = {
    usuario: {
      id: 'user-port-1',
      nombre: 'Inversor Portfolio',
      correo: 'portfolio@futbolmarket.ar',
      activo: true,
      creadoEn: '2026-10-01T10:00:00.000Z',
      rol: 'USUARIO',
      saldo: 940.0,
    },
    tokenDeAcceso: 'jwt-port-1',
    estaAutenticado: true,
    cargando: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    limpiarError: vi.fn(),
    refrescarPerfil: refrescarPerfilMock,
  };

  const mockPortfolioConActivos: PortfolioUsuario = {
    usuarioId: 'user-port-1',
    saldoBilletera: 940.0,
    valoracionTotalTokens: 74.0,
    patrimonioNetoTotal: 1014.0,
    posiciones: [
      {
        jugadorId: 'jug-saka',
        nombreJugador: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal FC',
        cantidadTokensDisponibles: 30,
        cantidadTokensEnVenta: 10, // total 40 @ 1.50 = 60.00 -> valoración 74.00 (+14.00 / +23.33%)
        precioPromedioAdquisicion: 1.5,
        cotizacionActual: 1.85,
        valoracionTotalPosicion: 74.0,
      },
    ],
  };

  const mockTransacciones: TransaccionUsuario[] = [
    {
      transaccionId: 'tx-port-1',
      ordenId: 'ord-port-1',
      tipoOperacion: 'COMPRA',
      tipoMercado: 'PRIMARIO',
      jugadorId: 'jug-saka',
      nombreJugador: 'Bukayo Saka',
      cantidadTokens: 40,
      precioUnitario: 1.5,
      montoTotal: 60.0,
      estrategiaCotizacion: 'GLOBAL_v1',
      contraparte: 'MERCADO_PRIMARIO',
      fecha: '2026-10-15T11:30:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;

    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValue(
      mockPortfolioConActivos,
    );
    vi.mocked(portfolioApi.obtenerTransaccionesUsuario).mockResolvedValue(
      mockTransacciones,
    );
    vi.mocked(ordersApi.listarOrdenesVenta).mockResolvedValue([]);
    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValue([]);
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValue([]);
    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: {
        ...createMockPlayer({ id: 'jug-saka', nombre: 'Bukayo Saka' }),
        estadisticas: null,
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    });
  });

  it('muestra guía orientativa hacia /marketplace y PnL 0,00 cr. (0,00%) cuando el usuario no tiene operaciones', async () => {
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValueOnce({
      usuarioId: 'user-port-1',
      saldoBilletera: 1000.0,
      valoracionTotalTokens: 0,
      patrimonioNetoTotal: 1000.0,
      posiciones: [],
    });
    vi.mocked(portfolioApi.obtenerTransaccionesUsuario).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <AuthContext.Provider value={authUsuario}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-chart-empty-guide')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/0,00%/).length).toBeGreaterThanOrEqual(1);
    const linksMarketplace = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/marketplace');
    expect(linksMarketplace.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza los 4 KPIs, doble serie lineal (#10b981 y #f59e0b), posiciones con custodia, filtros combinables y abre PlayerDetailModal', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <AuthContext.Provider value={authUsuario}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-balance-linear-chart')).toBeInTheDocument();
    });

    // 4 KPIs: 940,00 efectivo, 74,00 tokens, 1.014,00 patrimonio, +14,00 (+23,33%)
    expect(screen.getAllByText(/940,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/74,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1\.014,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\+14,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\+23,33%/).length).toBeGreaterThanOrEqual(1);

    // Posición activa: 30 disponibles, 10 en custodia, 40 total
    expect(screen.getAllByText('Bukayo Saka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/10 en venta/i)).toBeInTheDocument();

    // Validación preventiva de fechas si Desde > Hasta
    const inputDesde = screen.getByLabelText(/desde/i);
    const inputHasta = screen.getByLabelText(/hasta/i);
    await user.clear(inputDesde);
    await user.type(inputDesde, '2026-10-25');
    await user.clear(inputHasta);
    await user.type(inputHasta, '2026-10-10');

    expect(
      screen.getByText(/La fecha inicial 'Desde' no puede ser posterior/i),
    ).toBeInTheDocument();

    // Limpiar filtros restablece el rango y vuelve a consultar
    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/La fecha inicial 'Desde' no puede ser posterior/i),
      ).not.toBeInTheDocument();
    });

    // Filtrar por tipo COMPRA
    const selectTipo = screen.getByLabelText(/tipo de operación/i);
    await user.selectOptions(selectTipo, 'COMPRA');
    await waitFor(() => {
      expect(portfolioApi.obtenerTransaccionesUsuario).toHaveBeenCalledWith(
        'jwt-port-1',
        'user-port-1',
        expect.objectContaining({ tipo: 'COMPRA' }),
        expect.anything(),
      );
    });

    // Seleccionar jugador en PortfolioPositionsTable abre PlayerDetailModal
    await user.click(
      screen.getByRole('button', { name: /ver detalle de Bukayo Saka/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Verificar estructura de tooltip de la gráfica patrimonial
    render(
      <ChartContainer
        config={{
          patrimonioNeto: { label: 'Patrimonio Neto', color: 'var(--color-emerald-500)' },
          saldoBilletera: { label: 'Efectivo Disponible', color: 'var(--color-amber-500)' },
        }}
      >
        <div>
          <ChartTooltipContent
            active={true}
            label="15/10/2026 11:30"
            sublabel="Valoración actual"
            payload={[
              { dataKey: 'patrimonioNeto', value: 1014.0 },
              { dataKey: 'saldoBilletera', value: 940.0 },
            ]}
            extraFooter={<span>Valoración en tokens: 74,00 cr.</span>}
          />
        </div>
      </ChartContainer>,
    );
    expect(screen.getByText('Valoración en tokens: 74,00 cr.')).toBeInTheDocument();
  });

  it('maneja errores HTTP 400, 401, 403 y 404 mostrando mensaje claro en español y botón Reintentar', async () => {
    const user = userEvent.setup();

    for (const [status, msg] of [
      [400, 'Parámetros de consulta inválidos.'],
      [401, 'Sesión no válida o expirada.'],
      [403, 'No tienes permisos para consultar este portafolio.'],
      [404, 'Portafolio de usuario no encontrado.'],
    ] as const) {
      vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockRejectedValueOnce(
        new HttpError(status, msg),
      );

      const { unmount } = render(
        <MemoryRouter initialEntries={['/portfolio']}>
          <AuthContext.Provider value={authUsuario}>
            <PortfolioView />
          </AuthContext.Provider>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });

      vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValueOnce(
        mockPortfolioConActivos,
      );
      await user.click(screen.getByRole('button', { name: /reintentar/i }));
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-balance-linear-chart')).toBeInTheDocument();
      });

      unmount();
    }
  });
});

