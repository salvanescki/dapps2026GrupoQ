import React from 'react';
import { MetricaDeMarketplace } from '../../../types/observability.types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export interface MarketplaceMetricsCardProps {
  marketplace: MetricaDeMarketplace | null;
  error?: string | null;
}

const chartConfig = {
  cantidad: {
    label: 'Órdenes',
    color: 'var(--color-emerald-500)',
  },
};

export const MarketplaceMetricsCard: React.FC<MarketplaceMetricsCardProps> = ({
  marketplace,
  error,
}) => {
  const chartData = (marketplace?.ordenesDesglose || []).map((o) => ({
    etiqueta: `${o.tipo === 'compra' ? 'Compra' : 'Venta'} (${o.mercado})`,
    cantidad: o.cantidad,
  }));

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h2 className="metric-card-title">Métricas de Trading y Marketplace</h2>
        <span className="status-badge ok">OMS ACTIVO</span>
      </div>

      {error && (
        <div className="card-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="metric-stat-group">
        <div className="metric-stat-item">
          <div className="metric-stat-label">Volumen Total</div>
          <div className="metric-stat-value">{marketplace?.volumenMonetarioFormateado || '$ 0,00'}</div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Transacciones</div>
          <div className="metric-stat-value">{marketplace?.transaccionesTotales || 0}</div>
          {marketplace?.transaccionesDesglose && marketplace.transaccionesDesglose.length > 0 && (
            <small
              style={{
                color: 'var(--text-secondary)',
                display: 'block',
                marginTop: '0.25rem',
                fontSize: '0.75rem',
              }}
            >
              {marketplace.transaccionesDesglose.map((t) => `${t.mercado}: ${t.cantidad}`).join(' · ')}
            </small>
          )}
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Órdenes Venta Activas</div>
          <div className="metric-stat-value">{marketplace?.ordenesVentaActivas || 0}</div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Rechazos Slippage</div>
          <div className="metric-stat-value">{marketplace?.rechazosSlippage || 0}</div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Latencia Liquidación</div>
          <div className="metric-stat-value">
            {marketplace?.latenciaLiquidacionPromedioSegundos
              ? `${marketplace.latenciaLiquidacionPromedioSegundos.toFixed(4)} s`
              : '0.0000 s'}
          </div>
        </div>
      </div>

      {/* Gráfico de barras de órdenes */}
      <div>
        <h3 className="metric-stat-label" style={{ marginBottom: '0.75rem' }}>
          Distribución de Órdenes Creadas ({marketplace?.ordenesTotales || 0} totales)
        </h3>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} altura={220}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                tickMargin={10}
                fontSize={12}
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)' }}
              />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="cantidad" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No hay órdenes registradas en el período
          </div>
        )}
      </div>
    </div>
  );
};
