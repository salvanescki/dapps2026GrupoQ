import React from 'react';
import {
  formatearCreditos,
  formatearPorcentajeVariacion,
} from '../../utils/formato-mercado';
import type { ResumenPatrimonialConsolidado } from '../../utils/portfolio-chart';

export interface PortfolioSummaryCardsProps {
  resumen: ResumenPatrimonialConsolidado;
}

export const PortfolioSummaryCards: React.FC<PortfolioSummaryCardsProps> = ({
  resumen,
}) => {
  const signoCredito =
    resumen.gananciaLatenteConsolidada > 0.004 ? '+' : '';
  const textoCreditosPnl = `${signoCredito}${formatearCreditos(
    resumen.gananciaLatenteConsolidada,
  )} cr.`;
  const textoPorcentajePnl = formatearPorcentajeVariacion(
    resumen.gananciaLatentePorcentaje,
  );

  return (
    <section
      className="portfolio-summary-grid"
      data-testid="portfolio-summary-cards"
      aria-label="Indicadores patrimoniales consolidados"
    >
      <article className="portfolio-kpi-card">
        <span className="portfolio-kpi-label">Saldo Líquido Disponible</span>
        <span className="portfolio-kpi-value">
          {formatearCreditos(resumen.saldoBilletera)} cr.
        </span>
        <span className="portfolio-kpi-sub">Efectivo listo para comprar</span>
      </article>

      <article className="portfolio-kpi-card">
        <span className="portfolio-kpi-label">Valoración Total en Tokens</span>
        <span className="portfolio-kpi-value">
          {formatearCreditos(resumen.valoracionTotalTokens)} cr.
        </span>
        <span className="portfolio-kpi-sub">
          A cotización oficial vigente ({resumen.posiciones.length} posición/es)
        </span>
      </article>

      <article className="portfolio-kpi-card">
        <span className="portfolio-kpi-label">Patrimonio Neto Total</span>
        <span className="portfolio-kpi-value">
          {formatearCreditos(resumen.patrimonioNetoTotal)} cr.
        </span>
        <span className="portfolio-kpi-sub">
          Efectivo + valoración de tenencias
        </span>
      </article>

      <article className="portfolio-kpi-card">
        <span className="portfolio-kpi-label">Rendimiento Latente (PnL)</span>
        <span className="portfolio-kpi-value">{textoCreditosPnl}</span>
        <div className="portfolio-kpi-sub">
          <span className={`trend-badge trend-${resumen.tendenciaConsolidada}`}>
            {textoPorcentajePnl}
          </span>
          <span>vs. costo de adquisición</span>
        </div>
      </article>
    </section>
  );
};

