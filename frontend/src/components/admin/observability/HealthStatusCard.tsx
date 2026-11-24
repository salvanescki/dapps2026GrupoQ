import React from 'react';
import {
  SondaReadinessData,
  SondaLivenessData,
  MetricaDeRuntimeNode,
} from '../../../types/observability.types';
import { determinarEstadoAlertaMemoria } from '../../../utils/formato-observabilidad';

export interface HealthStatusCardProps {
  readiness: SondaReadinessData | null;
  liveness: SondaLivenessData | null;
  runtime?: MetricaDeRuntimeNode | null;
  error?: string | null;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  readiness,
  liveness,
  runtime,
  error,
}) => {
  const heapBytes = liveness?.memoriaHeapBytes || runtime?.heapUsedBytes || 0;
  const rssBytes = liveness?.memoriaRssBytes || runtime?.rssBytes || 0;
  const umbralHeap = liveness?.umbralHeapBytes || 300 * 1024 * 1024;
  const umbralRss = liveness?.umbralRssBytes || 1024 * 1024 * 1024;
  const porcentajeHeap =
    liveness?.memoriaHeapBytes && liveness.memoriaHeapBytes > 0
      ? liveness.porcentajeHeap
      : Number(((heapBytes / umbralHeap) * 100).toFixed(2));
  const porcentajeRss =
    liveness?.memoriaRssBytes && liveness.memoriaRssBytes > 0
      ? liveness.porcentajeRss
      : Number(((rssBytes / umbralRss) * 100).toFixed(2));

  const heapAlert = determinarEstadoAlertaMemoria(porcentajeHeap);
  const rssAlert = determinarEstadoAlertaMemoria(porcentajeRss);

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
              <span>Heap: {(heapBytes / (1024 * 1024)).toFixed(1)} MB / 300 MB</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{porcentajeHeap.toFixed(2)}%</span>
            </div>
            <div className="progress-container">
              <div
                data-testid="heap-progress-bar"
                className={`progress-bar ${heapAlert}`}
                style={{ width: `${Math.min(porcentajeHeap, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              <span>RSS: {(rssBytes / (1024 * 1024)).toFixed(1)} MB / 1024 MB</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{porcentajeRss.toFixed(2)}%</span>
            </div>
            <div className="progress-container">
              <div
                data-testid="rss-progress-bar"
                className={`progress-bar ${rssAlert}`}
                style={{ width: `${Math.min(porcentajeRss, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sonda de Runtime y Recursos Node.js */}
      {runtime && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <h3 className="metric-stat-label">Runtime y Recursos de Node.js</h3>
          <div className="metric-stat-group" style={{ marginTop: '0.5rem' }}>
            <div className="metric-stat-item">
              <div className="metric-stat-label">Event Loop Delay</div>
              <div className="metric-stat-value" style={{ fontSize: '1.1rem' }}>
                {runtime.eventLoopLagMs.toFixed(2)} ms
              </div>
            </div>

            <div className="metric-stat-item">
              <div className="metric-stat-label">Tiempo CPU Total</div>
              <div className="metric-stat-value" style={{ fontSize: '1.1rem' }}>
                {runtime.cpuSegundosTotal.toFixed(1)} s
              </div>
            </div>

            <div className="metric-stat-item">
              <div className="metric-stat-label">Handles Activos</div>
              <div className="metric-stat-value" style={{ fontSize: '1.1rem' }}>
                {runtime.activeHandles}
                <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                  ({runtime.activeResources} rec.)
                </small>
              </div>
            </div>

            <div className="metric-stat-item">
              <div className="metric-stat-label">Versión Runtime</div>
              <div className="metric-stat-value" style={{ fontSize: '1.1rem' }}>
                {runtime.versionNode || 'Node.js'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
