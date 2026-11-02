import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  formatearCreditos,
  formatearPorcentajeVariacion,
} from '../../utils/formato-mercado';
import type { PosicionEnriquecida } from '../../utils/portfolio-chart';

export interface PortfolioPositionsTableProps {
  posiciones: PosicionEnriquecida[];
  onSeleccionarJugador: (jugadorId: string) => void;
  onSolicitarVenta?: (posicion: PosicionEnriquecida) => void;
}

export const PortfolioPositionsTable: React.FC<
  PortfolioPositionsTableProps
> = ({ posiciones, onSeleccionarJugador, onSolicitarVenta }) => {
  return (
    <section
      className="portfolio-section-card"
      data-testid="portfolio-positions-section"
      aria-label="Posiciones activas de tokens"
    >
      <div className="portfolio-section-header">
        <h2 className="portfolio-section-title">Posiciones Activas en Cartera</h2>
      </div>

      {posiciones.length === 0 ? (
        <div
          className="marketplace-empty-box"
          data-testid="portfolio-positions-empty"
        >
          <p style={{ margin: 0 }}>
            No posees posiciones activas de futbolistas en este momento. Visita el{' '}
            <Link
              to="/marketplace"
              style={{ color: 'var(--color-emerald-400)', fontWeight: 600 }}
            >
              Marketplace
            </Link>{' '}
            para iniciar tu cartera.
          </p>
        </div>
      ) : (
        <div className="portfolio-table-scroll">
          <table
            className="portfolio-table"
            aria-label="Tabla de tenencias activas del usuario"
          >
            <thead>
              <tr>
                <th>Futbolista / Club</th>
                <th>Demarcación</th>
                <th>Disponibles</th>
                <th>En Custodia (Venta)</th>
                <th>Total</th>
                <th>Costo Prom.</th>
                <th>Cotización</th>
                <th>Valoración</th>
                <th>PnL Latente</th>
                {onSolicitarVenta && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {posiciones.map((pos) => {
                const signo = pos.gananciaLatenteCreditos > 0.004 ? '+' : '';
                const textoPnl = `${signo}${formatearCreditos(
                  pos.gananciaLatenteCreditos,
                )} cr.`;
                const textoPct = formatearPorcentajeVariacion(
                  pos.gananciaLatentePorcentaje,
                );

                return (
                  <tr key={pos.jugadorId}>
                    <td>
                      <div className="ranking-player-cell">
                        <button
                          type="button"
                          className="ranking-player-btn"
                          aria-label={`Ver detalle de ${pos.nombreJugador}`}
                          onClick={() => onSeleccionarJugador(pos.jugadorId)}
                        >
                          {pos.nombreJugador}
                        </button>
                        <span className="ranking-club-sub">{pos.equipoNombre}</span>
                      </div>
                    </td>
                    <td>{pos.posicion}</td>
                    <td>
                      <strong>{pos.cantidadTokensDisponibles}</strong>
                    </td>
                    <td>
                      {pos.cantidadTokensEnVenta > 0 ? (
                        <span className="custody-badge">
                          {`${pos.cantidadTokensEnVenta} en venta`}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td>{pos.cantidadTotalTenencia}</td>
                    <td>{formatearCreditos(pos.precioPromedioAdquisicion)} cr.</td>
                    <td>{formatearCreditos(pos.cotizacionActual)} cr.</td>
                    <td>
                      <strong>
                        {formatearCreditos(pos.valoracionTotalPosicion)} cr.
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>{textoPnl}</span>
                        <span
                          className={`trend-badge trend-${pos.tendencia}`}
                          style={{ width: 'fit-content' }}
                        >
                          {textoPct}
                        </span>
                      </div>
                    </td>
                    {onSolicitarVenta && (
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={pos.cantidadTokensDisponibles < 1}
                          onClick={() => onSolicitarVenta(pos)}
                        >
                          Vender
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

