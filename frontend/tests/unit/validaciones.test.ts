// ============================================================
// Tests unitarios para funciones de validación de formulario
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  validarCorreo,
  validarContrasena,
  validarFormularioLogin,
  sanitizarCredenciales,
} from '../../src/utils/validaciones';

describe('validarCorreo', () => {
  it('debería retornar error si el correo está vacío', () => {
    expect(validarCorreo('')).toBe('El correo electrónico es obligatorio.');
  });

  it('debería retornar error si el correo solo tiene espacios', () => {
    expect(validarCorreo('   ')).toBe('El correo electrónico es obligatorio.');
  });

  it('debería retornar error si el correo no tiene formato válido', () => {
    expect(validarCorreo('usuario_sin_arroba')).toBe(
      'El formato del correo electrónico es inválido.'
    );
  });

  it('debería retornar error para correo sin dominio', () => {
    expect(validarCorreo('usuario@')).toBe(
      'El formato del correo electrónico es inválido.'
    );
  });

  it('debería retornar error para correo sin TLD', () => {
    expect(validarCorreo('usuario@dominio')).toBe(
      'El formato del correo electrónico es inválido.'
    );
  });

  it('debería retornar undefined para correo válido', () => {
    expect(validarCorreo('inversor@tokens.com')).toBeUndefined();
  });

  it('debería retornar undefined para correo válido con espacios laterales', () => {
    expect(validarCorreo('  inversor@tokens.com  ')).toBeUndefined();
  });

  it('debería retornar undefined para correo con subdominio', () => {
    expect(validarCorreo('user@sub.domain.com')).toBeUndefined();
  });
});

describe('validarContrasena', () => {
  it('debería retornar error si la contraseña está vacía', () => {
    expect(validarContrasena('')).toBe('La contraseña es obligatoria.');
  });

  it('debería retornar undefined para contraseña con al menos 1 carácter', () => {
    expect(validarContrasena('a')).toBeUndefined();
  });

  it('debería retornar undefined para contraseña larga', () => {
    expect(validarContrasena('SuperClave2026!')).toBeUndefined();
  });
});

describe('validarFormularioLogin', () => {
  it('debería retornar ambos errores con campos vacíos', () => {
    const resultado = validarFormularioLogin({ correo: '', contrasena: '' });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.correo).toBe('El correo electrónico es obligatorio.');
    expect(resultado.errores.contrasena).toBe('La contraseña es obligatoria.');
  });

  it('debería retornar error solo de correo si contraseña es válida', () => {
    const resultado = validarFormularioLogin({ correo: 'invalido', contrasena: 'Clave123' });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.correo).toBe('El formato del correo electrónico es inválido.');
    expect(resultado.errores.contrasena).toBeUndefined();
  });

  it('debería retornar error solo de contraseña si correo es válido', () => {
    const resultado = validarFormularioLogin({ correo: 'a@b.com', contrasena: '' });
    expect(resultado.esValido).toBe(false);
    expect(resultado.errores.correo).toBeUndefined();
    expect(resultado.errores.contrasena).toBe('La contraseña es obligatoria.');
  });

  it('debería retornar esValido=true con datos correctos', () => {
    const resultado = validarFormularioLogin({ correo: 'a@b.com', contrasena: 'Pass' });
    expect(resultado.esValido).toBe(true);
    expect(resultado.errores).toEqual({});
  });
});

describe('sanitizarCredenciales', () => {
  it('debería aplicar trim y lowercase al correo', () => {
    const result = sanitizarCredenciales({
      correo: '  Inversor@Tokens.COM  ',
      contrasena: 'MiClave',
    });
    expect(result.correo).toBe('inversor@tokens.com');
    expect(result.contrasena).toBe('MiClave');
  });

  it('no debería alterar la contraseña', () => {
    const result = sanitizarCredenciales({
      correo: 'a@b.com',
      contrasena: '  EspacioConservado  ',
    });
    expect(result.contrasena).toBe('  EspacioConservado  ');
  });
});
