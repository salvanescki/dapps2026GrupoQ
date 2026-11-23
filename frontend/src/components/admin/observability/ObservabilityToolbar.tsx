import React from 'react';
import { IntervaloRefresco, EstadoConexion } from '../../../types/observability.types';

export interface ObservabilityToolbarProps {
  intervaloRefresco: IntervaloRefresco;
  onChangeIntervalo: (intervalo: IntervaloRefresco) => void;
  onRefrescarManual: () => void;
  actualizando: boolean;
  ultimaSincronizacion: Date | null;
  estadoConexion: EstadoConexion;
}

export const ObservabilityToolbar: React.FC<ObservabilityToolbarProps> = ({
  intervaloRefresco,
  onChangeIntervalo,
  onRefrescarManual,
  actualizando,
  ultimaSincronizacion,
  estadoConexion,
}) => {
  const ultimaHora = ultimaSincronizacion
    ? ultimaSincronizacion.toLocaleTimeString('es-AR')
    : 'Nunca';

  return (
    <div className="observability-toolbar">
      <div className="observability-toolbar-status">
        <span>Conexión:</span>
        <span className={`status-badge ${estadoConexion}`}>{estadoConexion.toUpperCase()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Última sincr.: <strong>{ultimaHora}</strong>
        </span>

        <label htmlFor="selector-intervalo" style={{ fontSize: '0.875rem', color: '#475569' }}>
          Refresco:
        </label>
        <select
          id="selector-intervalo"
          value={intervaloRefresco}
          onChange={(e) => onChangeIntervalo(Number(e.target.value) as IntervaloRefresco)}
          style={{
            padding: '0.35rem 0.6rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            background: '#ffffff',
          }}
        >
          <option value={0}>Pausado</option>
          <option value={5000}>Cada 5s</option>
          <option value={10000}>Cada 10s</option>
          <option value={30000}>Cada 30s</option>
        </select>

        <button
          type="button"
          onClick={onRefrescarManual}
          disabled={actualizando || estadoConexion === 'offline'}
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: actualizando || estadoConexion === 'offline' ? 'not-allowed' : 'pointer',
            opacity: actualizando || estadoConexion === 'offline' ? 0.6 : 1,
          }}
        >
          {actualizando ? 'Actualizando...' : 'Refrescar'}
        </button>
      </div>
    </div>
  );
};
