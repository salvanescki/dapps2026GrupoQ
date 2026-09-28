import React from 'react';
import type { CardProps } from '../../types/ui.types';

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const variantClass = `card-${variant}`;
  const paddingClass = `card-padding-${padding}`;

  return (
    <div
      {...props}
      className={`card ${variantClass} ${paddingClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
};
