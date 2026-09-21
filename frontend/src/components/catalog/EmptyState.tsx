import React from 'react';

interface EmptyStateProps {
  onReset: () => void;
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onReset,
  title = 'No se encontraron resultados',
  message = 'No se encontraron jugadores que coincidan con los filtros seleccionados.',
}) => {
  return (
    <div className="catalog-empty-state" data-testid="empty-state">
      <div className="empty-state-icon-box" aria-hidden="true">
        🔍
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{message}</p>
      <button
        type="button"
        className="empty-state-action-btn"
        onClick={onReset}
        data-testid="empty-state-reset-btn"
      >
        Restablecer Filtros
      </button>
    </div>
  );
};
