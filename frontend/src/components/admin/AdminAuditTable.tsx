import React from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  formatearContraparte,
  formatearCreditos,
  formatearFechaHoraCorta,
} from '../../utils/formato-mercado';
import type { FiltrosAuditoriaUi } from '../../hooks/useAdminGovernance';
import type {
  TipoMercado,
  TransaccionAuditoria,
} from '../../types/marketplace.types';

export interface AdminAuditTableProps {
  transacciones: TransaccionAuditoria[];
  filtros: FiltrosAuditoriaUi;
  errorValidacion: string | null;
  cargando: boolean;
  onActualizarBorrador: (parcial: Partial<FiltrosAuditoriaUi>) => void;
  onAplicarFiltros: () => Promise<void>;
  onLimpiarFiltros: () => Promise<void>;
}

export const AdminAuditTable: React.FC<AdminAuditTableProps> = ({
  transacciones,
  filtros,
  errorValidacion,
  cargando,
  onActualizarBorrador,
  onAplicarFiltros,
  onLimpiarFiltros,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onAplicarFiltros();
  };

  return (
    <section
      className="admin-card"
      data-testid="admin-audit-section"
      aria-label="Registro global de auditoría de transacciones"
    >
      <div className="portfolio-section-header">
        <div>
          <h2 className="admin-card-title">
            Auditoría Global de Transacciones
          </h2>
          <p className="shadcn-chart-description">
            Trazabilidad completa de liquidaciones primarias y secundarias P2P
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void onLimpiarFiltros()}
        >
          Limpiar filtros
        </Button>
      </div>

      <form className="admin-audit-filters" onSubmit={handleSubmit} noValidate>
        <div className="history-filter-field">
          <label htmlFor="audit-jugador-id" className="history-filter-label">
            ID de Jugador (UUID v4)
          </label>
          <input
            id="audit-jugador-id"
            type="text"
            className="history-filter-input"
            placeholder="Ej. 123e4567-e89b-42d3-..."
            value={filtros.jugadorId}
            onChange={(e) => onActualizarBorrador({ jugadorId: e.target.value })}
          />
        </div>

        <div className="history-filter-field">
          <label htmlFor="audit-usuario-id" className="history-filter-label">
            ID de Usuario (UUID v4)
          </label>
          <input
            id="audit-usuario-id"
            type="text"
            className="history-filter-input"
            placeholder="Comprador o vendedor"
            value={filtros.usuarioId}
            onChange={(e) => onActualizarBorrador({ usuarioId: e.target.value })}
          />
        </div>

        <div className="history-filter-field">
          <label htmlFor="audit-tipo-mercado" className="history-filter-label">
            Tipo de mercado
          </label>
          <select
            id="audit-tipo-mercado"
            className="history-filter-select"
            value={filtros.tipoMercado}
            onChange={(e) =>
              onActualizarBorrador({
                tipoMercado: e.target.value as 'Todos' | TipoMercado,
              })
            }
          >
            <option value="Todos">Todos</option>
            <option value="PRIMARIO">Primario</option>
            <option value="SECUNDARIO">Secundario</option>
          </select>
        </div>

        <div className="history-filter-field">
          <label htmlFor="audit-desde" className="history-filter-label">
            Desde
          </label>
          <input
            id="audit-desde"
            type="date"
            className="history-filter-input"
            value={filtros.desde}
            onChange={(e) => onActualizarBorrador({ desde: e.target.value })}
          />
        </div>

        <div className="history-filter-field">
          <label htmlFor="audit-hasta" className="history-filter-label">
            Hasta
          </label>
          <input
            id="audit-hasta"
            type="date"
            className="history-filter-input"
            value={filtros.hasta}
            onChange={(e) => onActualizarBorrador({ hasta: e.target.value })}
          />
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            cargando={cargando}
            style={{ width: '100%' }}
          >
            Aplicar filtros
          </Button>
        </div>
      </form>

      {errorValidacion && <Alert tipo="error" mensaje={errorValidacion} />}

      {transacciones.length === 0 ? (
        <div
          className="marketplace-empty-box"
          data-testid="admin-audit-empty"
        >
          No se registraron transacciones globales para los filtros aplicados.
        </div>
      ) : (
        <div className="admin-table-scroll">
          <table
            className="admin-audit-table"
            aria-label="Tabla global de auditoría administrativa"
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Mercado</th>
                <th>Futbolista</th>
                <th>Comprador</th>
                <th>Vendedor</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Monto Total</th>
                <th>Estrategia</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((tx) => (
                <tr key={tx.transaccionId}>
                  <td>{formatearFechaHoraCorta(tx.fecha)}</td>
                  <td>
                    <span
                      className={`trend-badge ${
                        tx.tipoMercado === 'PRIMARIO'
                          ? 'trend-positiva'
                          : 'trend-neutra'
                      }`}
                    >
                      {tx.tipoMercado === 'PRIMARIO' ? 'Primario' : 'Secundario'}
                    </span>
                  </td>
                  <td>
                    <strong>{tx.nombreJugador}</strong>
                  </td>
                  <td>{formatearContraparte(tx.compradorId)}</td>
                  <td>{formatearContraparte(tx.vendedorId)}</td>
                  <td>{tx.cantidadTokens}</td>
                  <td>{formatearCreditos(tx.precioUnitario)} cr.</td>
                  <td>
                    <strong>{formatearCreditos(tx.montoTotal)} cr.</strong>
                  </td>
                  <td>{tx.estrategiaCotizacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

