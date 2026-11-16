import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { FootballDataHealthIndicator } from './indicators/football-data-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, FootballDataHealthIndicator],
  exports: [RedisHealthIndicator, FootballDataHealthIndicator],
})
export class HealthModule {}
