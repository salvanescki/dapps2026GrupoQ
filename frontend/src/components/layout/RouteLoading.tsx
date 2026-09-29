import React from 'react';

export interface RouteLoadingProps {
  mensaje?: string;
  className?: string;
}

export const RouteLoading: React.FC<RouteLoadingProps> = ({
  mensaje = 'Cargando sesión',
  className = 'login-page route-loading',
}) => {
  return (
    <div className={className}>
      <div className="spinner spinner-lg" aria-label={mensaje} />
    </div>
  );
};
