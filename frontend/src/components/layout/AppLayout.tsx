import React from 'react';
import type { AppLayoutProps } from '../../types/ui.types';
import { Navbar } from './Navbar';

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  navbarProps,
  hideNavbar = false,
  className = '',
}) => {
  return (
    <div className={`app-layout ${className}`.trim()}>
      {!hideNavbar && navbarProps && <Navbar {...navbarProps} />}
      {children}
    </div>
  );
};
