import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MarketplaceMetricsCard } from '../../../src/components/admin/observability/MarketplaceMetricsCard';
import { MetricaDeMarketplace } from '../../../src/types/observability.types';

class MockResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 500,
            height: 300,
            top: 0,
            left: 0,
            bottom: 300,
            right: 500,
            x: 0,
            y: 0,
            toJSON: () => {},
          },
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

describe('MarketplaceMetricsCard (US3 Integration)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  const mockMarketplace: MetricaDeMarketplace = {
    ordenesTotales: 35,
    ordenesDesglose: [
      { tipo: 'compra', mercado: 'primario', estado: 'completada', cantidad: 20 },
      { tipo: 'venta', mercado: 'secundario', estado: 'creada', cantidad: 15 },
    ],
    transaccionesTotales: 18,
    volumenCentavosTotal: 250000,
    volumenMonetarioFormateado: '$ 2.500,00',
    ordenesVentaActivas: 7,
    rechazosSlippage: 2,
    latenciaLiquidacionPromedioSegundos: 0.125,
  };

  it('renderiza tarjetas de resumen transaccional con datos monetarios, ordenes y latencia', () => {
    render(<MarketplaceMetricsCard marketplace={mockMarketplace} />);

    expect(screen.getByText('Métricas de Trading y Marketplace')).toBeInTheDocument();
    expect(screen.getByText('$ 2.500,00')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('0.1250 s')).toBeInTheDocument();
  });

  it('muestra banner de error aislado si se proporciona prop error', () => {
    render(
      <MarketplaceMetricsCard
        marketplace={mockMarketplace}
        error="Fallo al obtener métricas del mercado"
      />
    );
    expect(screen.getByText('Fallo al obtener métricas del mercado')).toBeInTheDocument();
  });
});
