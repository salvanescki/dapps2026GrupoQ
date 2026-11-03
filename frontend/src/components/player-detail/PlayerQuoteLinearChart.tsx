import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { formatearCreditos } from '../../utils/formato-mercado';
import { prepararSerieCotizaciones } from '../../utils/quotes-chart';
import type { CotizacionJugador } from '../../types/marketplace.types';

export interface PlayerQuoteLinearChartProps {
  cotizaciones: CotizacionJugador[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

const quoteChartConfig: ChartConfig = {
  valor: {
    label: 'Cotización (cr.)',
    color: 'var(--color-emerald-500)',
  },
};

export const PlayerQuoteLinearChart: React.FC<PlayerQuoteLinearChartProps> = ({
  cotizaciones,
  cargando,
  error,
  onReintentar,
}) => {
  const { puntos, dominioY, esHistorialUnico } =
    prepararSerieCotizaciones(cotizaciones);

  if (cargando && puntos.length === 0) {
    return (
      <div className="market-panel-box" data-testid="quote-chart-loading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="sm" ariaLabel="Cargando evolución de cotización" />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Cargando evolución histórica de cotizaciones...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-panel-box" data-testid="quote-chart-error">
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {error}
        </p>
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={onReintentar}>
            Reintentar cotizaciones
          </Button>
        </div>
      </div>
    );
  }

  if (puntos.length === 0) {
    return (
      <div
        className="marketplace-empty-box"
        data-testid="quote-chart-empty"
      >
        Aún no se registran cotizaciones históricas para este futbolista.
      </div>
    );
  }

  const unicoPunto = esHistorialUnico ? puntos[0] : null;

  return (
    <div className="market-panel-box" data-testid="player-quote-linear-chart">
      <div className="shadcn-chart-header">
        <div>
          <h3 className="shadcn-chart-title">Evolución de Cotización Oficial</h3>
          <p className="shadcn-chart-description">
            Trazado lineal punto a punto cronológico (créditos por token)
          </p>
        </div>
      </div>

      {esHistorialUnico && (
        <div
          className="shadcn-chart-single-point-notice"
          data-testid="quote-chart-single-notice"
        >
          Cotización inicial registrada ({formatearCreditos(puntos[0].valor)} cr.) — se
          trazarán nuevos segmentos tras el próximo recálculo de mercado.
        </div>
      )}

      <ChartContainer config={quoteChartConfig} altura={230}>
        <LineChart
          accessibilityLayer
          data={puntos}
          margin={{ left: 12, right: 12, top: 10, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="etiquetaEjeX"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis hide domain={dominioY} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const raw = payload[0]?.payload as
                    | Record<string, unknown>
                    | undefined;
                  const fecha = raw?.fechaFormateada;
                  return typeof fecha === 'string' ? fecha : '';
                }}
                valueFormatter={(val) => `${formatearCreditos(val)} cr.`}
                renderExtraFooter={(raw) => (
                  <div>
                    <div>Score deportivo: {Number(raw.score ?? 0).toFixed(4)}</div>
                    <div>Estrategia: {String(raw.estrategiaVersion ?? '—')}</div>
                    {Boolean(raw.sinEstadisticas) && (
                      <div style={{ color: 'var(--color-amber-300)' }}>
                        Sin estadísticas deportivas (valor base)
                      </div>
                    )}
                  </div>
                )}
              />
            }
          />
          <Line
            dataKey="valor"
            type="linear"
            stroke="var(--color-valor)"
            strokeWidth={2}
            dot={esHistorialUnico ? { r: 5 } : false}
            activeDot={{ r: 5 }}
          />
          {unicoPunto && (
            <ReferenceDot
              x={unicoPunto.etiquetaEjeX}
              y={unicoPunto.valor}
              r={5}
              fill="var(--color-emerald-500)"
              stroke="#ffffff"
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
};

