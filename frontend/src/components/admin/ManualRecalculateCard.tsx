import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { formatearNombreEstrategia } from '../../utils/formato-mercado';
import type { ResumenRecalculo } from '../../types/marketplace.types';

export interface ManualRecalculateCardProps {
  recalculando: boolean;
  ultimoRecalculo: ResumenRecalculo | null;
  onDispararRecalculo: () => Promise<ResumenRecalculo | null>;
}

export const ManualRecalculateCard: React.FC<ManualRecalculateCardProps> = ({
  recalculando,
  ultimoRecalculo,
  onDispararRecalculo,
}) => {
  const [errorRecalculo, setErrorRecalculo] = useState<string | null>(null);

  const handleClick = async () => {
    if (recalculando) return;
    setErrorRecalculo(null);
    try {
      await onDispararRecalculo();
    } catch (err) {
      setErrorRecalculo(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el recálculo manual de cotizaciones.',
      );
    }
  };

  return (
    <section
      className="admin-card"
      data-testid="manual-recalculate-card"
      aria-label="Ejecución manual de recálculo masivo"
    >
      <div>
        <h2 className="admin-card-title">Recálculo Masivo de Cotizaciones</h2>
        <p className="shadcn-chart-description">
          Revalúa inmediatamente la totalidad del catálogo aplicando la estrategia vigente
        </p>
      </div>

      {recalculando && (
        <div
          className="marketplace-notice-box"
          data-testid="recalculate-progress-notice"
        >
          Procesando recálculo masivo de cotizaciones... Por favor espera sin cerrar esta vista.
        </div>
      )}

      {errorRecalculo && <Alert tipo="error" mensaje={errorRecalculo} />}

      <Button
        type="button"
        variant="primary"
        style={{ width: '100%' }}
        cargando={recalculando}
        disabled={recalculando}
        onClick={() => void handleClick()}
      >
        Recalcular cotizaciones ahora
      </Button>

      {ultimoRecalculo && (
        <div data-testid="recalculate-summary-box">
          <Alert tipo="success" mensaje={ultimoRecalculo.mensaje} />
          <div
            className="admin-recalc-summary-grid"
            style={{ marginTop: '0.75rem' }}
          >
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Procesados</span>
              <span className="admin-recalc-stat-value">
                {ultimoRecalculo.totalJugadoresProcesados}
              </span>
            </div>
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Exitosos</span>
              <span className="admin-recalc-stat-value">
                {ultimoRecalculo.exitosos}
              </span>
            </div>
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Fallidos</span>
              <span className="admin-recalc-stat-value">
                {ultimoRecalculo.fallidos}
              </span>
            </div>
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Sin Estadísticas</span>
              <span className="admin-recalc-stat-value">
                {ultimoRecalculo.sinEstadisticas}
              </span>
            </div>
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Estrategia</span>
              <span className="admin-recalc-stat-value" style={{ fontSize: 'var(--font-size-sm)' }}>
                {formatearNombreEstrategia(ultimoRecalculo.estrategiaAplicada)} (
                {ultimoRecalculo.versionEstrategia})
              </span>
            </div>
            <div className="admin-recalc-stat">
              <span className="admin-recalc-stat-label">Duración</span>
              <span className="admin-recalc-stat-value">
                {`${ultimoRecalculo.duracionMs} ms`}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

