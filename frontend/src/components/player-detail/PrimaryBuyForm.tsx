import React, { useState } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatearCreditos } from '../../utils/formato-mercado';
import { validarOrdenCompraPrimaria } from '../../utils/validaciones-mercado';
import type { RolUsuario } from '../../types/auth.types';
import type { ResultadoCompra } from '../../types/marketplace.types';

export interface PrimaryBuyFormProps {
  nombreJugador: string;
  cotizacionVigente: number | null;
  stockPrimarioConocido: number | null;
  saldoDisponible?: number;
  rol?: RolUsuario;
  estaAutenticado: boolean;
  operando: boolean;
  onComprarPrimario: (
    cantidad: number,
    precioMaximoUnitario?: number,
  ) => Promise<ResultadoCompra>;
}

export const PrimaryBuyForm: React.FC<PrimaryBuyFormProps> = ({
  nombreJugador,
  cotizacionVigente,
  stockPrimarioConocido,
  saldoDisponible,
  rol,
  estaAutenticado,
  operando,
  onComprarPrimario,
}) => {
  const [cantidadTexto, setCantidadTexto] = useState<string>('1');
  const [precioMaximoTexto, setPrecioMaximoTexto] = useState<string>('');
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null);
  const [compraExitosa, setCompraExitosa] = useState<ResultadoCompra | null>(null);

  if (!estaAutenticado) {
    return (
      <div className="market-panel-box" data-testid="primary-buy-unauth">
        <h3 className="market-panel-title">Compra en Mercado Primario</h3>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          Inicia sesión con tu cuenta de inversor para adquirir tokens oficiales de{' '}
          <strong>{nombreJugador}</strong>.
        </p>
      </div>
    );
  }

  const cotizacion = cotizacionVigente ?? 0;
  const cantidadNum =
    cantidadTexto.trim() === '' ? Number.NaN : Number(cantidadTexto);
  const precioMaximoNum =
    precioMaximoTexto.trim() === '' ? undefined : Number(precioMaximoTexto);

  const validacion = validarOrdenCompraPrimaria({
    cantidad: cantidadNum,
    cotizacionActual: cotizacion,
    stockPrimarioConocido,
    precioMaximoUnitario: precioMaximoNum,
    saldoDisponible,
    rol,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorOperacion(null);
    setCompraExitosa(null);

    if (!validacion.esValido) {
      setErrorOperacion(validacion.error);
      return;
    }

    try {
      const resultado = await onComprarPrimario(cantidadNum, precioMaximoNum);
      setCompraExitosa(resultado);
      setCantidadTexto('1');
      setPrecioMaximoTexto('');
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'No se pudo completar la orden de compra primaria.';
      setErrorOperacion(mensaje);
    }
  };

  return (
    <form
      className="market-panel-box"
      data-testid="primary-buy-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <h3 className="market-panel-title">
        Compra en Mercado Primario (Emisión Oficial)
      </h3>

      {validacion.bloqueadoAdmin && validacion.error && (
        <div
          className="marketplace-notice-box"
          data-testid="primary-buy-admin-block"
        >
          {validacion.error}
        </div>
      )}

      {validacion.agotadoPrimario && validacion.error && (
        <div
          className="marketplace-notice-box"
          data-testid="primary-buy-exhausted"
        >
          {validacion.error}
        </div>
      )}

      <div className="trading-form-grid">
        <Input
          id="primary-buy-cantidad"
          label="Cantidad de tokens"
          type="number"
          min={1}
          max={stockPrimarioConocido ?? 100}
          step="1"
          value={cantidadTexto}
          onChange={(e) => {
            setCantidadTexto(e.target.value);
            setErrorOperacion(null);
          }}
          disabled={operando || Boolean(validacion.bloqueadoAdmin) || Boolean(validacion.agotadoPrimario)}
        />

        <Input
          id="primary-buy-precio-max"
          label="Precio máximo unitario (opcional)"
          type="number"
          min={0.01}
          step="0.01"
          placeholder={
            cotizacion > 0 ? `Ej. ${cotizacion.toFixed(2)}` : 'Opcional'
          }
          value={precioMaximoTexto}
          onChange={(e) => {
            setPrecioMaximoTexto(e.target.value);
            setErrorOperacion(null);
          }}
          disabled={operando || Boolean(validacion.bloqueadoAdmin) || Boolean(validacion.agotadoPrimario)}
        />
      </div>

      <div className="trading-summary-box" data-testid="primary-buy-summary">
        <div className="trading-summary-row">
          <span>Cotización unitaria vigente</span>
          <strong>
            {cotizacion > 0 ? `${formatearCreditos(cotizacion)} cr.` : '—'}
          </strong>
        </div>
        <div className="trading-summary-row">
          <span>Costo total estimado</span>
          <strong>{formatearCreditos(validacion.costoEstimado ?? 0)} cr.</strong>
        </div>
        {saldoDisponible !== undefined && (
          <div className="trading-summary-row">
            <span>Saldo disponible en billetera</span>
            <strong>{formatearCreditos(saldoDisponible)} cr.</strong>
          </div>
        )}
      </div>

      {!validacion.esValido &&
        !validacion.bloqueadoAdmin &&
        !validacion.agotadoPrimario &&
        validacion.error && (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-amber-300)',
            }}
            data-testid="primary-buy-validation-hint"
          >
            {validacion.error}
          </p>
        )}

      {errorOperacion && <Alert tipo="error" mensaje={errorOperacion} />}

      {compraExitosa && (
        <Alert
          tipo="success"
          mensaje={`¡Compra confirmada! Adquiriste ${
            compraExitosa.cantidadTokensComprados
          } token(s) a ${formatearCreditos(
            compraExitosa.precioUnitarioPagado,
          )} cr. (total debitado: ${formatearCreditos(
            compraExitosa.montoTotalDebitado,
          )} cr. — saldo restante: ${formatearCreditos(
            compraExitosa.saldoRestanteUsuario,
          )} cr.).`}
        />
      )}

      <Button
        type="submit"
        variant="primary"
        style={{ width: '100%' }}
        cargando={operando}
        disabled={!validacion.esValido || cotizacion <= 0 || operando}
      >
        Confirmar compra primaria
      </Button>
    </form>
  );
};
