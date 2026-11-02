import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PlayersModule } from '../players/players.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { ConfiguracionMercadoOrmEntity } from '../data-access/configuracion-mercado.orm-entity';
import { ConfiguracionMercadoTypeOrmRepository } from '../data-access/configuracion-mercado.typeorm-repository';
import { CONFIGURACION_MERCADO_REPOSITORY } from '../domain/configuracion-mercado.repository.interface';
import { BalanceTokenOrmEntity } from '../data-access/balance-token.orm-entity';
import { BalanceTokenTypeOrmRepository } from '../data-access/balance-token.typeorm-repository';
import { BALANCE_TOKEN_REPOSITORY } from '../domain/balance-token.repository.interface';
import { CotizacionOrmEntity } from '../data-access/cotizacion.orm-entity';
import { CotizacionTypeOrmRepository } from '../data-access/cotizacion.typeorm-repository';
import { COTIZACION_REPOSITORY } from '../domain/cotizacion.repository.interface';
import { MarketplaceCacheService } from '../services/marketplace-cache.service';
import { TokensService } from '../services/tokens.service';
import { AdminBootstrapService } from '../services/admin-bootstrap.service';
import { QuotesService } from '../services/quotes.service';
import { QuotesSchedulerService } from '../services/scheduler/quotes-scheduler.service';
import { QuotesController } from '../controllers/quotes.controller';

import { OrdenOrmEntity } from '../data-access/orden.orm-entity';
import { OrdenTypeOrmRepository } from '../data-access/orden.typeorm-repository';
import { ORDEN_REPOSITORY } from '../domain/orden.repository.interface';
import { TransaccionOrmEntity } from '../data-access/transaccion.orm-entity';
import { TransaccionTypeOrmRepository } from '../data-access/transaccion.typeorm-repository';
import { TRANSACCION_REPOSITORY } from '../domain/transaccion.repository.interface';
import { OmsService } from '../services/oms.service';
import { OrdersController } from '../controllers/orders.controller';
import { UsersController } from '../controllers/users.controller';
import { AdminTransactionsController } from '../controllers/admin-transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfiguracionMercadoOrmEntity,
      BalanceTokenOrmEntity,
      CotizacionOrmEntity,
      OrdenOrmEntity,
      TransaccionOrmEntity,
    ]),
    AuthModule,
    forwardRef(() => PlayersModule),
    ScrapingModule,
  ],
  providers: [
    {
      provide: CONFIGURACION_MERCADO_REPOSITORY,
      useClass: ConfiguracionMercadoTypeOrmRepository,
    },
    {
      provide: BALANCE_TOKEN_REPOSITORY,
      useClass: BalanceTokenTypeOrmRepository,
    },
    {
      provide: COTIZACION_REPOSITORY,
      useClass: CotizacionTypeOrmRepository,
    },
    {
      provide: ORDEN_REPOSITORY,
      useClass: OrdenTypeOrmRepository,
    },
    {
      provide: TRANSACCION_REPOSITORY,
      useClass: TransaccionTypeOrmRepository,
    },
    MarketplaceCacheService,
    TokensService,
    AdminBootstrapService,
    QuotesService,
    QuotesSchedulerService,
    OmsService,
  ],
  controllers: [
    QuotesController,
    OrdersController,
    UsersController,
    AdminTransactionsController,
  ],
  exports: [
    CONFIGURACION_MERCADO_REPOSITORY,
    BALANCE_TOKEN_REPOSITORY,
    COTIZACION_REPOSITORY,
    ORDEN_REPOSITORY,
    TRANSACCION_REPOSITORY,
    MarketplaceCacheService,
    TokensService,
    QuotesService,
    QuotesSchedulerService,
    OmsService,
  ],
})
export class MarketplaceModule {}

