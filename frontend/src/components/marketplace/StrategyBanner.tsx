import React from 'react';
import {
  formatearFechaHoraCorta,
  formatearNombreEstrategia,
} from '../../utils/formato-mercado';
import type { ConfiguracionEstrategia } from '../../types/marketplace.types';

export interface StrategyBannerProps {
  estrategia: ConfiguracionEstrategia | null;
}

export const StrategyBanner: React.FC<StrategyBannerProps> = ({ estrategia }) => {
  if (!estrategia) {
    return null;
  }

  const detalleActiva = estrategia.estrategiasDisponibles.find(
    (item) => item.id === estrategia.estrategiaActivaId,
  );
  const nombreLegible = formatearNombreEstrategia(estrategia.estrategiaActivaId);
  const descripcion =
    detalleActiva?.descripcion ||
    'Estrategia oficial vigente para la valoración semanal y bajo demanda de los tokens.';

  return (
    <section
      className="strategy-banner"
      aria-label="Estrategia de valuación vigente"
      data-testid="strategy-banner"
    >
      <div className="strategy-banner-main">
        <span className="strategy-banner-eyebrow">
          Regla Económica Activa del Mercado
        </span>
        <div className="strategy-banner-title-row">
          <h2 className="strategy-banner-name">{nombreLegible}</h2>
          <span className="strategy-version-pill">
            {estrategia.estrategiaActivaVersion}
          </span>
        </div>
        <p className="strategy-banner-description">{descripcion}</p>
      </div>
      <div className="strategy-banner-meta">
        Última actualización: {formatearFechaHoraCorta(estrategia.actualizadoEn)}
      </div>
    </section>
  );
};

