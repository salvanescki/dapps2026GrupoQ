import React from 'react';
import { SondaReadinessData, SondaLivenessData } from '../../../types/observability.types';
import { determinarEstadoAlertaMemoria } from '../../../utils/formato-observabilidad';

export interface HealthStatusCardProps {
  readiness: SondaReadinessData | null;
  liveness: SondaLivenessData | null;
  error?: string | null;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({ readiness, liveness, error }) => {
  const heapAlert = liveness ? determinarEstadoAlertaMemoria(liveness.porcentajeHeap) : 'nominal';
  const rssAlert = liveness ? determinarEstadoAlertaMemoria(liveness.porcentajeRss) : 'nominal';

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h2 className="metric-card-title">Salud de Infraestructura y Servicios</h2>
        {readiness && (
          <span className={`status-badge ${readiness.estadoGlobal}`}>
            {readiness.estadoGlobal.toUpperCase()}
          </span>
        )}
      </div>

      {error && (
        <div className="card-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Sonda de Preparación */}
      <div>
        <h3 className="metric-stat-label">Sonda de Preparación (Readiness Probe)</h3>
        <div className="metric-stat-group" style={{ marginTop: '0.5rem' }}>
          <div className="metric-stat-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PostgreSQL</span>
              <span className={`status-badge ${readiness?.baseDatos?.estado || 'offline'}`}>
                {(readiness?.baseDatos?.estado || 'DOWN').toUpperCase()}
              </span>
            </div>
            {readiness?.baseDatos?.mensaje && (
              <small style={{ color: 'var(--color-red-400)', display: 'block', marginTop: '0.25rem' }}>
                {readiness.baseDatos.mensaje}
              </small>
            )}
          </div>

          <div className="metric-stat-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Redis L1</span>
              <span className={`status-badge ${readiness?.redis?.estado || 'offline'}`}>
                {(readiness?.redis?.estado || 'DOWN').toUpperCase()}
              </span>
            </div>
            {readiness?.redis?.mensaje && (
              <small style={{ color: 'var(--color-red-400)', display: 'block', marginTop: '0.25rem' }}>
                {readiness.redis.mensaje}
              </small>
            )}
          </div>

          <div className="metric-stat-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Football-Data</span>
              <span className={`status-badge ${readiness?.footballData?.estado || 'offline'}`}>
                {(readiness?.footballData?.estado || 'DOWN').toUpperCase()}
              </span>
            </div>
            {readiness?.footballData?.mensaje && (
              <small style={{ color: 'var(--color-red-400)', display: 'block', marginTop: '0.25rem' }}>
                {readiness.footballData.mensaje}
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Sonda de Vivacidad y Memoria */}
      <div>
        <h3 className="metric-stat-label">Sonda de Vivacidad (Liveness & Memoria Node.js)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              <span>Heap: {((liveness?.memoriaHeapBytes || 0) / (1024 * 1024)).toFixed(1)} MB / 300 MB</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(liveness?.porcentajeHeap || 0).toFixed(2)}%</span>
            </div>
            <div className="progress-container">
              <div
                data-testid="heap-progress-bar"
                className={`progress-bar ${heapAlert}`}
                style={{ width: `${Math.min(liveness?.porcentajeHeap || 0, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              <span>RSS: {((liveness?.memoriaRssBytes || 0) / (1024 * 1024)).toFixed(1)} MB / 1024 MB</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(liveness?.porcentajeRss || 0).toFixed(2)}%</span>
            </div>
            <div className="progress-container">
              <div
                data-testid="rss-progress-bar"
                className={`progress-bar ${rssAlert}`}
                style={{ width: `${Math.min(liveness?.porcentajeRss || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
