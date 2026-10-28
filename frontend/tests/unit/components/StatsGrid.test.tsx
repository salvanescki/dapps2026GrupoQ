import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsGrid } from '../../../src/components/player-detail/StatsGrid';
import type { EstadisticasJugador } from '../../../src/types/player.types';

describe('StatsGrid Component', () => {
  const statsCompletasDelantero: EstadisticasJugador = {
    temporada: '2024/2025',
    liga: 'Premier League',
    partidosJugados: 30,
    minutosJugados: 2500,
    goles: 18,
    asistencias: 7,
    tarjetasAmarillas: 2,
    tarjetasRojas: 0,
    rating: 7.82,
    tirosPorPartido: 3.1,
    precisionPase: 84.5,
    xgPorPartido: 0.55,
    xaPorPartido: 0.22,
    regatesCompletadosPorPartido: 2.4,
    pasesClavePorPartido: 1.8,
    entradasPorPartido: 0.9,
    intercepccionesPorPartido: 0.4,
    // Métricas de portero presentes en datos pero no deben mostrarse para delantero
    atajadas: 0,
    golesRecibidos: 0,
    porcentajeAtajadas: 0,
    erroresQueGeneraronGol: 0,
  };

  const statsCompletasPortero: EstadisticasJugador = {
    temporada: '2024/2025',
    liga: 'Premier League',
    partidosJugados: 38,
    minutosJugados: 3420,
    goles: 0,
    asistencias: 1,
    tarjetasAmarillas: 1,
    tarjetasRojas: 0,
    rating: 7.15,
    atajadas: 112,
    golesRecibidos: 34,
    porcentajeAtajadas: 76.5,
    erroresQueGeneraronGol: 2,
    // Métricas de campo no aplicables a arquero
    tirosPorPartido: 0.1,
    regatesCompletadosPorPartido: 0.2,
    xgPorPartido: 0.01,
  };

  it('debe renderizar métricas ofensivas/defensivas para jugador de campo y ocultar métricas de portero', () => {
    render(
      <StatsGrid
        estadisticas={statsCompletasDelantero}
        posicion="Delantero"
      />,
    );

    // Métricas comunes y de campo presentes
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Partidos')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Goles')).toBeInTheDocument();
    expect(screen.getByText('Tiros/partido')).toBeInTheDocument();
    expect(screen.getByText('Precisión de Pase')).toBeInTheDocument();
    expect(screen.getByText('xG/partido')).toBeInTheDocument();

    // Métricas de arquero ausentes
    expect(screen.queryByText('Atajadas')).not.toBeInTheDocument();
    expect(screen.queryByText('Goles Recibidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Efectividad Atajadas')).not.toBeInTheDocument();
    expect(screen.queryByText('Errores con Gol')).not.toBeInTheDocument();
  });

  it('debe renderizar métricas de portero para posicion Portero y ocultar métricas de campo', () => {
    render(
      <StatsGrid
        estadisticas={statsCompletasPortero}
        posicion="Portero"
      />,
    );

    // Métricas comunes y de arquero presentes
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('Partidos')).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByText('Atajadas')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('Goles Recibidos')).toBeInTheDocument();
    expect(screen.getByText('Efectividad Atajadas')).toBeInTheDocument();

    // Métricas de campo ausentes
    expect(screen.queryByText('Tiros/partido')).not.toBeInTheDocument();
    expect(screen.queryByText('Regates/partido')).not.toBeInTheDocument();
    expect(screen.queryByText('xG/partido')).not.toBeInTheDocument();
  });

  it('debe omitir cualquier métrica cuyo valor sea null o undefined (sin N/A ni guiones)', () => {
    const statsConNulos: EstadisticasJugador = {
      temporada: '2024/2025',
      liga: 'La Liga',
      partidosJugados: 12,
      minutosJugados: 850,
      goles: 3,
      asistencias: 0,
      tarjetasAmarillas: 1,
      tarjetasRojas: 0,
      rating: null,
      tirosPorPartido: null,
      precisionPase: undefined,
      xgPorPartido: null,
      xaPorPartido: null,
    };

    render(
      <StatsGrid
        estadisticas={statsConNulos}
        posicion="Mediocampista"
      />,
    );

    // Obligatorios presentes
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Partidos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Goles')).toBeInTheDocument();

    // Nulos / indefinidos omitidos (no existen en el documento)
    expect(screen.queryByText('Rating WhoScored')).not.toBeInTheDocument();
    expect(screen.queryByText('Tiros/partido')).not.toBeInTheDocument();
    expect(screen.queryByText('Precisión de Pase')).not.toBeInTheDocument();
    expect(screen.queryByText('xG/partido')).not.toBeInTheDocument();
    expect(screen.queryByText('xA/partido')).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });
});
