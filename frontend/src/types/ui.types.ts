import React from 'react';

// ============================================================
// UI Base Component Types
// ============================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  cargando?: boolean;
  textoCarga?: string;
  icono?: React.ReactNode;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  tipo: AlertType;
  mensaje: string;
  onCerrar?: () => void;
  className?: string;
  id?: string;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  className?: string;
}

// ============================================================
// Layout & Navigation Types
// ============================================================

export interface NavItem {
  label: string;
  to: string;
  icon?: React.ReactNode;
  id?: string;
}

export interface NavbarProps {
  titulo?: string;
  logoIcono?: React.ReactNode;
  usuario?: {
    nombre: string;
    correo?: string;
  } | null;
  items?: NavItem[];
  onLogout?: () => void;
  brandLink?: string;
}

export interface AppLayoutProps {
  children: React.ReactNode;
  navbarProps?: NavbarProps;
  hideNavbar?: boolean;
  className?: string;
}

export interface AuthLayoutProps {
  titulo?: string;
  subtitulo?: string;
  logoIcono?: React.ReactNode;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  className?: string;
}
