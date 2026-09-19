import { Usuario } from './usuario.entity';

export const USUARIO_REPOSITORY = 'USUARIO_REPOSITORY';

export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<void>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  existePorCorreo(correo: string): Promise<boolean>;
}
