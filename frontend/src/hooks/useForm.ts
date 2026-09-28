import { useState, type FormEvent } from 'react';

export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validate?: (values: T) => { esValido: boolean; errores: Partial<Record<keyof T, string>> };
  validateField?: (name: keyof T, value: any, values: T) => string | undefined;
  sanitize?: (values: T) => T;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  validateField,
  sanitize,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorServidor) {
      setErrorServidor(null);
    }
  };

  const handleBlur = (name: keyof T) => {
    if (validateField) {
      const error = validateField(name, values[name], values);
      if (error) {
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    }
  };

  const setFieldValue = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setFieldError = (name: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const limpiarErrorServidor = () => {
    setErrorServidor(null);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (errorServidor) {
      setErrorServidor(null);
    }

    if (validate) {
      const { esValido, errores } = validate(values);
      setErrors(errores);
      if (!esValido) {
        return;
      }
    }

    const dataToSend = sanitize ? sanitize(values) : values;
    setCargando(true);

    try {
      await onSubmit(dataToSend);
    } catch (err: any) {
      setErrorServidor(err.message || 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setErrorServidor(null);
    setCargando(false);
  };

  return {
    values,
    errors,
    cargando,
    errorServidor,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setErrorServidor,
    limpiarErrorServidor,
    reset,
  };
}
