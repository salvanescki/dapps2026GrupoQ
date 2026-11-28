import React from 'react';
import { MetricaDeIntegracionYCache } from '../../../types/observability.types';

export interface SystemIntegrationCardProps {
  integracion: MetricaDeIntegracionYCache | null;
  error?: string | null;
}

export const SystemIntegrationCard: React.FC<SystemIntegrationCardProps> = ({ integracion, error }) => {
  const rateLimitRestante = integracion?.footballDataRateLimitRemaining ?? 10;
  const esRateLimitCritico = rateLimitRestante <= 2;
  const fallbacks = integracion?.cacheFallbacks || 0;

  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h2 className="metric-card-title">Integraciones, Caché L1 y Seguridad</h2>
        <span className="status-badge ok">SERVICIOS L1</span>
      </div>

      {error && (
        <div className="card-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Football-Data y Caché */}
      <div className="metric-stat-group">
        <div className="metric-stat-item">
          <div className="metric-stat-label">Football-Data Rate Limit</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span className={`status-badge ${esRateLimitCritico ? 'warning' : 'ok'}`}>
              {rateLimitRestante} restantes
            </span>
          </div>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
            {integracion?.footballDataRequests || 0} peticiones ejecutadas
          </small>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Caché Redis L1 Hit Ratio</div>
          <div className="metric-stat-value">
            {integracion?.cacheHitRatio !== undefined ? `${integracion.cacheHitRatio.toFixed(2)}%` : '100.00%'}
          </div>
          {fallbacks > 0 && (
            <small style={{ color: 'var(--color-amber-400)', display: 'block', marginTop: '0.25rem' }}>
              ⚠️ {fallbacks} fallbacks a DB
            </small>
          )}
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Team of the Week</div>
          <div className="metric-stat-value">{integracion?.totwGeneraciones || 0} gen.</div>
          <small style={{ color: 'var(--text-secondary)' }}>
            {integracion?.totwDuracionSegundos ? `${integracion.totwDuracionSegundos.toFixed(2)} s prom.` : '-'}
          </small>
        </div>

        <div className="metric-stat-item">
          <div className="metric-stat-label">Autenticación (Logins)</div>
          <div className="metric-stat-value">
            <span style={{ color: 'var(--color-emerald-400)' }}>{integracion?.authIntentosExitosos || 0}</span> /{' '}
            <span style={{ color: 'var(--color-red-400)' }}>{integracion?.authIntentosFallidos || 0}</span>
          </div>
          <small style={{ color: 'var(--text-secondary)' }}>
            Bcrypt:{' '}
            {integracion?.authLatenciaHashingPromedio
              ? `${integracion.authLatenciaHashingPromedio.toFixed(4)} s`
              : '0.0000 s'}
          </small>
        </div>
      </div>
    </div>
  );
};
