import React from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  formatearCreditos,
  formatearPorcentajeVariacion,
  obtenerVarianteTendencia,
} from '../../utils/formato-mercado';
import type { JugadorRanking } from '../../types/marketplace.types';

export interface RankingTableProps {
  ranking: JugadorRanking[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onSeleccionarJugador: (jugadorId: string) => void;
}

export const RankingTable: React.FC<RankingTableProps> = ({
  ranking,
  cargando,
  error,
  onReintentar,
  onSeleccionarJugador,
}) => {
  if (cargando && ranking.length === 0) {
    return (
      <div className="marketplace-empty-box" data-testid="ranking-loading">
        <Spinner size="md" ariaLabel="Cargando ranking de cotizaciones" />
        <p style={{ marginTop: '0.75rem' }}>
          Consultando cotizaciones vigentes del mercado...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-empty-box" data-testid="ranking-error">
        <Alert tipo="error" mensaje={error} />
        <Button type="button" variant="primary" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="marketplace-empty-box" data-testid="ranking-empty">
        <p>
          No hay futbolistas cotizados para la demarcación seleccionada en este
          momento.
        </p>
      </div>
    );
  }

  return (
    <div className="ranking-table-card" data-testid="ranking-table-card">
      <div className="marketplace-table-scroll">
        <table className="ranking-table" aria-label="Ranking de cotizaciones de jugadores">
          <thead>
            <tr>
              <th>#</th>
              <th>Futbolista / Club</th>
              <th>Demarcación</th>
              <th>Score</th>
              <th>Cotización (cr.)</th>
              <th>Variación</th>
              <th>Disponibilidad</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item) => {
              const variante = obtenerVarianteTendencia(item.variacionPorcentual);
              const textoVariacion = formatearPorcentajeVariacion(
                item.variacionPorcentual,
              );

              return (
                <tr
                  key={item.jugadorId}
                  className="ranking-row-clickable"
                  onClick={() => onSeleccionarJugador(item.jugadorId)}
                >
                  <td>
                    <span
                      className={`ranking-rank-badge ${
                        item.posicionRanking <= 3 ? 'top-three' : ''
                      }`.trim()}
                    >
                      {item.posicionRanking}
                    </span>
                  </td>
                  <td>
                    <div className="ranking-player-cell">
                      <button
                        type="button"
                        className="ranking-player-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionarJugador(item.jugadorId);
                        }}
                      >
                        {item.nombre}
                      </button>
                      <span className="ranking-club-sub">{item.equipoNombre}</span>
                    </div>
                  </td>
                  <td>{item.posicion}</td>
                  <td>{item.score.toFixed(4)}</td>
                  <td>
                    <strong>{formatearCreditos(item.cotizacionActual)} cr.</strong>
                  </td>
                  <td>
                    <span className={`trend-badge trend-${variante}`}>
                      {textoVariacion}
                    </span>
                  </td>
                  <td>
                    <span className="stock-supply-pill">
                      {`${item.tokensDisponibles} / 100`}
                    </span>
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionarJugador(item.jugadorId);
                      }}
                    >
                      Operar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
