import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from '../../../src/context/AuthContext';
import { PlayerDetailModal } from '../../../src/components/player-detail/PlayerDetailModal';
import { ChartTooltipContent, ChartContainer } from '../../../src/components/ui/chart';
import * as usePlayerDetailModule from '../../../src/hooks/usePlayerDetail';
import * as marketplaceApi from '../../../src/api/marketplaceApi';
import * as ordersApi from '../../../src/api/ordersApi';
import * as portfolioApi from '../../../src/api/portfolioApi';
import { HttpError } from '../../../src/api/http-client';
import type { ContextoAutenticacion, RolUsuario } from '../../../src/types/auth.types';
import type {
  CotizacionJugador,
  JugadorRanking,
  PortfolioUsuario,
} from '../../../src/types/marketplace.types';
import { createMockPlayer } from '../../helpers/test-mock-factories';

vi.mock('../../../src/hooks/usePlayerDetail', () => ({
  usePlayerDetail: vi.fn(),
}));
vi.mock('../../../src/api/marketplaceApi');
vi.mock('../../../src/api/ordersApi');
vi.mock('../../../src/api/portfolioApi');

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('US2 — PlayerDetailModal + PlayerQuoteLinearChart + PrimaryBuyForm', () => {
  const refrescarPerfilMock = vi.fn().mockResolvedValue(undefined);
  const onMarketMutationMock = vi.fn();
  const onCloseMock = vi.fn();

  const mockJugador = {
    ...createMockPlayer({
      id: 'jug-saka',
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      nacionalidad: 'England',
      dorsal: 7,
      equipo: { id: 'e1', nombre: 'Arsenal FC' },
      liga: { id: 'l1', codigo: 'PL', nombre: 'Premier League' },
    }),
    estadisticas: {
      temporada: '2025/2026',
      liga: 'Premier League',
      partidosJugados: 28,
      minutosJugados: 2450,
      goles: 15,
      asistencias: 9,
      tarjetasAmarillas: 2,
      tarjetasRojas: 0,
      rating: 7.82,
    },
  };

  const mockCotizacionesDesc: CotizacionJugador[] = [
    {
      id: 'cot-2',
      jugadorId: 'jug-saka',
      score: 0.8421,
      valor: 1.85,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      sinEstadisticas: false,
      metricas: { goals: 0.9, rating: 0.85 },
      fechaCotizacion: '2026-10-20T12:00:00.000Z',
    },
    {
      id: 'cot-1',
      jugadorId: 'jug-saka',
      score: 0.71,
      valor: 1.5,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      sinEstadisticas: false,
      metricas: { goals: 0.7, rating: 0.75 },
      fechaCotizacion: '2026-10-18T12:00:00.000Z',
    },
  ];

  const mockRankingBase: JugadorRanking[] = [
    {
      posicionRanking: 1,
      jugadorId: 'jug-saka',
      nombre: 'Bukayo Saka',
      posicion: 'Delantero',
      equipoNombre: 'Arsenal FC',
      score: 0.8421,
      cotizacionActual: 1.85,
      variacionPorcentual: 23.33,
      estrategiaId: 'GLOBAL',
      estrategiaVersion: 'GLOBAL_v1',
      tokensDisponibles: 82,
    },
  ];

  const mockPortfolioInicial: PortfolioUsuario = {
    usuarioId: 'user-1',
    saldoBilletera: 100.0,
    valoracionTotalTokens: 3.7,
    patrimonioNetoTotal: 103.7,
    posiciones: [
      {
        jugadorId: 'jug-saka',
        nombreJugador: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal FC',
        cantidadTokensDisponibles: 2,
        cantidadTokensEnVenta: 0,
        precioPromedioAdquisicion: 1.5,
        cotizacionActual: 1.85,
        valoracionTotalPosicion: 3.7,
      },
    ],
  };

  function buildAuth(rol: RolUsuario = 'USUARIO', saldo = 100.0): ContextoAutenticacion {
    return {
      usuario: {
        id: rol === 'ADMIN' ? 'admin-1' : 'user-1',
        nombre: rol === 'ADMIN' ? 'Admin Plataforma' : 'Inversor Uno',
        correo: rol === 'ADMIN' ? 'admin@futbolmarket.ar' : 'trader1@futbolmarket.ar',
        activo: true,
        creadoEn: '2026-10-01T10:00:00.000Z',
        rol,
        saldo,
      },
      tokenDeAcceso: 'jwt-token-us2',
      estaAutenticado: true,
      cargando: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
      refrescarPerfil: refrescarPerfilMock,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;

    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: mockJugador,
      loading: false,
      error: null,
      retry: vi.fn(),
    });
    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValue(
      mockCotizacionesDesc,
    );
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValue(mockRankingBase);
    vi.mocked(ordersApi.listarOrdenesVenta).mockResolvedValue([]);
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValue(mockPortfolioInicial);
  });

  it('renderiza gráfica lineal (N, 1 y 0 puntos), calcula costo en tiempo real y ejecuta compra primaria 200 OK con revalidación', async () => {
    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={buildAuth('USUARIO', 100.0)}>
        <PlayerDetailModal
          playerId="jug-saka"
          onClose={onCloseMock}
          onMarketMutation={onMarketMutationMock}
        />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('player-market-section')).toBeInTheDocument();
      expect(screen.getByTestId('player-quote-linear-chart')).toBeInTheDocument();
    });

    // Indicadores del panel: cotización vigente 1,85 cr., stock 82 / 100, tenencia 2 tokens
    expect(screen.getAllByText(/1,85/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/82\s*\/\s*100/)).toBeInTheDocument();

    // Ingresar cantidad = 4 y precioMaximoUnitario = 1.90 -> costo estimado = 7,40 cr.
    const inputCantidad = screen.getByLabelText(/cantidad de tokens/i);
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '4');

    const inputPrecioMax = screen.getByLabelText(/precio máximo unitario/i);
    await user.clear(inputPrecioMax);
    await user.type(inputPrecioMax, '1.90');

    expect(screen.getByText(/7,40\s*cr\./i)).toBeInTheDocument();

    // Configurar respuesta 200 OK de compra primaria y revalidación posterior
    vi.mocked(ordersApi.comprarTokens).mockResolvedValueOnce({
      transaccionId: 'tx-prim-1',
      ordenId: 'ord-prim-1',
      jugadorId: 'jug-saka',
      cantidadTokensComprados: 4,
      precioUnitarioPagado: 1.85,
      montoTotalDebitado: 7.4,
      saldoRestanteUsuario: 92.6,
      tipoMercado: 'PRIMARIO',
      estrategiaCotizacion: 'GLOBAL_v1',
      fecha: '2026-10-20T14:00:00.000Z',
    });

    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValueOnce([
      { ...mockRankingBase[0], tokensDisponibles: 78 },
    ]);
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValueOnce({
      ...mockPortfolioInicial,
      saldoBilletera: 92.6,
      posiciones: [
        {
          ...mockPortfolioInicial.posiciones[0],
          cantidadTokensDisponibles: 6,
          valoracionTotalPosicion: 11.1,
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: /confirmar compra primaria/i }));

    await waitFor(() => {
      expect(ordersApi.comprarTokens).toHaveBeenCalledWith('jwt-token-us2', {
        jugadorId: 'jug-saka',
        cantidad: 4,
        precioMaximoUnitario: 1.9,
      });
      expect(refrescarPerfilMock).toHaveBeenCalledTimes(1);
      expect(onMarketMutationMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/78\s*\/\s*100/)).toBeInTheDocument();
      expect(screen.getAllByText(/92,60/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/6 tokens/)).toBeInTheDocument();
    });
  });

  it('muestra avisos específicos para historial vacío (0 puntos), punto único (1 punto) y tooltip con sinEstadisticas', async () => {
    // 1. Caso 0 puntos
    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValueOnce([]);
    const { unmount } = render(
      <AuthContext.Provider value={buildAuth('USUARIO')}>
        <PlayerDetailModal playerId="jug-saka" onClose={onCloseMock} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('quote-chart-empty')).toBeInTheDocument();
    });
    unmount();

    // 2. Caso 1 punto con sinEstadisticas: true
    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValueOnce([
      {
        id: 'cot-base',
        jugadorId: 'jug-saka',
        score: 0,
        valor: 1.0,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: true,
        metricas: null,
        fechaCotizacion: '2026-10-01T10:00:00.000Z',
      },
    ]);

    render(
      <AuthContext.Provider value={buildAuth('USUARIO')}>
        <PlayerDetailModal playerId="jug-saka" onClose={onCloseMock} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('quote-chart-single-notice')).toBeInTheDocument();
    });

    // Verificar renderizado directo del contenido de tooltip con sinEstadisticas === true
    render(
      <ChartContainer
        config={{ valor: { label: 'Cotización (cr.)', color: 'var(--color-emerald-500)' } }}
      >
        <div>
          <ChartTooltipContent
            active={true}
            label="01 oct 2026"
            payload={[
              {
                dataKey: 'valor',
                name: 'Cotización (cr.)',
                value: 1.0,
                payload: {
                  fechaFormateada: '01 oct 2026, 10:00',
                  score: 0,
                  estrategiaVersion: 'GLOBAL_v1',
                  sinEstadisticas: true,
                },
              },
            ]}
            renderExtraFooter={(raw) => (
              <div>
                <span>Score: {Number(raw.score).toFixed(4)}</span>
                <span>Estrategia: {String(raw.estrategiaVersion)}</span>
                {Boolean(raw.sinEstadisticas) && (
                  <span>Sin estadísticas deportivas (valor base)</span>
                )}
              </div>
            )}
          />
        </div>
      </ChartContainer>,
    );

    expect(
      screen.getByText(/Sin estadísticas deportivas \(valor base\)/i),
    ).toBeInTheDocument();
  });

  it('muestra agotamiento primario (0/100), bloqueo preventivo para ADMIN y mensajes claros ante errores HTTP 400/401/404/409', async () => {
    const user = userEvent.setup();

    // 1. Bloqueo ADMIN
    const { unmount: unmountAdmin } = render(
      <AuthContext.Provider value={buildAuth('ADMIN', 1000)}>
        <PlayerDetailModal playerId="jug-saka" onClose={onCloseMock} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Administradora.*no puede autocomprar inventario primario/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /confirmar compra primaria/i }),
    ).toBeDisabled();
    unmountAdmin();

    // 2. Stock primario agotado (0 / 100)
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValueOnce([
      { ...mockRankingBase[0], tokensDisponibles: 0 },
    ]);
    const { unmount: unmountAgotado } = render(
      <AuthContext.Provider value={buildAuth('USUARIO', 100)}>
        <PlayerDetailModal playerId="jug-saka" onClose={onCloseMock} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/0\s*\/\s*100/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('primary-buy-exhausted')).toHaveTextContent(
        /mercado secundario/i,
      );
    });
    unmountAgotado();

    // 3. Errores HTTP 400, 401, 404 y 409 en español
    render(
      <AuthContext.Provider value={buildAuth('USUARIO', 500)}>
        <PlayerDetailModal playerId="jug-saka" onClose={onCloseMock} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('primary-buy-form')).toBeInTheDocument();
    });

    for (const [status, msg] of [
      [400, 'Saldo insuficiente o cantidad inválida.'],
      [401, 'Tu sesión expiró. Inicia sesión nuevamente.'],
      [404, 'El futbolista solicitado no existe en el mercado.'],
      [409, 'Conflicto de concurrencia: el stock cambió durante la operación.'],
    ] as const) {
      vi.mocked(ordersApi.comprarTokens).mockRejectedValueOnce(
        new HttpError(status, msg),
      );
      await user.click(screen.getByRole('button', { name: /confirmar compra primaria/i }));
      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });
    }
  });
});
