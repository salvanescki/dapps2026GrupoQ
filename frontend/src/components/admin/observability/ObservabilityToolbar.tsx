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

      <div className="observability-toolbar-actions">
        <span className="observability-sync-text">
          Última sincr.: <strong>{ultimaHora}</strong>
        </span>

        <label htmlFor="selector-intervalo" className="observability-label">
          Refresco:
        </label>
        <select
          id="selector-intervalo"
          className="observability-select"
          value={intervaloRefresco}
          onChange={(e) => onChangeIntervalo(Number(e.target.value) as IntervaloRefresco)}
        >
          <option value={0}>Pausado</option>
          <option value={5000}>Cada 5s</option>
          <option value={10000}>Cada 10s</option>
          <option value={30000}>Cada 30s</option>
        </select>

        <button
          type="button"
          className="observability-refresh-button"
          onClick={onRefrescarManual}
          disabled={actualizando || estadoConexion === 'offline'}
        >
          {actualizando ? 'Actualizando...' : 'Refrescar'}
        </button>
      </div>
    </div>
  );
};
