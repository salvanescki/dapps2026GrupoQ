import React from 'react';
import { Button } from '../ui/Button';
import { PlayerQuoteLinearChart } from './PlayerQuoteLinearChart';
import { PrimaryBuyForm } from './PrimaryBuyForm';
import { PublishSellOrderForm } from './PublishSellOrderForm';
import { SecondaryOrderBook } from './SecondaryOrderBook';
import { usePlayerMarketPanel } from '../../hooks/usePlayerMarketPanel';
import { formatearCreditos } from '../../utils/formato-mercado';
import { prepararSerieCotizaciones } from '../../utils/quotes-chart';
import '../../styles/marketplace.css';

export interface PlayerMarketSectionProps {
  jugadorId: string;
  nombreJugador: string;
  onMarketMutation?: () => void;
}

export const PlayerMarketSection: React.FC<PlayerMarketSectionProps> = ({
  jugadorId,
  nombreJugador,
  onMarketMutation,
}) => {
  const panel = usePlayerMarketPanel(jugadorId, onMarketMutation);
  const { cotizacionVigente } = prepararSerieCotizaciones(panel.cotizaciones);

  const disponiblesUsuario = panel.posicionUsuario?.cantidadTokensDisponibles ?? 0;
  const enCustodiaUsuario = panel.posicionUsuario?.cantidadTokensEnVenta ?? 0;
  const tenenciaTotalUsuario = disponiblesUsuario + enCustodiaUsuario;

  return (
    <section
      className="player-market-section"
      data-testid="player-market-section"
      aria-label="Mercado de tokens del jugador"
    >
      <div className="player-market-header">
        <div>
          <h3 className="market-panel-title">Mercado de Tokens y Trading</h3>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            Suministro fijo de 100 tokens coleccionables por futbolista
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          cargando={panel.cargando}
          onClick={() => void panel.recargar()}
        >
          Actualizar
        </Button>
      </div>

      <div className="player-market-kpis">
        <div className="player-market-kpi">
          <span className="player-market-kpi-label">Cotización Oficial</span>
          <span className="player-market-kpi-value">
            {cotizacionVigente
              ? `${formatearCreditos(cotizacionVigente.valor)} cr.`
              : '—'}
          </span>
        </div>

        <div className="player-market-kpi">
          <span className="player-market-kpi-label">Disponibilidad</span>
          <span className="player-market-kpi-value">
            {panel.tokensDisponiblesTotal !== null
              ? `${panel.tokensDisponiblesTotal} / 100`
              : '— / 100'}
          </span>
        </div>

        <div className="player-market-kpi">
          <span className="player-market-kpi-label">Tu Tenencia</span>
          <span className="player-market-kpi-value">
            {`${tenenciaTotalUsuario} tokens`}
          </span>
          {enCustodiaUsuario > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-amber-300)' }}>
              {`${disponiblesUsuario} libres • ${enCustodiaUsuario} en venta`}
            </span>
          )}
        </div>
      </div>

      <PlayerQuoteLinearChart
        cotizaciones={panel.cotizaciones}
        cargando={panel.cargando}
        error={panel.errorCarga}
        onReintentar={() => void panel.recargar()}
      />

      <PrimaryBuyForm
        nombreJugador={nombreJugador}
        cotizacionVigente={cotizacionVigente?.valor ?? null}
        stockPrimarioConocido={panel.stockPrimarioConocido}
        saldoDisponible={panel.saldoDisponible}
        rol={panel.rol}
        estaAutenticado={panel.estaAutenticado}
        operando={panel.operando}
        onComprarPrimario={panel.comprarPrimario}
      />

      {panel.estaAutenticado && disponiblesUsuario >= 1 && (
        <PublishSellOrderForm
          nombreJugador={nombreJugador}
          cantidadTokensDisponibles={disponiblesUsuario}
          cotizacionActual={cotizacionVigente?.valor ?? null}
          operando={panel.operando}
          onPublicarVenta={panel.publicarVenta}
        />
      )}

      <SecondaryOrderBook
        ordenes={panel.ordenesSecundarias}
        usuarioId={panel.usuarioId}
        estaAutenticado={panel.estaAutenticado}
        saldoDisponible={panel.saldoDisponible}
        operando={panel.operando}
        onComprarSecundario={(ordenVentaId, cantidad) =>
          panel.comprarSecundario(ordenVentaId, cantidad)
        }
        onCancelarOrden={panel.cancelarOrden}
      />
    </section>
  );
};
