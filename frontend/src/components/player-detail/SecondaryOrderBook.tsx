import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  formatearContraparte,
  formatearCreditos,
  formatearFechaHoraCorta,
} from '../../utils/formato-mercado';
import { validarCompraSecundaria } from '../../utils/validaciones-mercado';
import type { OrdenVenta, ResultadoCompra } from '../../types/marketplace.types';

export interface SecondaryOrderBookProps {
  ordenes: OrdenVenta[];
  usuarioId?: string;
  estaAutenticado: boolean;
  saldoDisponible?: number;
  operando: boolean;
  onComprarSecundario: (
    ordenVentaId: string,
    cantidad: number,
  ) => Promise<ResultadoCompra>;
  onCancelarOrden: (ordenId: string) => Promise<OrdenVenta>;
}

export const SecondaryOrderBook: React.FC<SecondaryOrderBookProps> = ({
  ordenes,
  usuarioId,
  estaAutenticado,
  saldoDisponible,
  operando,
  onComprarSecundario,
  onCancelarOrden,
}) => {
  const [cantidadesPorOrden, setCantidadesPorOrden] = useState<
    Record<string, string>
  >({});
  const [errorLibro, setErrorLibro] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const ordenadas = [...ordenes]
    .filter((o) => o.estado === 'PENDIENTE' || o.estado === 'PARCIAL')
    .sort((a, b) => {
      const diff =
        Math.round(a.precioUnitario * 100) - Math.round(b.precioUnitario * 100);
      if (diff !== 0) return diff;
      return Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
    });

  const handleComprar = async (orden: OrdenVenta) => {
    setErrorLibro(null);
    setMensajeExito(null);

    const texto = cantidadesPorOrden[orden.ordenId] ?? '1';
    const cantidadNum = texto.trim() === '' ? Number.NaN : Number(texto);

    const val = validarCompraSecundaria({
      orden,
      cantidad: cantidadNum,
      usuarioId,
      saldoDisponible,
    });

    if (!val.esValido) {
      setErrorLibro(val.error);
      return;
    }

    try {
      const res = await onComprarSecundario(orden.ordenId, cantidadNum);
      setMensajeExito(
        `¡Compra P2P ejecutada! Adquiriste ${
          res.cantidadTokensComprados
        } token(s) a ${formatearCreditos(
          res.precioUnitarioPagado,
        )} cr. (debitado: ${formatearCreditos(res.montoTotalDebitado)} cr.).`,
      );
      setCantidadesPorOrden((prev) => ({ ...prev, [orden.ordenId]: '1' }));
    } catch (err) {
      setErrorLibro(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la compra en mercado secundario.',
      );
    }
  };

  const handleCancelar = async (ordenId: string) => {
    setErrorLibro(null);
    setMensajeExito(null);
    try {
      await onCancelarOrden(ordenId);
      setMensajeExito(
        'Orden de venta cancelada. Los tokens remanentes fueron restituidos a tu tenencia disponible.',
      );
    } catch (err) {
      setErrorLibro(
        err instanceof Error
          ? err.message
          : 'No fue posible cancelar la orden de venta.',
      );
    }
  };

  return (
    <div className="market-panel-box" data-testid="secondary-order-book">
      <div>
        <h3 className="market-panel-title">
          Libro de Órdenes — Mercado Secundario P2P
        </h3>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
          }}
        >
          Ofertas activas entre inversores ordenadas desde el menor precio unitario
        </span>
      </div>

      {errorLibro && <Alert tipo="error" mensaje={errorLibro} />}
      {mensajeExito && <Alert tipo="success" mensaje={mensajeExito} />}

      {ordenadas.length === 0 ? (
        <div
          className="marketplace-empty-box"
          data-testid="secondary-order-book-empty"
        >
          No hay órdenes de venta secundarias activas para este futbolista en este
          momento.
        </div>
      ) : (
        <div className="secondary-order-list">
          {ordenadas.map((orden) => {
            const esPropia = Boolean(usuarioId && orden.vendedorId === usuarioId);
            const cantTexto = cantidadesPorOrden[orden.ordenId] ?? '1';
            const cantNum =
              cantTexto.trim() === '' ? Number.NaN : Number(cantTexto);
            const validacion = validarCompraSecundaria({
              orden,
              cantidad: cantNum,
              usuarioId,
              saldoDisponible,
            });

            return (
              <div
                key={orden.ordenId}
                className={`secondary-order-item ${
                  esPropia ? 'secondary-order-own' : ''
                }`.trim()}
                data-testid="secondary-order-item"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 'var(--font-size-base)' }}>
                      {formatearCreditos(orden.precioUnitario)} cr. / token
                    </strong>
                    <span className="strategy-version-pill">
                      {orden.estado === 'PARCIAL' ? 'Parcial' : 'Pendiente'}
                    </span>
                    {esPropia && (
                      <span className="custody-badge">Tu oferta activa</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Remanente: <strong>{orden.cantidadRestante}</strong> de{' '}
                    {orden.cantidad} token(s) • Vendedor:{' '}
                    {esPropia
                      ? 'Tú'
                      : formatearContraparte(orden.vendedorId)}{' '}
                    • {formatearFechaHoraCorta(orden.creadoEn)}
                  </span>
                </div>

                {estaAutenticado && (
                  <div className="secondary-order-controls">
                    {esPropia ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        cargando={operando}
                        onClick={() => void handleCancelar(orden.ordenId)}
                      >
                        Cancelar orden
                      </Button>
                    ) : (
                      <>
                        <label
                          htmlFor={`sec-qty-${orden.ordenId}`}
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Cantidad a comprar
                        </label>
                        <input
                          id={`sec-qty-${orden.ordenId}`}
                          type="number"
                          min={1}
                          max={orden.cantidadRestante}
                          step="1"
                          value={cantTexto}
                          onChange={(e) => {
                            setCantidadesPorOrden((prev) => ({
                              ...prev,
                              [orden.ordenId]: e.target.value,
                            }));
                            setErrorLibro(null);
                          }}
                          disabled={operando}
                          style={{
                            width: '4.5rem',
                            padding: '0.4rem 0.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-default)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Total:{' '}
                          <strong>
                            {formatearCreditos(validacion.costoEstimado ?? 0)} cr.
                          </strong>
                        </span>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          cargando={operando}
                          disabled={!validacion.esValido || operando}
                          onClick={() => void handleComprar(orden)}
                        >
                          Comprar oferta
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

