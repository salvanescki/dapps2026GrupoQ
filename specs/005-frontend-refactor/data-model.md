# Data Model & Component Interfaces: Frontend Refactor

**Feature**: `005-frontend-refactor`  
**Date**: 2026-09-28  

## Modelos de Datos e Interfaces de Componentes

### 1. Componentes Base de UI (`components/ui/`)

#### `Input` / `FormField` (`FormFieldProps`)
```typescript
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  icon?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}
```

#### `Button` (`ButtonProps`)
```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  cargando?: boolean;
  textoCarga?: string;
  icono?: string | React.ReactNode;
}
```

#### `Alert` (`AlertProps`)
```typescript
export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  tipo: AlertType;
  mensaje: string;
  onCerrar?: () => void;
  className?: string;
}
```

#### `Card` (`CardProps`)
```typescript
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

#### `Navbar` (`NavbarProps`)
```typescript
export interface NavItem {
  label: string;
  to: string;
  icon?: string;
  id?: string;
}

export interface NavbarProps {
  titulo?: string;
  logoIcono?: string;
  usuario?: {
    nombre: string;
    correo: string;
  } | null;
  items?: NavItem[];
  onLogout?: () => void;
}
```

#### `Spinner` (`SpinnerProps`)
```typescript
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  className?: string;
}
```

---

### 2. Contratos de Hooks Reutilizables (`hooks/`)

#### `useForm` / `useFormValidation`
```typescript
export interface UseFormConfig<T extends Record<string, any>> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  validateField?: (name: keyof T, value: any, values: T) => string | undefined;
  sanitize?: (values: T) => T;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  cargando: boolean;
  errorServidor: string | null;
  handleChange: (name: keyof T, value: any) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setErrorServidor: (error: string | null) => void;
  setFieldValue: (name: keyof T, value: any) => void;
  reset: () => void;
}
```

---

### 3. Componentes de Dominio (`components/auth/`, `components/layout/`)

#### `LoginForm` (`LoginFormProps`)
```typescript
export interface LoginFormProps {
  onSubmit: (credenciales: { correo: string; contrasena: string }) => Promise<void>;
  cargando: boolean;
  errorServidor?: string | null;
  onClearError?: () => void;
}
```

#### `RegisterForm` (`RegisterFormProps`)
```typescript
export interface RegisterFormProps {
  onSubmit: (datos: {
    nombre: string;
    correo: string;
    contrasena: string;
    confirmarContrasena: string;
  }) => Promise<void>;
  cargando: boolean;
  errorServidor?: string | null;
  onClearError?: () => void;
}
```

#### `AppLayout` (`AppLayoutProps`)
```typescript
export interface AppLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  hideNavbar?: boolean;
}
```
