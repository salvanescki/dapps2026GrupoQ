import { ConfiguracionMercado } from './configuracion-mercado.entity';

export const CONFIGURACION_MERCADO_REPOSITORY =
  'CONFIGURACION_MERCADO_REPOSITORY';

export interface IConfiguracionMercadoRepository {
  obtenerConfiguracion(): Promise<ConfiguracionMercado>;
  guardar(configuracion: ConfiguracionMercado): Promise<void>;
}
