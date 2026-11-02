import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatearCreditos } from '../../utils/formato-mercado';
import { validarPublicacionOrdenVenta } from '../../utils/validaciones-mercado';
import type { OrdenVenta } from '../../types/marketplace.types';

export interface PublishSellOrderFormProps {
  nombreJugador: string;
  cantidadTokensDisponibles: number;
  cotizacionActual: number | null;
  operando: boolean;
  onPublicarVenta: (
    cantidad: number,
    precioUnitario: number,
  ) => Promise<OrdenVenta>;
  onCerrar?: () => void;
}

export const PublishSellOrderForm: React.FC<PublishSellOrderFormProps> = ({
  nombreJugador,
  cantidadTokensDisponibles,
  cotizacionActual,
  operando,
  onPublicarVenta,
  onCerrar,
}) => {
  const [cantidadTexto, setCantidadTexto] = useState<string>('1');
  const [precioTexto, setPrecioTexto] = useState<string>(
    cotizacionActual && cotizacionActual > 0 ? cotizacionActual.toFixed(2) : '1.00',
  );
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null);
  const [ordenCreada, setOrdenCreada] = useState<OrdenVenta | null>(null);

  const cantidadNum =
    cantidadTexto.trim() === '' ? Number.NaN : Number(cantidadTexto);
  const precioNum =
    precioTexto.trim() === '' ? Number.NaN : Number(precioTexto);

  const validacion = validarPublicacionOrdenVenta({
    cantidad: cantidadNum,
    precioUnitario: precioNum,
    cantidadTokensDisponibles,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorOperacion(null);
    setOrdenCreada(null);

    if (!validacion.esValido) {
      setErrorOperacion(validacion.error);
      return;
    }

    try {
      const creada = await onPublicarVenta(cantidadNum, precioNum);
      setOrdenCreada(creada);
      setCantidadTexto('1');
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'No se pudo publicar la orden de venta secundaria.';
      setErrorOperacion(mensaje);
    }
  };

  return (
    <form
      className="market-panel-box"
      data-testid="publish-sell-order-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="player-market-header">
        <div>
          <h3 className="market-panel-title">
            Publicar Orden de Venta P2P ({nombreJugador})
          </h3>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
            }}
          >
            Tokens libres de custodia disponibles: <strong>{cantidadTokensDisponibles}</strong>
          </span>
        </div>
        {onCerrar && (
          <Button type="button" variant="ghost" size="sm" onClick={onCerrar}>
            Cerrar
          </Button>
        )}
      </div>

      <div className="trading-form-grid">
        <Input
          id="sell-order-cantidad"
          label="Cantidad a vender"
          type="number"
          min={1}
          max={Math.max(1, cantidadTokensDisponibles)}
          step="1"
          value={cantidadTexto}
          onChange={(e) => {
            setCantidadTexto(e.target.value);
            setErrorOperacion(null);
          }}
          disabled={operando || cantidadTokensDisponibles < 1}
        />

        <Input
          id="sell-order-precio"
          label="Precio unitario (cr.)"
          type="number"
          min={0.01}
          step="0.01"
          value={precioTexto}
          onChange={(e) => {
            setPrecioTexto(e.target.value);
            setErrorOperacion(null);
          }}
          disabled={operando || cantidadTokensDisponibles < 1}
        />
      </div>

      <div className="trading-summary-box">
        <div className="trading-summary-row">
          <span>Cotización oficial de referencia</span>
          <strong>
            {cotizacionActual && cotizacionActual > 0
              ? `${formatearCreditos(cotizacionActual)} cr.`
              : '—'}
          </strong>
        </div>
        <div className="trading-summary-row">
          <span>Ingreso bruto estimado al liquidar</span>
          <strong>
            {formatearCreditos(validacion.ingresoBrutoEstimado ?? 0)} cr.
          </strong>
        </div>
      </div>

      {!validacion.esValido && validacion.error && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-amber-300)',
          }}
        >
          {validacion.error}
        </p>
      )}

      {errorOperacion && <Alert tipo="error" mensaje={errorOperacion} />}

      {ordenCreada && (
        <Alert
          tipo="success"
          mensaje={`Orden publicada: ${ordenCreada.cantidad} token(s) en custodia a ${formatearCreditos(
            ordenCreada.precioUnitario,
          )} cr. por unidad.`}
        />
      )}

      <Button
        type="submit"
        variant="primary"
        style={{ width: '100%' }}
        cargando={operando}
        disabled={!validacion.esValido || cantidadTokensDisponibles < 1 || operando}
      >
        Publicar orden de venta
      </Button>
    </form>
  );
};

