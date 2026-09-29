import { useState, type FormEvent } from 'react';

export interface UseFormOptions<TValues extends Record<string, any>, TOutput = TValues> {
  initialValues: TValues;
  validate?: (values: TValues) => { esValido: boolean; errores: Partial<Record<keyof TValues, string>> };
  validateField?: (name: keyof TValues, value: TValues[keyof TValues], values: TValues) => string | undefined;
  sanitize?: (values: TValues) => TOutput;
  onSubmit: (values: TOutput) => Promise<void> | void;
  onFieldChange?: (name: keyof TValues, value: TValues[keyof TValues]) => void;
}

export function useForm<TValues extends Record<string, any>, TOutput = TValues>({
  initialValues,
  validate,
  validateField,
  sanitize,
  onSubmit,
  onFieldChange,
}: UseFormOptions<TValues, TOutput>) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const handleChange = (name: keyof TValues, value: TValues[keyof TValues]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorServidor) {
      setErrorServidor(null);
    }
    if (onFieldChange) {
      onFieldChange(name, value);
    }
  };

  const handleBlur = (name: keyof TValues) => {
    if (validateField) {
      const error = validateField(name, values[name], values);
      if (error) {
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    }
  };

  const setFieldValue = <K extends keyof TValues>(name: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setFieldError = (name: keyof TValues, error: string | undefined) => {
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

    const dataToSend = sanitize ? sanitize(values) : (values as unknown as TOutput);
    setCargando(true);

    try {
      await onSubmit(dataToSend);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado';
      setErrorServidor(message);
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
