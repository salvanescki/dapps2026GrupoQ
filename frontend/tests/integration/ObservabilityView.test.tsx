import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ObservabilityView } from '../../src/views/ObservabilityView';
import { observabilityApiClient } from '../../src/api/observabilityApi';

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

describe('ObservabilityView Integration Test (US6)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('renderiza la vista completa, barra de herramientas y tarjetas de métricas', async () => {
    vi.spyOn(observabilityApiClient, 'obtenerHealthReady').mockResolvedValue({
      estadoGlobal: 'ok',
      baseDatos: { estado: 'up' },
      redis: { estado: 'up' },
      footballData: { estado: 'up' },
    });

    vi.spyOn(observabilityApiClient, 'obtenerHealthLive').mockResolvedValue({
      estadoGlobal: 'ok',
      memoriaHeapBytes: 157286400,
      umbralHeapBytes: 314572800,
      porcentajeHeap: 50,
      memoriaRssBytes: 536870912,
      umbralRssBytes: 1073741824,
      porcentajeRss: 50,
    });

    vi.spyOn(observabilityApiClient, 'obtenerMetrics').mockResolvedValue(`
marketplace_orders_total{tipo="compra",mercado="primario",estado="completada"} 12
marketplace_transactions_total 6
marketplace_volume_cents_total 120000
marketplace_active_sell_orders 3
marketplace_slippage_rejections_total 0
quotes_active_strategy{strategy="GLOBAL_v1"} 1
scraping_executions_total{status="success"} 10
cache_requests_total{result="hit"} 90
cache_requests_total{result="miss"} 10
football_data_rate_limit_remaining 9
`);

    render(<ObservabilityView />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Observabilidad y Métricas del Sistema/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/ONLINE/i)).toBeInTheDocument();
    expect(screen.getByText('Salud de Infraestructura y Servicios')).toBeInTheDocument();
    expect(screen.getByText('Métricas de Trading y Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Supervisión de Valuación y Cotizaciones')).toBeInTheDocument();
    expect(screen.getByText('Pipeline de Ingestión y Scraping')).toBeInTheDocument();
    expect(screen.getByText('Integraciones, Caché L1 y Seguridad')).toBeInTheDocument();

    // Permite cambiar el selector de intervalo
    const select = screen.getByLabelText(/Refresco:/i);
    fireEvent.change(select, { target: { value: '5000' } });
    expect(select).toHaveValue('5000');
  });

  it('permite reintentar o refrescar manualmente mediante el botón Refrescar', async () => {
    const metricsSpy = vi.spyOn(observabilityApiClient, 'obtenerMetrics').mockResolvedValue('');
    vi.spyOn(observabilityApiClient, 'obtenerHealthReady').mockResolvedValue({
      estadoGlobal: 'ok',
      baseDatos: { estado: 'up' },
      redis: { estado: 'up' },
      footballData: { estado: 'up' },
    });
    vi.spyOn(observabilityApiClient, 'obtenerHealthLive').mockResolvedValue({
      estadoGlobal: 'ok',
      memoriaHeapBytes: 100,
      umbralHeapBytes: 300,
      porcentajeHeap: 33,
      memoriaRssBytes: 200,
      umbralRssBytes: 1000,
      porcentajeRss: 20,
    });

    render(<ObservabilityView />);

    await waitFor(() => {
      expect(screen.getByText('Salud de Infraestructura y Servicios')).toBeInTheDocument();
    });

    const botonRefrescar = screen.getByRole('button', { name: /Refrescar/i });
    fireEvent.click(botonRefrescar);

    await waitFor(() => {
      expect(metricsSpy).toHaveBeenCalledTimes(2);
    });
  });
});
