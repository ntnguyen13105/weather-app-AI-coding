import { Injectable } from '@nestjs/common';
import { coordinates } from '../../common/location.js';
import { OpenWeatherService } from './openweather.service.js';
import { mapCurrent, mapForecast, mapSearch } from './weather.mapper.js';
import type { CoordinatesDto, SearchDto } from './weather.dto.js';
@Injectable()
export class WeatherService {
  constructor(private readonly provider: OpenWeatherService) {}
  async search(dto: SearchDto) {
    const result = await this.provider.get(
      '/geo/1.0/direct',
      { q: dto.country ? `${dto.q},${dto.country}` : dto.q, limit: '5' },
      mapSearch,
      86400000,
    );
    return dto.country
      ? result.data.filter((place) => place.country === dto.country)
      : result.data;
  }
  private params(dto: CoordinatesDto) {
    const coords = coordinates(dto.lat, dto.lon);
    return {
      lat: String(coords.latitude),
      lon: String(coords.longitude),
      units: 'metric',
      lang: 'vi',
    };
  }
  async current(dto: CoordinatesDto) {
    const { data, cached } = await this.provider.get(
      '/data/2.5/weather',
      this.params(dto),
      mapCurrent,
      600000,
    );
    return { ...data, source: { ...data.source, cached } };
  }
  async forecast(dto: CoordinatesDto) {
    const { data, cached } = await this.provider.get(
      '/data/2.5/forecast',
      this.params(dto),
      mapForecast,
      600000,
    );
    return { ...data, source: { ...data.source, cached } };
  }
  alerts() {
    return {
      status: 'UNSUPPORTED',
      reason: 'FREE_PLAN',
      message: 'Gói dữ liệu hiện tại chưa hỗ trợ cảnh báo thời tiết.',
      alerts: [],
    };
  }
}
