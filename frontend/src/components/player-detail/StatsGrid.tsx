import React from 'react';
import type { EstadisticasJugador, PosicionJugador } from '../../types/player.types';
import { StatCard } from './StatCard';

export interface StatsGridProps {
  estadisticas: EstadisticasJugador;
  posicion: PosicionJugador;
}

interface MetricDef {
  key: keyof EstadisticasJugador;
  label: string;
  unit?: string;
  applicableTo: 'all' | 'field' | 'goalkeeper';
}

const METRIC_DEFINITIONS: MetricDef[] = [
  // Métricas comunes
  { key: 'partidosJugados', label: 'Partidos', applicableTo: 'all' },
  { key: 'minutosJugados', label: 'Minutos', applicableTo: 'all' },
  { key: 'goles', label: 'Goles', applicableTo: 'all' },
  { key: 'asistencias', label: 'Asistencias', applicableTo: 'all' },
  { key: 'tarjetasAmarillas', label: 'Amarillas', applicableTo: 'all' },
  { key: 'tarjetasRojas', label: 'Rojas', applicableTo: 'all' },
  { key: 'rating', label: 'Rating WhoScored', applicableTo: 'all' },

  // Métricas de campo (posicion !== 'Portero')
  { key: 'tirosPorPartido', label: 'Tiros/partido', applicableTo: 'field' },
  { key: 'precisionPase', label: 'Precisión de Pase', unit: '%', applicableTo: 'field' },
  { key: 'xgPorPartido', label: 'xG/partido', applicableTo: 'field' },
  { key: 'xaPorPartido', label: 'xA/partido', applicableTo: 'field' },
  { key: 'regatesCompletadosPorPartido', label: 'Regates/partido', applicableTo: 'field' },
  { key: 'pasesClavePorPartido', label: 'Pases Clave/partido', applicableTo: 'field' },
  { key: 'entradasPorPartido', label: 'Entradas/partido', applicableTo: 'field' },
  { key: 'intercepccionesPorPartido', label: 'Intercepciones/partido', applicableTo: 'field' },
  { key: 'duelosAereosGanadosPorPartido', label: 'Duelos Aéreos/partido', applicableTo: 'field' },
  { key: 'grandesOcasionesPorPartido', label: 'Grandes Ocasiones/partido', applicableTo: 'field' },
  { key: 'pasesPorPartido', label: 'Pases/partido', applicableTo: 'field' },
  { key: 'centrosPorPartido', label: 'Centros/partido', applicableTo: 'field' },

  // Métricas de portero (posicion === 'Portero')
  { key: 'atajadas', label: 'Atajadas', applicableTo: 'goalkeeper' },
  { key: 'golesRecibidos', label: 'Goles Recibidos', applicableTo: 'goalkeeper' },
  { key: 'porcentajeAtajadas', label: 'Efectividad Atajadas', unit: '%', applicableTo: 'goalkeeper' },
  { key: 'erroresQueGeneraronGol', label: 'Errores con Gol', applicableTo: 'goalkeeper' },

  // Métricas compartidas
  { key: 'despejesPorPartido', label: 'Despejes/partido', applicableTo: 'all' },
  { key: 'autogoles', label: 'Autogoles', applicableTo: 'all' },
];

export const StatsGrid: React.FC<StatsGridProps> = ({ estadisticas, posicion }) => {
  const isPortero = posicion === 'Portero';

  const metricsToRender = METRIC_DEFINITIONS.filter((metric) => {
    // Filtrar por rol
    if (metric.applicableTo === 'field' && isPortero) {
      return false;
    }
    if (metric.applicableTo === 'goalkeeper' && !isPortero) {
      return false;
    }

    // Filtrar valores null o undefined
    const value = estadisticas[metric.key];
    if (value === null || value === undefined) {
      return false;
    }

    return true;
  });

  return (
    <div className="stats-grid-container">
      <div className="stats-season-banner">
        <span className="stats-season-text">
          Temporada {estadisticas.temporada} • {estadisticas.liga}
        </span>
      </div>
      <div className="stats-grid" data-testid="stats-grid">
        {metricsToRender.map((metric) => {
          const rawVal = estadisticas[metric.key];
          const numVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
          return (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={numVal}
              unit={metric.unit}
            />
          );
        })}
      </div>
    </div>
  );
};
