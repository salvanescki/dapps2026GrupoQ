import React from 'react';
import { MetricaDeIngestion } from '../../../types/observability.types';

export interface ScrapingMetricsCardProps {
  ingestion: MetricaDeIngestion | null;
  error?: string | null;
}

export const ScrapingMetricsCard: React.FC<ScrapingMetricsCardProps> = ({ ingestion, error }) => {
  const ligas = Array.from(
    new Set([
      ...Object.keys(ingestion?.duracionPorLiga || {}),
      ...Object.keys(ingestion?.tasaAsociacionPorLiga || {}),
    ])
  ).filter((liga) => liga !== 'GLOBAL' || (ingestion?.duracionPorLiga?.GLOBAL !== undefined && ingestion.duracionPorLiga.GLOBAL > 0));

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
          <div className="metric-stat-value" style={{ color: 'var(--color-emerald-400)' }}>
            {ingestion?.ejecucionesExitosas || 0}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Ejecuciones Fallidas</div>
          <div className="metric-stat-value" style={{ color: 'var(--color-red-400)' }}>
            {ingestion?.ejecucionesFallidas || 0}
          </div>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Recuperadas Atasco</div>
          <div className="metric-stat-value" style={{ color: 'var(--color-amber-400)' }}>
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
              const incidentes = ingestion?.incidentesPorLiga?.[liga];
              return (
                <div key={liga} className="metric-stat-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {liga === 'GLOBAL' ? 'Global' : `Liga ${liga}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {duracion !== undefined ? `${duracion.toFixed(2)} s` : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div>
                      Match:{' '}
                      <strong
                        style={{
                          color:
                            matchRate !== undefined && matchRate >= 90
                              ? 'var(--color-emerald-400)'
                              : 'var(--color-amber-400)',
                        }}
                      >
                        {matchRate !== undefined ? `${matchRate.toFixed(2)}%` : '-'}
                      </strong>
                    </div>
                    {incidentes !== undefined && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: incidentes > 0 ? 'var(--color-red-400)' : 'var(--text-secondary)',
                        }}
                      >
                        {incidentes} inc.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sin telemetría de ligas en el período
          </div>
        )}
      </div>
    </div>
  );
};
