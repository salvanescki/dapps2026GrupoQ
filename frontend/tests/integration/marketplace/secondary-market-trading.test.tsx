import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../src/context/AuthContext';
import { PlayerDetailModal } from '../../../src/components/player-detail/PlayerDetailModal';
import { PortfolioView } from '../../../src/views/PortfolioView';
import * as usePlayerDetailModule from '../../../src/hooks/usePlayerDetail';
import * as marketplaceApi from '../../../src/api/marketplaceApi';
import * as ordersApi from '../../../src/api/ordersApi';
import * as portfolioApi from '../../../src/api/portfolioApi';
import { HttpError } from '../../../src/api/http-client';
import type { ContextoAutenticacion } from '../../../src/types/auth.types';
import type {
  OrdenVenta,
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

describe('US4 — Mercado Secundario P2P: Publicación, Libro de Órdenes, Compra Parcial/Total y Cancelación', () => {
  const refrescarPerfilMock = vi.fn().mockResolvedValue(undefined);

  function buildAuth(id: string, nombre: string, saldo = 250.0): ContextoAutenticacion {
    return {
      usuario: {
        id,
        nombre,
        correo: `${id}@futbolmarket.ar`,
        activo: true,
        creadoEn: '2026-10-01T10:00:00.000Z',
        rol: 'USUARIO',
        saldo,
      },
      tokenDeAcceso: `jwt-${id}`,
      estaAutenticado: true,
      cargando: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      limpiarError: vi.fn(),
      refrescarPerfil: refrescarPerfilMock,
    };
  }

  const ordenMasBarataTercero: OrdenVenta = {
    ordenId: 'ord-cheap-1',
    jugadorId: 'jug-saka',
    vendedorId: 'trader-2',
    cantidad: 4,
    cantidadRestante: 3,
    precioUnitario: 1.75,
    estado: 'PARCIAL',
    creadoEn: '2026-10-20T10:00:00.000Z',
    actualizadoEn: '2026-10-20T10:30:00.000Z',
  };

  const ordenPropiaTrader1: OrdenVenta = {
    ordenId: 'ord-own-1',
    jugadorId: 'jug-saka',
    vendedorId: 'trader-1',
    cantidad: 3,
    cantidadRestante: 2,
    precioUnitario: 1.9,
    estado: 'PARCIAL',
    creadoEn: '2026-10-20T09:00:00.000Z',
    actualizadoEn: '2026-10-20T09:30:00.000Z',
  };

  const portfolioTrader1: PortfolioUsuario = {
    usuarioId: 'trader-1',
    saldoBilletera: 250.0,
    valoracionTotalTokens: 9.25,
    patrimonioNetoTotal: 259.25,
    posiciones: [
      {
        jugadorId: 'jug-saka',
        nombreJugador: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal FC',
        cantidadTokensDisponibles: 3,
        cantidadTokensEnVenta: 2,
        precioPromedioAdquisicion: 1.5,
        cotizacionActual: 1.85,
        valoracionTotalPosicion: 9.25,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;

    vi.mocked(usePlayerDetailModule.usePlayerDetail).mockReturnValue({
      jugador: {
        ...createMockPlayer({
          id: 'jug-saka',
          nombre: 'Bukayo Saka',
          posicion: 'Delantero',
        }),
        estadisticas: null,
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    vi.mocked(marketplaceApi.obtenerHistorialCotizaciones).mockResolvedValue([
      {
        id: 'cot-1',
        jugadorId: 'jug-saka',
        score: 0.84,
        valor: 1.85,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        sinEstadisticas: false,
        metricas: null,
        fechaCotizacion: '2026-10-20T12:00:00.000Z',
      },
    ]);
    vi.mocked(marketplaceApi.obtenerRankingJugadores).mockResolvedValue([
      {
        posicionRanking: 1,
        jugadorId: 'jug-saka',
        nombre: 'Bukayo Saka',
        posicion: 'Delantero',
        equipoNombre: 'Arsenal FC',
        score: 0.84,
        cotizacionActual: 1.85,
        variacionPorcentual: 5.0,
        estrategiaId: 'GLOBAL',
        estrategiaVersion: 'GLOBAL_v1',
        tokensDisponibles: 45,
      },
    ]);
    // Entregadas desordenadas para verificar ordenamiento precioUnitario ASC en SecondaryOrderBook
    vi.mocked(ordersApi.listarOrdenesVenta).mockResolvedValue([
      ordenPropiaTrader1,
      ordenMasBarataTercero,
    ]);
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValue(
      portfolioTrader1,
    );
    vi.mocked(portfolioApi.obtenerTransaccionesUsuario).mockResolvedValue([]);
  });

  it('PlayerDetailModal: ordena SecondaryOrderBook por precioUnitario ASC, bloquea autocompra propia con Cancelar orden, permite compra parcial/total a terceros y publica venta', async () => {
    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={buildAuth('trader-1', 'Trader Uno')}>
        <PlayerDetailModal playerId="jug-saka" onClose={vi.fn()} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('secondary-order-book')).toBeInTheDocument();
      expect(screen.getByTestId('publish-sell-order-form')).toBeInTheDocument();
    });

    // Verificar ordenamiento precioUnitario ASC: primero 1,75 cr. (trader-2), luego 1,90 cr. (propia trader-1)
    const items = screen.getAllByTestId('secondary-order-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/1,75/);
    expect(items[1]).toHaveTextContent(/1,90/);

    // En la oferta propia (items[1]) no hay botón Comprar oferta y sí hay Cancelar orden
    expect(
      within(items[1]).queryByRole('button', { name: /comprar oferta/i }),
    ).not.toBeInTheDocument();
    expect(
      within(items[1]).getByRole('button', { name: /cancelar orden/i }),
    ).toBeInTheDocument();

    // Compra parcial sobre la oferta de tercero (items[0]): comprar 2 de 3 remanentes a 1,75 = 3,50 cr.
    const inputCantSec = within(items[0]).getByLabelText(/cantidad a comprar/i);
    await user.clear(inputCantSec);
    await user.type(inputCantSec, '2');

    vi.mocked(ordersApi.comprarTokens).mockResolvedValueOnce({
      transaccionId: 'tx-sec-1',
      ordenId: 'ord-cheap-1',
      jugadorId: 'jug-saka',
      cantidadTokensComprados: 2,
      precioUnitarioPagado: 1.75,
      montoTotalDebitado: 3.5,
      saldoRestanteUsuario: 246.5,
      tipoMercado: 'SECUNDARIO',
      estrategiaCotizacion: 'MERCADO_SECUNDARIO',
      fecha: '2026-10-20T15:00:00.000Z',
    });

    await user.click(
      within(items[0]).getByRole('button', { name: /comprar oferta/i }),
    );

    await waitFor(() => {
      expect(ordersApi.comprarTokens).toHaveBeenCalledWith('jwt-trader-1', {
        jugadorId: 'jug-saka',
        cantidad: 2,
        ordenVentaId: 'ord-cheap-1',
      });
    });

    // Publicar orden de venta secundaria desde PlayerDetailModal (2 tokens a 2,10 cr.)
    const formVenta = screen.getByTestId('publish-sell-order-form');
    const inputCantVenta = within(formVenta).getByLabelText(/cantidad a vender/i);
    const inputPrecioVenta = within(formVenta).getByLabelText(/precio unitario/i);
    await user.clear(inputCantVenta);
    await user.type(inputCantVenta, '2');
    await user.clear(inputPrecioVenta);
    await user.type(inputPrecioVenta, '2.10');

    expect(within(formVenta).getByText(/4,20\s*cr\./i)).toBeInTheDocument();

    vi.mocked(ordersApi.publicarOrdenVenta).mockResolvedValueOnce({
      ordenId: 'ord-new-sell',
      jugadorId: 'jug-saka',
      vendedorId: 'trader-1',
      cantidad: 2,
      cantidadRestante: 2,
      precioUnitario: 2.1,
      estado: 'PENDIENTE',
      creadoEn: '2026-10-20T15:05:00.000Z',
      actualizadoEn: '2026-10-20T15:05:00.000Z',
    });

    await user.click(
      within(formVenta).getByRole('button', { name: /publicar orden de venta/i }),
    );

    await waitFor(() => {
      expect(ordersApi.publicarOrdenVenta).toHaveBeenCalledWith('jwt-trader-1', {
        jugadorId: 'jug-saka',
        cantidad: 2,
        precioUnitario: 2.1,
      });
    });

    // Cancelar la orden propia desde SecondaryOrderBook
    vi.mocked(ordersApi.cancelarOrdenVenta).mockResolvedValueOnce({
      ...ordenPropiaTrader1,
      estado: 'CANCELADA',
      cantidadRestante: 0,
    });

    const itemsActuales = screen.getAllByTestId('secondary-order-item');
    await user.click(
      within(itemsActuales[1]).getByRole('button', { name: /cancelar orden/i }),
    );

    await waitFor(() => {
      expect(ordersApi.cancelarOrdenVenta).toHaveBeenCalledWith(
        'jwt-trader-1',
        'ord-own-1',
      );
    });
  });

  it('PortfolioView: publica venta rápida desde botón Vender reflejando custodia y cancela desde OpenSellOrdersSection restituyendo disponibles', async () => {
    const user = userEvent.setup();

    vi.mocked(ordersApi.listarOrdenesVenta).mockResolvedValue([
      ordenPropiaTrader1,
    ]);

    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <AuthContext.Provider value={buildAuth('trader-1', 'Trader Uno')}>
          <PortfolioView />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('open-sell-orders-section')).toBeInTheDocument();
    });

    // Publicar venta rápida desde PortfolioPositionsTable ("Vender")
    await user.click(screen.getByRole('button', { name: /^vender$/i }));
    const formVentaPort = await screen.findByTestId('publish-sell-order-form');

    const inputCant = within(formVentaPort).getByLabelText(/cantidad a vender/i);
    const inputPrecio = within(formVentaPort).getByLabelText(/precio unitario/i);
    await user.clear(inputCant);
    await user.type(inputCant, '1');
    await user.clear(inputPrecio);
    await user.type(inputPrecio, '1.95');

    vi.mocked(ordersApi.publicarOrdenVenta).mockResolvedValueOnce({
      ordenId: 'ord-port-sell-2',
      jugadorId: 'jug-saka',
      vendedorId: 'trader-1',
      cantidad: 1,
      cantidadRestante: 1,
      precioUnitario: 1.95,
      estado: 'PENDIENTE',
      creadoEn: '2026-10-20T16:00:00.000Z',
      actualizadoEn: '2026-10-20T16:00:00.000Z',
    });

    // Tras publicar, 1 token adicional pasa a custodia (2 disp + 3 en venta = 5 total)
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValueOnce({
      ...portfolioTrader1,
      posiciones: [
        {
          ...portfolioTrader1.posiciones[0],
          cantidadTokensDisponibles: 2,
          cantidadTokensEnVenta: 3,
        },
      ],
    });

    await user.click(
      within(formVentaPort).getByRole('button', { name: /publicar orden de venta/i }),
    );

    await waitFor(() => {
      expect(ordersApi.publicarOrdenVenta).toHaveBeenCalledWith('jwt-trader-1', {
        jugadorId: 'jug-saka',
        cantidad: 1,
        precioUnitario: 1.95,
      });
      expect(screen.getByText(/3 en venta/i)).toBeInTheDocument();
    });

    // Cancelar orden desde OpenSellOrdersSection restituyendo tokens disponibles (5 disp, 0 en venta)
    vi.mocked(ordersApi.cancelarOrdenVenta).mockResolvedValueOnce({
      ...ordenPropiaTrader1,
      estado: 'CANCELADA',
      cantidadRestante: 0,
    });
    vi.mocked(ordersApi.listarOrdenesVenta).mockResolvedValueOnce([]);
    vi.mocked(portfolioApi.obtenerPortfolioUsuario).mockResolvedValueOnce({
      ...portfolioTrader1,
      posiciones: [
        {
          ...portfolioTrader1.posiciones[0],
          cantidadTokensDisponibles: 5,
          cantidadTokensEnVenta: 0,
        },
      ],
    });

    const seccionAbiertas = screen.getByTestId('open-sell-orders-section');
    await user.click(
      within(seccionAbiertas).getByRole('button', { name: /cancelar orden/i }),
    );

    await waitFor(() => {
      expect(ordersApi.cancelarOrdenVenta).toHaveBeenCalledWith(
        'jwt-trader-1',
        'ord-own-1',
      );
      expect(screen.queryByText(/en venta/i)).not.toBeInTheDocument();
    });
  });

  it('maneja errores HTTP 400, 403, 404 y conflicto de concurrencia 409 refrescando el libro de órdenes automáticamente', async () => {
    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={buildAuth('trader-1', 'Trader Uno')}>
        <PlayerDetailModal playerId="jug-saka" onClose={vi.fn()} />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('secondary-order-book')).toBeInTheDocument();
    });

    const llamadasInicialesLibro = vi.mocked(ordersApi.listarOrdenesVenta).mock
      .calls.length;

    for (const [status, msg] of [
      [400, 'La cantidad solicitada supera el remanente de la orden.'],
      [403, 'No puedes comprar tu propia orden de venta.'],
      [404, 'La orden de venta ya no existe.'],
      [409, 'La oferta acaba de ser adquirida o cancelada por otro inversor.'],
    ] as const) {
      vi.mocked(ordersApi.comprarTokens).mockRejectedValueOnce(
        new HttpError(status, msg),
      );
      const primerItem = screen.getAllByTestId('secondary-order-item')[0];
      await user.click(
        within(primerItem).getByRole('button', { name: /comprar oferta/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });
    }

    // Verifica que tras los rechazos (incluido 409) se re-consultó automáticamente el libro secundario
    expect(
      vi.mocked(ordersApi.listarOrdenesVenta).mock.calls.length,
    ).toBeGreaterThan(llamadasInicialesLibro);
  });
});

