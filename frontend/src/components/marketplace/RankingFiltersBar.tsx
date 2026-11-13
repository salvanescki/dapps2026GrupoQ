import React from 'react';
import { Button } from '../ui/Button';
import type { PosicionFiltroRanking } from '../../types/marketplace.types';

export type OpcionDemarcacion = PosicionFiltroRanking | 'Todas';

const DEMARCACIONES: OpcionDemarcacion[] = [
  'Todas',
  'Portero',
  'Defensa',
  'Mediocampista',
  'Delantero',
];

export interface RankingFiltersBarProps {
  posicionActiva: OpcionDemarcacion;
  onCambiarPosicion: (posicion: OpcionDemarcacion) => void;
  onActualizar: () => void;
  cargando?: boolean;
}

export const RankingFiltersBar: React.FC<RankingFiltersBarProps> = ({
  posicionActiva,
  onCambiarPosicion,
  onActualizar,
  cargando = false,
}) => {
  return (
    <section
      className="ranking-filters-bar"
      aria-label="Filtros del ranking de cotizaciones"
    >
      <fieldset
        className="ranking-position-tabs"
        aria-label="Filtrar por demarcación táctica"
      >
        {DEMARCACIONES.map((demarcacion) => {
          const esActiva = posicionActiva === demarcacion;
          return (
            <button
              key={demarcacion}
              type="button"
              className={`ranking-position-tab ${esActiva ? 'active' : ''}`.trim()}
              aria-pressed={esActiva}
              onClick={() => onCambiarPosicion(demarcacion)}
            >
              {demarcacion}
            </button>
          );
        })}
      </fieldset>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        cargando={cargando}
        textoCarga="Actualizando..."
        onClick={onActualizar}
      >
        Actualizar
      </Button>
    </section>
  );
};

