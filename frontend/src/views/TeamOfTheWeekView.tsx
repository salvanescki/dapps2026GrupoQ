import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTeamOfTheWeek } from '../hooks/useTeamOfTheWeek';
import { construirItemsNavegacion } from '../utils/navegacion';
import { AppLayout } from '../components/layout/AppLayout';
import { SoccerPitch } from '../components/team-of-the-week/SoccerPitch';
import { WeekSelector } from '../components/team-of-the-week/WeekSelector';
import { PlayerDetailModal } from '../components/player-detail/PlayerDetailModal';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import '../styles/components.css';
import '../styles/marketplace.css';
import '../styles/team-of-the-week.css';

export const TeamOfTheWeekView: React.FC = () => {
  const { usuario, logout } = useAuth();
  const {
    equipo,
    semanasDisponibles,
    semanaSeleccionada,
    cargando,
    error,
    semanaNoEncontrada,
    esAdmin,
    generandoManual,
    mensajeAdmin,
    seleccionarSemana,
    volverALaMasReciente,
    recargar,
    dispararGeneracionManual,
    jugadorModalId,
    abrirModalJugador,
    cerrarModalJugador,
  } = useTeamOfTheWeek();

  const navbarProps = {
    titulo: 'Football Token Marketplace',
    items: construirItemsNavegacion(usuario?.rol),
    onLogout: logout,
    brandLink: '/',
  };

  const selectorSemanas = (
    <WeekSelector
      semanas={semanasDisponibles}
      semanaActual={semanaSeleccionada}
      onSeleccionar={(ano, semana) => void seleccionarSemana(ano, semana)}
    />
  );

  return (
    <AppLayout navbarProps={navbarProps} className="team-of-the-week-page">
      <main className="marketplace-container">
        <header className="marketplace-header">
          <div className="marketplace-header-titles">
            <h1 className="marketplace-title">Equipo de la Semana</h1>
            <p className="marketplace-subtitle">
              El once ideal de los jugadores mejor valorados del mercado en
              formación táctica 4-3-3.
            </p>
          </div>

          {esAdmin && (
            <div className="totw-actions">
              <Button
                type="button"
                data-testid="btn-generate-team"
                cargando={generandoManual}
                textoCarga="Generando..."
                onClick={() => void dispararGeneracionManual()}
              >
                Generar Equipo de la Semana Actual
              </Button>

              {mensajeAdmin && (
                <div data-testid="admin-feedback-msg" className="totw-feedback">
                  <Alert
                    tipo={mensajeAdmin.tipo === 'exito' ? 'success' : 'error'}
                    mensaje={mensajeAdmin.texto}
                  />
                </div>
              )}
            </div>
          )}
        </header>

        {cargando && !equipo && (
          <div data-testid="loading-state" className="totw-state">
            <p>Cargando Equipo de la Semana...</p>
          </div>
        )}

        {error && (
          <div data-testid="error-state" className="totw-state">
            <Alert tipo="error" mensaje={error} />
            <Button
              type="button"
              variant="secondary"
              data-testid="retry-btn"
              onClick={() => void recargar()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!cargando && !error && !equipo && !semanaNoEncontrada && (
          <div data-testid="empty-state" className="totw-state">
            <p className="totw-state-title">
              Aún no hay ningún Equipo de la Semana disponible
            </p>
            <p className="totw-state-hint">
              El once ideal se publicará automáticamente los lunes al
              actualizarse las cotizaciones.
            </p>
          </div>
        )}

        {!cargando && !error && semanaNoEncontrada && (
          <div data-testid="week-not-found-state" className="totw-state">
            <p className="totw-state-title">
              No existe un Equipo de la Semana para la semana solicitada.
            </p>
            {selectorSemanas}
            <Button
              type="button"
              variant="secondary"
              data-testid="back-to-latest-btn"
              onClick={volverALaMasReciente}
            >
              Volver a la semana más reciente
            </Button>
          </div>
        )}

        {equipo && (
          <section className="totw-content">
            <div className="totw-toolbar">
              {selectorSemanas}
              <span className="totw-meta">
                Formación {equipo.formacion} · {equipo.estrategiaId}
              </span>
            </div>

            <SoccerPitch
              equipo={equipo}
              onSeleccionarJugador={abrirModalJugador}
            />
          </section>
        )}
      </main>

      <PlayerDetailModal
        playerId={jugadorModalId}
        onClose={cerrarModalJugador}
        onMarketMutation={() => {}}
      />
    </AppLayout>
  );
};
