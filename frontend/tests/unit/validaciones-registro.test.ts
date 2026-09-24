// ============================================================
// Tests unitarios para funciones de validación de registro
// Cubre happy paths y edge cases de cada función
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  validarNombre,
  validarFormatoContrasena,
  validarConfirmacionContrasena,
  validarFormularioRegistro,
  sanitizarDatosRegistro,
} from '../../src/utils/validaciones';

// ─── validarNombre ───

describe('validarNombre', () => {
  it('debería retornar error si el nombre está vacío', () => {
    expect(validarNombre('')).toBe(
      'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.'
    );
  });

  it('debería retornar error si el nombre solo tiene espacios', () => {
    expect(validarNombre('   ')).toBe(
      'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.'
    );
  });

  it('debería retornar error si el nombre tiene 1 carácter', () => {
    expect(validarNombre('A')).toBe(
      'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.'
    );
  });

  it('debería retornar error si el nombre tiene 1 carácter tras trim', () => {
    expect(validarNombre('  B  ')).toBe(
      'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.'
    );
  });

  it('debería retornar error si el nombre excede 100 caracteres', () => {
    const nombreLargo = 'A'.repeat(101);
    expect(validarNombre(nombreLargo)).toBe(
      'El nombre es obligatorio y debe tener entre 2 y 100 caracteres.'
    );
  });

  it('debería retornar undefined para nombre válido de 2 caracteres', () => {
    expect(validarNombre('AB')).toBeUndefined();
  });

  it('debería retornar undefined para nombre válido de 100 caracteres', () => {
    const nombre100 = 'A'.repeat(100);
    expect(validarNombre(nombre100)).toBeUndefined();
  });

  it('debería retornar undefined para nombre válido con espacios laterales', () => {
    expect(validarNombre('  Juan Perez  ')).toBeUndefined();
  });
});

// ─── validarFormatoContrasena ───

describe('validarFormatoContrasena', () => {
  it('debería retornar error si la contraseña está vacía', () => {
    expect(validarFormatoContrasena('')).toBe('La contraseña es obligatoria.');
  });

  it('debería retornar error si la contraseña tiene menos de 8 caracteres', () => {
    expect(validarFormatoContrasena('Abc1234')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar error si la contraseña no tiene mayúscula', () => {
    expect(validarFormatoContrasena('abcdefg1')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar error si la contraseña no tiene minúscula', () => {
    expect(validarFormatoContrasena('ABCDEFG1')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar error si la contraseña no tiene número', () => {
    expect(validarFormatoContrasena('Abcdefgh')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar error para contraseña solo de números', () => {
    expect(validarFormatoContrasena('12345678')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar error para contraseña solo de minúsculas', () => {
    expect(validarFormatoContrasena('abcdefgh')).toBe(
      'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );
  });

  it('debería retornar undefined para contraseña válida con 8 caracteres', () => {
    expect(validarFormatoContrasena('Clave123')).toBeUndefined();
  });

  it('debería retornar undefined para contraseña válida larga', () => {
    expect(validarFormatoContrasena('SuperClave2026!')).toBeUndefined();
  });
});

// ─── validarConfirmacionContrasena ───

describe('validarConfirmacionContrasena', () => {
  it('debería retornar error si la confirmación está vacía', () => {
    expect(validarConfirmacionContrasena('Clave123', '')).toBe(
      'La confirmación de la contraseña es obligatoria.'
    );
  });

  it('debería retornar error si las contraseñas no coinciden', () => {
    expect(validarConfirmacionContrasena('Clave123', 'ClaveDiferente')).toBe(
      'Las contraseñas no coinciden.'
    );
  });

  it('debería retornar undefined si las contraseñas coinciden', () => {
    expect(validarConfirmacionContrasena('Clave123', 'Clave123')).toBeUndefined();
  });

  it('debería ser sensible a mayúsculas/minúsculas', () => {
    expect(validarConfirmacionContrasena('Clave123', 'clave123')).toBe(
      'Las contraseñas no coinciden.'
    );
  });
});

// ─── validarFormularioRegistro ───

describe('validarFormularioRegistro', () => {
  const datosValidos = {
    nombre: 'Juan Perez',
    correo: 'juan@ejemplo.com',
    contrasena: 'Clave1234',
    confirmarContrasena: 'Clave1234',
  };

  it('debería retornar esValido=true con datos completos y válidos', () => {
    const resultado = validarFormularioRegistro(datosValidos);
    expect(resultado.esValido).toBe(true);
    expect(resultado.errores).toEqual({});
  });

  it('debería retornar todos los errores con campos vacíos', () => {
    const resultado = validarFormularioRegistro({
      nombre: '',
      correo: '',
      contrasena: '',
      confirmarContrasena: '',
    });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.nombre).toBeDefined();
    expect(resultado.errores.correo).toBeDefined();
    expect(resultado.errores.contrasena).toBeDefined();
    expect(resultado.errores.confirmarContrasena).toBeDefined();
  });

  it('debería retornar error solo de nombre si los demás son válidos', () => {
    const resultado = validarFormularioRegistro({
      ...datosValidos,
      nombre: 'A',
    });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.nombre).toBeDefined();
    expect(resultado.errores.correo).toBeUndefined();
    expect(resultado.errores.contrasena).toBeUndefined();
    expect(resultado.errores.confirmarContrasena).toBeUndefined();
  });

  it('debería retornar error de correo inválido', () => {
    const resultado = validarFormularioRegistro({
      ...datosValidos,
      correo: 'correo_invalido',
    });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.correo).toBe('El formato del correo electrónico es inválido.');
  });

  it('debería retornar error de contraseña débil', () => {
    const resultado = validarFormularioRegistro({
      ...datosValidos,
      contrasena: 'abc',
      confirmarContrasena: 'abc',
    });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.contrasena).toBeDefined();
  });

  it('debería retornar error de confirmación no coincidente', () => {
    const resultado = validarFormularioRegistro({
      ...datosValidos,
      confirmarContrasena: 'Diferente1234',
    });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.confirmarContrasena).toBe('Las contraseñas no coinciden.');
  });
});

// ─── sanitizarDatosRegistro ───

describe('sanitizarDatosRegistro', () => {
  it('debería aplicar trim al nombre', () => {
    const resultado = sanitizarDatosRegistro({
      nombre: '  Juan Perez  ',
      correo: 'juan@ejemplo.com',
      contrasena: 'Clave1234',
      confirmarContrasena: 'Clave1234',
    });
    expect(resultado.nombre).toBe('Juan Perez');
  });

  it('debería aplicar trim y lowercase al correo', () => {
    const resultado = sanitizarDatosRegistro({
      nombre: 'Juan',
      correo: '  Juan@Ejemplo.COM  ',
      contrasena: 'Clave1234',
      confirmarContrasena: 'Clave1234',
    });
    expect(resultado.correo).toBe('juan@ejemplo.com');
  });

  it('no debería alterar la contraseña', () => {
    const resultado = sanitizarDatosRegistro({
      nombre: 'Juan',
      correo: 'juan@ejemplo.com',
      contrasena: '  Clave1234  ',
      confirmarContrasena: '  Clave1234  ',
    });
    expect(resultado.contrasena).toBe('  Clave1234  ');
  });

  it('no debería incluir confirmarContrasena en el resultado', () => {
    const resultado = sanitizarDatosRegistro({
      nombre: 'Juan',
      correo: 'juan@ejemplo.com',
      contrasena: 'Clave1234',
      confirmarContrasena: 'Clave1234',
    });
    expect(resultado).not.toHaveProperty('confirmarContrasena');
    expect(Object.keys(resultado)).toEqual(['nombre', 'correo', 'contrasena']);
  });
});
