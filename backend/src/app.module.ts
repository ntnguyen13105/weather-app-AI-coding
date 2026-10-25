import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { SearchHistoryModule } from './modules/search-history/search-history.module.js';
import { WeatherModule } from './modules/weather/weather.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(import.meta.dirname, '../../.env'),
      validate: validateEnvironment,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    FavoritesModule,
    SearchHistoryModule,
    WeatherModule,
  ],
})
export class AppModule {}
