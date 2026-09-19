import { DataSource } from 'typeorm';
import { TestcontainersHelper } from './setup-testcontainers';
import { UsuarioTypeOrmRepository } from '../../src/data-access/usuario.typeorm-repository';
import { UsuarioOrmEntity } from '../../src/data-access/usuario.orm-entity';
import { Usuario } from '../../src/domain/usuario.entity';

describe('UsuarioTypeOrmRepository (Integration with Testcontainers)', () => {
  let dataSource: DataSource;
  let repository: UsuarioTypeOrmRepository;

  beforeAll(async () => {
    const started = await TestcontainersHelper.start();
    dataSource = started.dataSource;
    const ormRepo = dataSource.getRepository(UsuarioOrmEntity);
    repository = new UsuarioTypeOrmRepository(ormRepo);
  }, 90000);

  afterAll(async () => {
    await TestcontainersHelper.stop();
  });

  beforeEach(async () => {
    await TestcontainersHelper.cleanDatabase();
  });

  it('debe persistir un usuario y recuperarlo por ID', async () => {
    const usuario = Usuario.crear({
      nombre: 'Kylian Mbappe',
      correo: 'mbappe@realmadrid.com',
      contrasenaHash: 'hashCriptografico123',
    });

    await repository.guardar(usuario);

    const recuperado = await repository.buscarPorId(usuario.id);

    expect(recuperado).not.toBeNull();
    expect(recuperado.id).toBe(usuario.id);
    expect(recuperado.nombre).toBe('Kylian Mbappe');
    expect(recuperado.correo).toBe('mbappe@realmadrid.com');
    expect(recuperado.contrasenaHash).toBe('hashCriptografico123');
    expect(recuperado.activo).toBe(true);
  });

  it('debe buscar un usuario por correo insensible a mayúsculas/minúsculas y espacios', async () => {
    const usuario = Usuario.crear({
      nombre: 'Jude Bellingham',
      correo: 'jude@realmadrid.com',
      contrasenaHash: 'hashJude123',
    });

    await repository.guardar(usuario);

    const encontrado = await repository.buscarPorCorreo('  JUDE@REALMADRID.COM  ');
    expect(encontrado).not.toBeNull();
    expect(encontrado.id).toBe(usuario.id);

    const existe = await repository.existePorCorreo('Jude@RealMadrid.com');
    expect(existe).toBe(true);

    const noExiste = await repository.existePorCorreo('noexiste@realmadrid.com');
    expect(noExiste).toBe(false);
  });

  it('debe fallar si se intenta guardar un usuario con correo duplicado en la base de datos', async () => {
    const usuario1 = Usuario.crear({
      nombre: 'Erling Haaland',
      correo: 'haaland@mancity.com',
      contrasenaHash: 'hash123',
    });
    const usuario2 = Usuario.crear({
      nombre: 'Erling Haaland Clon',
      correo: 'haaland@mancity.com',
      contrasenaHash: 'hash456',
    });

    await repository.guardar(usuario1);

    await expect(repository.guardar(usuario2)).rejects.toThrow();
  });
});
