import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  formatearCreditos,
  formatearFechaHoraCorta,
} from '../../utils/formato-mercado';
import type { OrdenVenta } from '../../types/marketplace.types';

export interface OpenSellOrdersSectionProps {
  ordenes: OrdenVenta[];
  nombresPorJugador: Record<string, string>;
  operando: boolean;
  onCancelarOrden: (ordenId: string) => Promise<OrdenVenta>;
}

export const OpenSellOrdersSection: React.FC<OpenSellOrdersSectionProps> = ({
  ordenes,
  nombresPorJugador,
  operando,
  onCancelarOrden,
}) => {
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null);
  const [mensajeCancelacion, setMensajeCancelacion] = useState<string | null>(
    null,
  );

  const handleCancelar = async (ordenId: string) => {
    setErrorCancelacion(null);
    setMensajeCancelacion(null);
    try {
      await onCancelarOrden(ordenId);
      setMensajeCancelacion(
        'Orden cancelada exitosamente. Tus tokens remanentes regresaron a tenencia disponible.',
      );
    } catch (err) {
      setErrorCancelacion(
        err instanceof Error
          ? err.message
          : 'No se pudo cancelar la orden de venta.',
      );
    }
  };

  return (
    <section
      className="portfolio-section-card"
      data-testid="open-sell-orders-section"
      aria-label="Órdenes de venta abiertas en custodia"
    >
      <div className="portfolio-section-header">
        <div>
          <h2 className="portfolio-section-title">
            Mis Órdenes de Venta Abiertas (En Custodia)
          </h2>
          <p className="shadcn-chart-description">
            Los tokens ofertados permanecen reservados en custodia hasta su liquidación o cancelación
          </p>
        </div>
      </div>

      {errorCancelacion && <Alert tipo="error" mensaje={errorCancelacion} />}
      {mensajeCancelacion && (
        <Alert tipo="success" mensaje={mensajeCancelacion} />
      )}

      {ordenes.length === 0 ? (
        <div
          className="marketplace-empty-box"
          data-testid="open-sell-orders-empty"
        >
          No tienes órdenes de venta abiertas en el mercado secundario actualmente.
        </div>
      ) : (
        <div className="portfolio-table-scroll">
          <table
            className="portfolio-table"
            aria-label="Órdenes de venta activas del usuario"
          >
            <thead>
              <tr>
                <th>Futbolista</th>
                <th>Estado</th>
                <th>Original</th>
                <th>Remanente en Custodia</th>
                <th>Precio Unit.</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <tr key={orden.ordenId}>
                  <td>
                    <strong>
                      {nombresPorJugador[orden.jugadorId] ?? orden.jugadorId}
                    </strong>
                  </td>
                  <td>
                    <span className="custody-badge">
                      {orden.estado === 'PARCIAL' ? 'Parcial' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{orden.cantidad}</td>
                  <td>
                    <strong>{orden.cantidadRestante}</strong>
                  </td>
                  <td>{formatearCreditos(orden.precioUnitario)} cr.</td>
                  <td>{formatearFechaHoraCorta(orden.creadoEn)}</td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      cargando={operando}
                      onClick={() => void handleCancelar(orden.ordenId)}
                    >
                      Cancelar orden
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

