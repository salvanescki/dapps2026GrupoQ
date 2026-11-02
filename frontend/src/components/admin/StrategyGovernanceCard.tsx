import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  formatearFechaHoraCorta,
  formatearNombreEstrategia,
} from '../../utils/formato-mercado';
import type {
  ConfiguracionEstrategia,
  EstrategiaDisponible,
  EstrategiaId,
} from '../../types/marketplace.types';

export interface StrategyGovernanceCardProps {
  estrategia: ConfiguracionEstrategia | null;
  cambiando: boolean;
  onCambiarEstrategia: (
    estrategiaId: EstrategiaId,
  ) => Promise<ConfiguracionEstrategia>;
}

const OPCIONES_FALLBACK: EstrategiaDisponible[] = [
  {
    id: 'GLOBAL',
    version: 'GLOBAL_v1',
    descripcion: 'Valoración general ponderada de todas las métricas deportivas.',
  },
  {
    id: 'POSICIONAL',
    version: 'POSICIONAL_v1',
    descripcion:
      'Ponderación especializada según la demarcación táctica del futbolista.',
  },
];

export const StrategyGovernanceCard: React.FC<StrategyGovernanceCardProps> = ({
  estrategia,
  cambiando,
  onCambiarEstrategia,
}) => {
  const [errorCambio, setErrorCambio] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const opciones =
    estrategia?.estrategiasDisponibles &&
    estrategia.estrategiasDisponibles.length > 0
      ? estrategia.estrategiasDisponibles
      : OPCIONES_FALLBACK;

  const handleSeleccionar = async (id: EstrategiaId) => {
    setErrorCambio(null);
    setMensajeExito(null);
    try {
      const nueva = await onCambiarEstrategia(id);
      setMensajeExito(
        `Estrategia activa actualizada a ${formatearNombreEstrategia(
          nueva.estrategiaActivaId,
        )} (${nueva.estrategiaActivaVersion}).`,
      );
    } catch (err) {
      setErrorCambio(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la estrategia de valuación.',
      );
    }
  };

  return (
    <section
      className="admin-card"
      data-testid="strategy-governance-card"
      aria-label="Gobernanza de estrategia de valuación"
    >
      <div>
        <h2 className="admin-card-title">Estrategia de Valuación del Mercado</h2>
        {estrategia && (
          <p className="shadcn-chart-description">
            Vigente: <strong>{formatearNombreEstrategia(estrategia.estrategiaActivaId)}</strong>{' '}
            (<span className="strategy-version-pill">{estrategia.estrategiaActivaVersion}</span>)
            {' • '}Actualizado: {formatearFechaHoraCorta(estrategia.actualizadoEn)}
          </p>
        )}
      </div>

      {errorCambio && <Alert tipo="error" mensaje={errorCambio} />}
      {mensajeExito && <Alert tipo="success" mensaje={mensajeExito} />}

      <div className="admin-strategy-options">
        {opciones.map((op) => {
          const esActiva = estrategia?.estrategiaActivaId === op.id;
          const nombreLegible = formatearNombreEstrategia(op.id);

          return (
            <div
              key={op.id}
              className={`admin-strategy-option ${
                esActiva ? 'selected' : ''
              }`.trim()}
            >
              <div className="admin-strategy-option-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>{nombreLegible}</strong>
                  <span className="strategy-version-pill">{op.version}</span>
                </div>
                {esActiva ? (
                  <span className="trend-badge trend-positiva">Activa</span>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    cargando={cambiando}
                    aria-label={`Activar ${nombreLegible}`}
                    onClick={() => void handleSeleccionar(op.id)}
                  >
                    Activar
                  </Button>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                {op.descripcion}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

