import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MarketplaceTestDatabaseHelper } from './marketplace-test-database.helper';
import { AppModule } from '../../../src/app.module';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

interface PostmanItem {
  name: string;
  request?: {
    method: string;
    url: {
      raw: string;
      path?: string[];
      query?: Array<{ key: string; value: string; disabled?: boolean }>;
    };
    body?: {
      mode?: string;
      raw?: string;
    };
  };
  event?: Array<{
    listen: string;
    script?: {
      exec?: string[];
    };
  }>;
  item?: PostmanItem[];
}

interface FlattenedPostmanRequest {
  folder: string;
  name: string;
  method: string;
  rawUrl: string;
  normalizedPath: string;
  queryParams: string[];
  bodyKeys: string[];
  testScriptLines: string[];
}

function aplanarColeccionPostman(
  items: PostmanItem[],
  folderName = '',
): FlattenedPostmanRequest[] {
  const resultado: FlattenedPostmanRequest[] = [];

  for (const it of items) {
    if (it.item && it.item.length > 0) {
      resultado.push(...aplanarColeccionPostman(it.item, it.name));
    } else if (it.request) {
      const rawUrl = it.request.url.raw || '';
      const method = (it.request.method || 'GET').toUpperCase();

      let pathname = rawUrl
        .replace(/^\{\{base_url\}\}/, '')
        .replace(/^https?:\/\/[^/]+/, '')
        .split('?')[0];

      if (!pathname.startsWith('/')) {
        pathname = `/${pathname}`;
      }

      // Normaliza variables Postman y UUIDs a {id} para coincidir con Swagger
      const normalizedPath = pathname
        .replace(
          /\{\{(?:jugador_id|orden_venta_id|trader1_id|trader2_id|admin_id|id)\}\}/g,
          '{id}',
        )
        .replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          '{id}',
        );

      const queryParams = (it.request.url.query || [])
        .filter((q) => !q.disabled)
        .map((q) => q.key);

      let bodyKeys: string[] = [];
      if (it.request.body?.mode === 'raw' && it.request.body.raw) {
        try {
          const parsed = JSON.parse(it.request.body.raw);
          if (parsed && typeof parsed === 'object') {
            bodyKeys = Object.keys(parsed);
          }
        } catch {
          bodyKeys = [];
        }
      }

      const testEvent = it.event?.find((e) => e.listen === 'test');
      const testScriptLines = testEvent?.script?.exec || [];

      resultado.push({
        folder: folderName,
        name: it.name,
        method,
        rawUrl,
        normalizedPath,
        queryParams,
        bodyKeys,
        testScriptLines,
      });
    }
  }

  return resultado;
}

describe('Postman ↔ Swagger ↔ Contratos REST Parity (DoD #3, FR-033..FR-035, SC-008)', () => {
  let app: INestApplication;
  let swaggerDoc: OpenAPIObject;
  let postmanRequests: FlattenedPostmanRequest[];
  let openapiAuthPerfilYaml: any;

  beforeAll(async () => {
    const started = await MarketplaceTestDatabaseHelper.start();
    await MarketplaceTestDatabaseHelper.cleanDatabase();

    process.env.DB_HOST = started.container.getHost();
    process.env.DB_PORT = started.container.getPort().toString();
    process.env.DB_USER = started.container.getUsername();
    process.env.DB_PASSWORD = started.container.getPassword();
    process.env.DB_NAME = started.container.getDatabase();
    process.env.JWT_SECRET = 'test_secret_postman_swagger_parity_013';
    process.env.ADMIN_CORREO = 'admin@marketplace.com';
    process.env.ADMIN_CONTRASENA = 'Admin1234!';
    process.env.ADMIN_NOMBRE = 'Administrador Marketplace';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Football Player Token Marketplace API')
      .setDescription(
        'API REST para la compra-venta de tokens de jugadores de fútbol de las 5 grandes ligas europeas (Grupo Q).',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag(
        'scraping',
        'Gestión del proceso de scraping de estadísticas WhoScored',
      )
      .build();

    swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
    await app.init();

    // 1. Cargar colección Postman
    const postmanPath = path.resolve(__dirname, '../../../../postman/collection.json');
    const postmanRaw = fs.readFileSync(postmanPath, 'utf8');
    const postmanJson = JSON.parse(postmanRaw);
    postmanRequests = aplanarColeccionPostman(postmanJson.item || []);

    // 2. Cargar contrato OpenAPI Auth Perfil v1.1
    const yamlPath = path.resolve(
      __dirname,
      '../../../../specs/013-marketplace-frontend/contracts/openapi-auth-perfil-v1.1.yaml',
    );
    const yamlRaw = fs.readFileSync(yamlPath, 'utf8');
    openapiAuthPerfilYaml = yaml.load(yamlRaw);
  }, 90000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await MarketplaceTestDatabaseHelper.stop();
  });

  describe('1. Paridad Swagger vivo vs. Contrato OpenAPI Auth Perfil v1.1 (Grupo A)', () => {
    it('debe contener las 4 rutas de Auth en Swagger coincidiendo con el contrato YAML', () => {
      const rutasEsperadas = ['/auth/register', '/auth/login', '/auth/me', '/auth/logout'];
      for (const ruta of rutasEsperadas) {
        expect(swaggerDoc.paths).toHaveProperty(ruta);
        expect(openapiAuthPerfilYaml.paths).toHaveProperty(ruta);
      }
    });

    it('debe exponer PerfilUsuarioDto con rol (USUARIO | ADMIN) y saldo numérico en Swagger schemas', () => {
      const schemas = (swaggerDoc.components?.schemas || {}) as Record<string, any>;
      expect(schemas).toHaveProperty('PerfilUsuarioDto');

      const perfilSchema = schemas.PerfilUsuarioDto;
      const props = perfilSchema.properties || {};

      expect(props).toHaveProperty('id');
      expect(props).toHaveProperty('nombre');
      expect(props).toHaveProperty('correo');
      expect(props).toHaveProperty('activo');
      expect(props).toHaveProperty('creadoEn');
      expect(props).toHaveProperty('rol');
      expect(props).toHaveProperty('saldo');

      expect(props.saldo.type).toBe('number');
      const rolEnum = props.rol.enum || [];
      expect(rolEnum).toEqual(expect.arrayContaining(['USUARIO', 'ADMIN']));
    });
  });

  describe('2. Vigencia inmutable de los 17 Endpoints del Grupo B (0 cambios en backend)', () => {
    const endpointsGrupoB: Array<{ method: string; path: string; desc: string }> = [
      // 12 endpoints Marketplace / OMS / Portfolio / Auditoría (Feature 012)
      { method: 'get', path: '/players/ranking', desc: 'Ranking de cotizaciones' },
      { method: 'get', path: '/players/{id}/quotes', desc: 'Historial de cotizaciones' },
      { method: 'get', path: '/quotes/strategy', desc: 'Consulta estrategia activa' },
      { method: 'put', path: '/quotes/strategy', desc: 'Conmutación de estrategia ADMIN' },
      { method: 'post', path: '/quotes/recalculate', desc: 'Recálculo manual masivo ADMIN' },
      { method: 'get', path: '/orders', desc: 'Libro de órdenes secundarias' },
      { method: 'post', path: '/orders/buy', desc: 'Compra primaria o secundaria' },
      { method: 'post', path: '/orders/sell', desc: 'Publicación orden de venta secundaria' },
      { method: 'delete', path: '/orders/{id}', desc: 'Cancelación de orden de venta' },
      { method: 'get', path: '/users/{id}/portfolio', desc: 'Portfolio consolidado valorizado' },
      { method: 'get', path: '/users/{id}/transactions', desc: 'Historial transacciones de usuario' },
      { method: 'get', path: '/admin/transactions', desc: 'Auditoría global de transacciones ADMIN' },

      // 5 endpoints complementarios Catálogo / Sesión / Scraping
      { method: 'post', path: '/auth/logout', desc: 'Cierre de sesión de usuario' },
      { method: 'get', path: '/players', desc: 'Catálogo paginado de jugadores' },
      { method: 'get', path: '/players/filters', desc: 'Filtros disponibles del catálogo' },
      { method: 'get', path: '/players/{id}', desc: 'Ficha individual de jugador' },
      { method: 'get', path: '/scraping/jugadores/{id}/estadisticas', desc: 'Estadísticas WhoScored' },
    ];

    it.each(endpointsGrupoB)(
      'debe mantener vigente sin cambios de API: $method.toUpperCase() $path ($desc)',
      ({ method, path: epPath }) => {
        expect(swaggerDoc.paths).toHaveProperty(epPath);
        const pathItem = (swaggerDoc.paths as Record<string, any>)[epPath];
        expect(pathItem).toHaveProperty(method.toLowerCase());
      },
    );
  });

  describe('3. Paridad Postman collection.json ↔ Swagger vivo (Cobertura 100% y pm.test)', () => {
    it('debe cubrir los 20 endpoints auditados (3 Grupo A + 17 Grupo B) dentro de postman/collection.json', () => {
      const endpointsRequeridos = [
        { method: 'POST', path: '/auth/register' },
        { method: 'POST', path: '/auth/login' },
        { method: 'GET', path: '/auth/me' },
        { method: 'POST', path: '/auth/logout' },
        { method: 'GET', path: '/players' },
        { method: 'GET', path: '/players/filters' },
        { method: 'GET', path: '/players/ranking' },
        { method: 'GET', path: '/players/{id}' },
        { method: 'GET', path: '/players/{id}/quotes' },
        { method: 'GET', path: '/quotes/strategy' },
        { method: 'PUT', path: '/quotes/strategy' },
        { method: 'POST', path: '/quotes/recalculate' },
        { method: 'POST', path: '/orders/buy' },
        { method: 'POST', path: '/orders/sell' },
        { method: 'GET', path: '/orders' },
        { method: 'DELETE', path: '/orders/{id}' },
        { method: 'GET', path: '/users/{id}/portfolio' },
        { method: 'GET', path: '/users/{id}/transactions' },
        { method: 'GET', path: '/admin/transactions' },
        { method: 'GET', path: '/scraping/jugadores/{id}/estadisticas' },
      ];

      for (const req of endpointsRequeridos) {
        const coincidencia = postmanRequests.find(
          (p) => p.method === req.method && p.normalizedPath === req.path,
        );
        expect(coincidencia).toBeDefined();
      }
    });

    it('cada request de postman/collection.json debe mapear a una ruta real existente en Swagger', () => {
      for (const req of postmanRequests) {
        const pathItem = (swaggerDoc.paths as Record<string, any>)[req.normalizedPath];
        expect(pathItem).toBeDefined();

        const operacion = pathItem[req.method.toLowerCase()];
        expect(operacion).toBeDefined();
      }
    });

    it('cada request de la colección debe tener scripts de aserción pm.test(...)', () => {
      for (const req of postmanRequests) {
        const codigoScript = req.testScriptLines.join('\n');
        expect(codigoScript).toContain('pm.test');
      }
    });

    it('la carpeta 1. Auth debe validar explícitamente rol, saldo, Bearer y el envoltorio de error estándar', () => {
      const requestsAuth = postmanRequests.filter((r) => r.folder === '1. Auth');
      expect(requestsAuth.length).toBeGreaterThanOrEqual(8);

      const nombresAuth = requestsAuth.map((r) => r.name);
      expect(nombresAuth).toContain('POST Register (trader1)');
      expect(nombresAuth).toContain('POST Register inválido (-> 400)');
      expect(nombresAuth).toContain('POST Register correo duplicado (-> 409)');
      expect(nombresAuth).toContain('POST Login ADMIN');
      expect(nombresAuth).toContain('POST Login trader1');
      expect(nombresAuth).toContain('POST Login credenciales inválidas (-> 401)');
      expect(nombresAuth).toContain('GET Perfil Autenticado (trader1)');
      expect(nombresAuth).toContain('GET Perfil sin token (-> 401)');
      expect(nombresAuth).toContain('POST Logout (trader1)');
      expect(nombresAuth).toContain('POST Logout sin token (-> 401)');

      // Valida aserciones sobre rol y saldo
      const scriptLoginTrader = requestsAuth
        .find((r) => r.name === 'POST Login trader1')
        ?.testScriptLines.join('\n');
      expect(scriptLoginTrader).toContain('USUARIO');
      expect(scriptLoginTrader).toContain('saldo');

      const scriptLoginAdmin = requestsAuth
        .find((r) => r.name === 'POST Login ADMIN')
        ?.testScriptLines.join('\n');
      expect(scriptLoginAdmin).toContain('ADMIN');
      expect(scriptLoginAdmin).toContain('saldo');

      // Valida aserciones sobre el envoltorio de error en 400, 401 y 409
      const scriptError400 = requestsAuth
        .find((r) => r.name === 'POST Register inválido (-> 400)')
        ?.testScriptLines.join('\n');
      expect(scriptError400).toContain('codigoEstado');
      expect(scriptError400).toContain('mensaje');
      expect(scriptError400).toContain('marcaDeTiempo');

      const scriptError401 = requestsAuth
        .find((r) => r.name === 'POST Login credenciales inválidas (-> 401)')
        ?.testScriptLines.join('\n');
      expect(scriptError401).toContain('codigoEstado');

      const scriptError409 = requestsAuth
        .find((r) => r.name === 'POST Register correo duplicado (-> 409)')
        ?.testScriptLines.join('\n');
      expect(scriptError409).toContain('codigoEstado');
    });

    it('los payloads de requests exitosos deben usar propiedades permitidas por Swagger', () => {
      const schemas = (swaggerDoc.components?.schemas || {}) as Record<string, any>;

      // POST /auth/register
      const reqRegister = postmanRequests.find((r) => r.name === 'POST Register (trader1)');
      expect(reqRegister?.bodyKeys.sort()).toEqual(['contrasena', 'correo', 'nombre'].sort());
      const registroSchemaProps = schemas.RegistroUsuarioDto?.properties || {};
      for (const k of reqRegister?.bodyKeys || []) {
        expect(registroSchemaProps).toHaveProperty(k);
      }

      // POST /auth/login
      const reqLogin = postmanRequests.find((r) => r.name === 'POST Login trader1');
      expect(reqLogin?.bodyKeys.sort()).toEqual(['contrasena', 'correo'].sort());
      const loginSchemaProps = schemas.LoginUsuarioDto?.properties || {};
      for (const k of reqLogin?.bodyKeys || []) {
        expect(loginSchemaProps).toHaveProperty(k);
      }

      // PUT /quotes/strategy
      const reqStrategy = postmanRequests.find(
        (r) => r.name === 'PUT Cambiar Estrategia (ADMIN) -> POSICIONAL',
      );
      expect(reqStrategy?.bodyKeys).toEqual(['estrategiaId']);
      const strategySchemaProps =
        schemas.CambiarEstrategiaDto?.properties ||
        schemas.ActualizarEstrategiaDto?.properties ||
        {};
      expect(strategySchemaProps).toHaveProperty('estrategiaId');

      // POST /orders/buy (primario)
      const reqBuyPrimario = postmanRequests.find(
        (r) => r.name === 'POST Comprar Tokens (Primario)',
      );
      const buySchemaProps = schemas.CrearOrdenCompraDto?.properties || {};
      for (const k of reqBuyPrimario?.bodyKeys || []) {
        expect(buySchemaProps).toHaveProperty(k);
      }

      // POST /orders/sell (secundario)
      const reqSell = postmanRequests.find(
        (r) => r.name === 'POST Publicar Orden de Venta',
      );
      const sellSchemaProps = schemas.CrearOrdenVentaDto?.properties || {};
      for (const k of reqSell?.bodyKeys || []) {
        expect(sellSchemaProps).toHaveProperty(k);
      }
    });
  });
});
