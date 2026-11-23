import React from 'react';
import { MetricaDeCotizaciones } from '../../../types/observability.types';

export interface PricingMetricsCardProps {
  cotizaciones: MetricaDeCotizaciones | null;
  error?: string | null;
}

export const PricingMetricsCard: React.FC<PricingMetricsCardProps> = ({ cotizaciones, error }) => {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h2 className="metric-card-title">Supervisión de Valuación y Cotizaciones</h2>
        <span className="status-badge ok">{cotizaciones?.estrategiaActiva || 'GLOBAL_v1'}</span>
      </div>

      {error && (
        <div className="card-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Métricas clave de recálculo */}
      <div className="metric-stat-group">
        <div className="metric-stat-item">
          <div className="metric-stat-label">Tasa de Éxito</div>
          <div className="metric-stat-value">
            {cotizaciones?.tasaExitoRecalculos !== undefined
              ? `${cotizaciones.tasaExitoRecalculos.toFixed(2)}%`
              : '100.00%'}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Recálculos Exitosos</div>
          <div className="metric-stat-value">{cotizaciones?.recalculosExitosos || 0}</div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Recálculos Fallidos</div>
          <div className="metric-stat-value">{cotizaciones?.recalculosFallidos || 0}</div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Duración Promedio</div>
          <div className="metric-stat-value">
            {cotizaciones?.duracionPromedioSegundos
              ? `${cotizaciones.duracionPromedioSegundos.toFixed(4)} s`
              : '0.0000 s'}
          </div>
        </div>
      </div>

      {/* Desglose de Jugadores Evaluados */}
      <div>
        <h3 className="metric-stat-label" style={{ marginBottom: '0.5rem' }}>
          Jugadores Evaluados en Valuación
        </h3>
        <div className="metric-stat-group">
          <div className="metric-stat-item">
            <div className="metric-stat-label">Con Estadísticas</div>
            <div className="metric-stat-value" style={{ color: '#16a34a' }}>
              {cotizaciones?.jugadoresProcesados || 0}
            </div>
          </div>
          <div className="metric-stat-item">
            <div className="metric-stat-label">Sin Estadísticas</div>
            <div className="metric-stat-value" style={{ color: '#d97706' }}>
              {cotizaciones?.jugadoresSinEstadisticas || 0}
            </div>
          </div>
          <div className="metric-stat-item">
            <div className="metric-stat-label">Fallidos</div>
            <div className="metric-stat-value" style={{ color: '#dc2626' }}>
              {cotizaciones?.jugadoresFallidos || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
