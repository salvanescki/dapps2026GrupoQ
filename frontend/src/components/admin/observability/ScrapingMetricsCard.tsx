import React from 'react';
import { MetricaDeIngestion } from '../../../types/observability.types';

export interface ScrapingMetricsCardProps {
  ingestion: MetricaDeIngestion | null;
  error?: string | null;
}

export const ScrapingMetricsCard: React.FC<ScrapingMetricsCardProps> = ({ ingestion, error }) => {
  const ligas = Object.keys(ingestion?.duracionPorLiga || {});

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h2 className="metric-card-title">Pipeline de Ingestión y Scraping</h2>
        <span className="status-badge ok">WHOSCORED</span>
      </div>

      {error && (
        <div className="card-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Resumen de ejecuciones e incidentes */}
      <div className="metric-stat-group">
        <div className="metric-stat-item">
          <div className="metric-stat-label">Ejecuciones Exitosas</div>
          <div className="metric-stat-value" style={{ color: '#16a34a' }}>
            {ingestion?.ejecucionesExitosas || 0}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Ejecuciones Fallidas</div>
          <div className="metric-stat-value" style={{ color: '#dc2626' }}>
            {ingestion?.ejecucionesFallidas || 0}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Recuperadas Atasco</div>
          <div className="metric-stat-value" style={{ color: '#d97706' }}>
            {ingestion?.ejecucionesRecuperadas || 0}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Incidentes Totales</div>
          <div className="metric-stat-value">{ingestion?.incidentesTotales || 0}</div>
        </div>
      </div>

      {/* Desglose por Ligas */}
      <div>
        <h3 className="metric-stat-label" style={{ marginBottom: '0.5rem' }}>
          Rendimiento y Asociación por Liga
        </h3>
        {ligas.length > 0 ? (
          <div className="metric-stat-group">
            {ligas.map((liga) => {
              const duracion = ingestion?.duracionPorLiga[liga];
              const matchRate = ingestion?.tasaAsociacionPorLiga[liga];
              return (
                <div key={liga} className="metric-stat-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Liga {liga}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {duracion !== undefined ? `${duracion.toFixed(2)} s` : '-'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Match: <strong style={{ color: matchRate && matchRate >= 90 ? '#16a34a' : '#d97706' }}>
                      {matchRate !== undefined ? `${matchRate.toFixed(2)}%` : '-'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
            Sin telemetría de ligas en el período
          </div>
        )}
      </div>
    </div>
  );
};
