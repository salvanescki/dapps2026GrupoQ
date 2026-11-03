import React from 'react';
import type { SemanaDisponibleUI } from '../../types/team-of-the-week.types';

interface WeekSelectorProps {
  semanas: SemanaDisponibleUI[];
  semanaActual: { ano: number; semanaIso: number } | null;
  onSeleccionar: (ano: number, semanaIso: number) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  semanas,
  semanaActual,
  onSeleccionar,
}) => {
  if (!semanas || semanas.length === 0) {
    return null;
  }

  const valorActual = semanaActual
    ? `${semanaActual.ano}-${semanaActual.semanaIso}`
    : `${semanas[0].ano}-${semanas[0].semanaIso}`;

  const formatearFecha = (iso: string): string => {
    const fecha = new Date(iso);
    return `${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [anoStr, semanaStr] = e.target.value.split('-');
    const ano = Number.parseInt(anoStr, 10);
    const semanaIso = Number.parseInt(semanaStr, 10);
    if (!Number.isNaN(ano) && !Number.isNaN(semanaIso)) {
      onSeleccionar(ano, semanaIso);
    }
  };

  return (
    <div className="week-selector-container">
      <label htmlFor="week-select" className="week-selector-label">
        Edición semanal
      </label>
      <select
        id="week-select"
        data-testid="week-select"
        className="week-selector"
        value={valorActual}
        onChange={handleChange}
      >
        {semanas.map((s) => (
          <option key={`${s.ano}-${s.semanaIso}`} value={`${s.ano}-${s.semanaIso}`}>
            Semana {s.semanaIso}, {s.ano} - generado el {formatearFecha(s.fechaGeneracion)}
          </option>
        ))}
      </select>
    </div>
  );
};
