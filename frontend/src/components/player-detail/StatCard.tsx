import React from 'react';

export interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, unit }) => {
  return (
    <div className="stat-card" data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="stat-value">
        {value}
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
};
