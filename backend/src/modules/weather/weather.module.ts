import { Module } from '@nestjs/common';
import { OpenWeatherService, WEATHER_FETCH } from './openweather.service.js';
import { WeatherService } from './weather.service.js';
import { WeatherController } from './weather.controller.js';
@Module({
  controllers: [WeatherController],
  providers: [
    OpenWeatherService,
    WeatherService,
    { provide: WEATHER_FETCH, useValue: fetch },
  ],
})
export class WeatherModule {}
