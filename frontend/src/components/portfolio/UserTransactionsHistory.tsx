import React from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  formatearContraparte,
  formatearCreditos,
  formatearFechaHoraCorta,
} from '../../utils/formato-mercado';
import type { FiltrosHistorialUi } from '../../hooks/usePortfolio';
import type {
  TipoOperacionUsuario,
  TransaccionUsuario,
} from '../../types/marketplace.types';

export interface UserTransactionsHistoryProps {
  transacciones: TransaccionUsuario[];
  filtros: FiltrosHistorialUi;
  errorValidacion: string | null;
  opcionesJugadores: Array<{ jugadorId: string; nombreJugador: string }>;
  onActualizarFiltro: (parcial: Partial<FiltrosHistorialUi>) => void;
  onLimpiarFiltros: () => void;
}

export const UserTransactionsHistory: React.FC<
  UserTransactionsHistoryProps
> = ({
  transacciones,
  filtros,
  errorValidacion,
  opcionesJugadores,
  onActualizarFiltro,
  onLimpiarFiltros,
}) => {
  return (
    <section
      className="portfolio-section-card"
      data-testid="user-transactions-history"
      aria-label="Historial de operaciones ejecutadas"
    >
      <div className="portfolio-section-header">
        <h2 className="portfolio-section-title">Historial de Operaciones</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLimpiarFiltros}
        >
          Limpiar filtros
        </Button>
      </div>

      <div className="history-filters-grid">
        <div className="history-filter-field">
          <label htmlFor="history-filter-tipo" className="history-filter-label">
            Tipo de operación
          </label>
          <select
            id="history-filter-tipo"
            className="history-filter-select"
            value={filtros.tipo}
            onChange={(e) =>
              onActualizarFiltro({
                tipo: e.target.value as 'Todas' | TipoOperacionUsuario,
              })
            }
          >
            <option value="Todas">Todas</option>
            <option value="COMPRA">Compra</option>
            <option value="VENTA">Venta</option>
          </select>
        </div>

        <div className="history-filter-field">
          <label
            htmlFor="history-filter-jugador"
            className="history-filter-label"
          >
            Futbolista
          </label>
          <select
            id="history-filter-jugador"
            className="history-filter-select"
            value={filtros.jugadorId}
            onChange={(e) => onActualizarFiltro({ jugadorId: e.target.value })}
          >
            <option value="">Todos los futbolistas</option>
            {opcionesJugadores.map((op) => (
              <option key={op.jugadorId} value={op.jugadorId}>
                {op.nombreJugador}
              </option>
            ))}
          </select>
        </div>

        <div className="history-filter-field">
          <label htmlFor="history-filter-desde" className="history-filter-label">
            Desde
          </label>
          <input
            id="history-filter-desde"
            type="date"
            className="history-filter-input"
            value={filtros.desde}
            onChange={(e) => onActualizarFiltro({ desde: e.target.value })}
          />
        </div>

        <div className="history-filter-field">
          <label htmlFor="history-filter-hasta" className="history-filter-label">
            Hasta
          </label>
          <input
            id="history-filter-hasta"
            type="date"
            className="history-filter-input"
            value={filtros.hasta}
            onChange={(e) => onActualizarFiltro({ hasta: e.target.value })}
          />
        </div>
      </div>

      {errorValidacion && <Alert tipo="error" mensaje={errorValidacion} />}

      {transacciones.length === 0 ? (
        <div
          className="marketplace-empty-box"
          data-testid="user-transactions-empty"
        >
          No se encontraron operaciones para los criterios seleccionados.
        </div>
      ) : (
        <div className="portfolio-table-scroll">
          <table
            className="portfolio-table"
            aria-label="Listado de transacciones del usuario"
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Operación</th>
                <th>Mercado</th>
                <th>Futbolista</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Monto Total</th>
                <th>Estrategia</th>
                <th>Contraparte</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((tx) => (
                <tr key={tx.transaccionId}>
                  <td>{formatearFechaHoraCorta(tx.fecha)}</td>
                  <td>
                    <span
                      className={`trend-badge ${
                        tx.tipoOperacion === 'COMPRA'
                          ? 'trend-positiva'
                          : 'trend-neutra'
                      }`}
                    >
                      {tx.tipoOperacion === 'COMPRA' ? 'Compra' : 'Venta'}
                    </span>
                  </td>
                  <td>
                    {tx.tipoMercado === 'PRIMARIO' ? 'Primario' : 'Secundario'}
                  </td>
                  <td>
                    <strong>{tx.nombreJugador}</strong>
                  </td>
                  <td>{tx.cantidadTokens}</td>
                  <td>{formatearCreditos(tx.precioUnitario)} cr.</td>
                  <td>
                    <strong>{formatearCreditos(tx.montoTotal)} cr.</strong>
                  </td>
                  <td>{tx.estrategiaCotizacion}</td>
                  <td>{formatearContraparte(tx.contraparte)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

