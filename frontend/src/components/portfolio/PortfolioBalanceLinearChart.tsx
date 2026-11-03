import React from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import { formatearCreditos } from '../../utils/formato-mercado';
import type { PuntoGraficoPatrimonio } from '../../utils/portfolio-chart';

export interface PortfolioBalanceLinearChartProps {
  serieTemporal: PuntoGraficoPatrimonio[];
  sinOperaciones: boolean;
}

const portfolioChartConfig: ChartConfig = {
  patrimonioNeto: {
    label: 'Patrimonio Neto Total',
    color: 'var(--color-emerald-500)',
  },
  saldoBilletera: {
    label: 'Efectivo Disponible',
    color: 'var(--color-amber-500)',
  },
};

export const PortfolioBalanceLinearChart: React.FC<
  PortfolioBalanceLinearChartProps
> = ({ serieTemporal, sinOperaciones }) => {
  return (
    <section
      className="portfolio-section-card"
      data-testid="portfolio-balance-linear-chart"
      aria-label="Evolución lineal de balance y patrimonio"
    >
      <div className="portfolio-section-header">
        <div>
          <h2 className="portfolio-section-title">
            Evolución de Balance y Patrimonio Neto
          </h2>
          <p className="shadcn-chart-description">
            Reconstrucción lineal determinista en centavos enteros sobre tus operaciones
          </p>
        </div>

        <div className="portfolio-chart-legend">
          <span className="portfolio-legend-item">
            <span className="portfolio-legend-dot emerald" aria-hidden="true" />
            <span>Patrimonio Neto (#10b981)</span>
          </span>
          <span className="portfolio-legend-item">
            <span className="portfolio-legend-dot amber" aria-hidden="true" />
            <span>Efectivo Disponible (#f59e0b)</span>
          </span>
        </div>
      </div>

      {sinOperaciones && (
        <div
          className="marketplace-notice-box"
          data-testid="portfolio-chart-empty-guide"
        >
          Aún no registras operaciones de compra o venta. Tu saldo inicial permanece
          intacto. Explora el{' '}
          <Link
            to="/marketplace"
            style={{ color: 'var(--color-emerald-400)', fontWeight: 600 }}
          >
            Marketplace de Jugadores
          </Link>{' '}
          para adquirir tus primeros tokens coleccionables.
        </div>
      )}

      <ChartContainer config={portfolioChartConfig} altura={270}>
        <LineChart
          accessibilityLayer
          data={serieTemporal}
          margin={{ left: 12, right: 12, top: 10, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="etiquetaEjeX"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis hide domain={['auto', 'auto']} />
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
                    <div>Hito: {String(raw.hitoOperativo ?? '—')}</div>
                    <div>
                      Valoración en tokens:{' '}
                      {formatearCreditos(Number(raw.valoracionTokens ?? 0))} cr.
                    </div>
                  </div>
                )}
              />
            }
          />
          <Line
            dataKey="patrimonioNeto"
            type="linear"
            stroke="var(--color-patrimonioNeto)"
            strokeWidth={2}
            dot={sinOperaciones ? { r: 5 } : false}
            activeDot={{ r: 5 }}
          />
          <Line
            dataKey="saldoBilletera"
            type="linear"
            stroke="var(--color-saldoBilletera)"
            strokeWidth={2}
            dot={sinOperaciones ? { r: 5 } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
};

