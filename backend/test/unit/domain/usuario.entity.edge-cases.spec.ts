import { Usuario } from '../../../src/domain/usuario.entity';
import { ReglaDeNegocioException } from '../../../src/domain/exceptions/regla-de-negocio.exception';

describe('Usuario Entity - Edge Cases and Validation Branches', () => {
  const baseProps = {
    nombre: 'Lionel Messi',
    correo: 'messi@seleccion.com',
    contrasenaHash: '$2b$10$hashedpasswordexample1234567890',
  };

  it('debe lanzar excepcion si el nombre excede 100 caracteres', () => {
    expect(() =>
      Usuario.crear({
        ...baseProps,
        nombre: 'A'.repeat(101),
      })
    ).toThrow('El nombre es obligatorio y debe tener entre 2 y 100 caracteres.');
  });

  it('debe lanzar excepcion si el correo esta vacio', () => {
    expect(() =>
      Usuario.crear({
        ...baseProps,
        correo: '',
      })
    ).toThrow('El correo electrónico es obligatorio.');

    expect(() =>
      Usuario.crear({
        ...baseProps,
        correo: '   ',
      })
    ).toThrow('El correo electrónico es obligatorio.');
  });

  it('debe lanzar excepcion si el hash de contrasena esta vacio', () => {
    expect(() =>
      Usuario.crear({
        ...baseProps,
        contrasenaHash: '',
      })
    ).toThrow('El hash de la contraseña no puede estar vacío.');

    expect(() =>
      Usuario.crear({
        ...baseProps,
        contrasenaHash: '   ',
      })
    ).toThrow('El hash de la contraseña no puede estar vacío.');
  });

  it('debe permitir reactivar el usuario con activar() y actualizar actualizadoEn', () => {
    const usuario = Usuario.crear(baseProps);
    usuario.desactivar();
    expect(usuario.activo).toBe(false);

    usuario.activar();
    expect(usuario.activo).toBe(true);
    expect(usuario.actualizadoEn).toBeInstanceOf(Date);
  });

  it('debe retornar cadena vacia en normalizarCorreo si el correo es nulo o vacio', () => {
    expect(Usuario.normalizarCorreo('')).toBe('');
    expect(Usuario.normalizarCorreo(null as unknown as string)).toBe('');
    expect(Usuario.normalizarCorreo(undefined as unknown as string)).toBe('');
  });

  it('debe lanzar excepcion en validarFormatoContrasena si no se envia o no es string', () => {
    expect(() => Usuario.validarFormatoContrasena('')).toThrow(
      'La contraseña es requerida.'
    );
    expect(() => Usuario.validarFormatoContrasena(null as unknown as string)).toThrow(
      'La contraseña es requerida.'
    );
  });

  it('debe exponer todos los getters correctamente', () => {
    const usuario = Usuario.crear(baseProps);

    expect(usuario.id).toBeDefined();
    expect(usuario.nombre).toBe(baseProps.nombre);
    expect(usuario.correo).toBe(baseProps.correo);
    expect(usuario.contrasenaHash).toBe(baseProps.contrasenaHash);
    expect(usuario.activo).toBe(true);
    expect(usuario.creadoEn).toBeInstanceOf(Date);
    expect(usuario.actualizadoEn).toBeInstanceOf(Date);
  });
});
