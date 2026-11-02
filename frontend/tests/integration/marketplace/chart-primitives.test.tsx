import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart, Line, XAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../src/components/ui/chart';

const datosDemo = [
  { etiquetaEjeX: '01/11', valor: 1.0 },
  { etiquetaEjeX: '02/11', valor: 1.35 },
  { etiquetaEjeX: '03/11', valor: 1.62 },
];

const configDemo: ChartConfig = {
  valor: {
    label: 'Cotización (cr.)',
    color: 'var(--color-emerald-500)',
  },
};

describe('Primitivas shadcn/ui en chart.tsx (Line Chart - Linear)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('inyecta variables CSS [data-chart] y renderiza SVG de LineChart cuando ResizeObserver es undefined en jsdom', () => {
    // @ts-expect-error simulación explícita de jsdom sin ResizeObserver
    globalThis.ResizeObserver = undefined;

    const { container } = render(
      <ChartContainer config={configDemo} altura={240} data-testid="demo-chart">
        <LineChart accessibilityLayer data={datosDemo}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="etiquetaEjeX" tickLine={false} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Line
            dataKey="valor"
            type="linear"
            stroke="var(--color-valor)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>,
    );

    const chartDiv = screen.getByTestId('demo-chart');
    const chartId = chartDiv.getAttribute('data-chart');
    expect(chartId).toBeTruthy();

    const styleTag = container.querySelector('style');
    expect(styleTag?.innerHTML).toContain(`[data-chart="${chartId}"]`);
    expect(styleTag?.innerHTML).toContain('--color-valor: var(--color-emerald-500)');

    const svg = container.querySelector('svg.recharts-surface');
    expect(svg).not.toBeNull();
    expect(container.querySelector('.recharts-line-curve')).not.toBeNull();
  });

  it('soporta ResizeObserver mockeado localmente y renderiza ChartTooltipContent con metadatos', () => {
    class LocalResizeObserverMock {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: { width: 640, height: 240 } as DOMRectReadOnly,
            } as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = LocalResizeObserverMock as unknown as typeof ResizeObserver;

    const { container } = render(
      <ChartContainer
        config={{
          valor: {
            label: 'Patrimonio',
            theme: { light: '#10b981', dark: '#10b981' },
          },
        }}
        altura={220}
      >
        <LineChart accessibilityLayer data={datosDemo}>
          <XAxis dataKey="etiquetaEjeX" />
          <Line dataKey="valor" type="linear" stroke="var(--color-valor)" dot={false} />
        </LineChart>
      </ChartContainer>,
    );

    expect(container.querySelector('style')?.innerHTML).toContain('--color-valor: #10b981');

    // Verificar renderizado directo y accesible de ChartTooltipContent activo e inactivo
    const { rerender } = render(
      <ChartTooltipContent
        active={false}
        payload={[]}
        label="02/11"
      />,
    );
    expect(screen.queryByTestId('chart-tooltip-box')).not.toBeInTheDocument();

    rerender(
      <ChartContainer config={configDemo}>
        <LineChart data={datosDemo}>
          <Line dataKey="valor" type="linear" />
        </LineChart>
      </ChartContainer>,
    );

    render(
      <ChartTooltipContent
        active={true}
        label="02/11/2026 14:00"
        sublabel="Hito de cotización"
        payload={[
          {
            name: 'valor',
            dataKey: 'valor',
            value: 1.62,
            color: 'var(--color-emerald-500)',
            payload: datosDemo[2],
          },
        ]}
        valueFormatter={(val) => `${val.toFixed(2)} cr.`}
        extraFooter={<span>Versión GLOBAL_v1</span>}
      />,
    );

    expect(screen.getByText('02/11/2026 14:00')).toBeInTheDocument();
    expect(screen.getByText('Hito de cotización')).toBeInTheDocument();
    expect(screen.getByText('1.62 cr.')).toBeInTheDocument();
    expect(screen.getByText('Versión GLOBAL_v1')).toBeInTheDocument();
  });
});

