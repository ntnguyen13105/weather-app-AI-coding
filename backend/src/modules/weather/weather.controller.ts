import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoordinatesDto, SearchDto, EmptyQueryDto } from './weather.dto.js';
import { WeatherService } from './weather.service.js';
@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}
  @Get('search')
  @ApiOperation({ summary: 'Tìm tối đa 5 địa điểm bằng OpenWeather Geocoding' })
  search(@Query() dto: SearchDto) {
    return this.weather.search(dto);
  }
  @Get('current')
  @ApiOperation({ summary: 'Thời tiết hiện tại, đơn vị metric' })
  current(@Query() dto: CoordinatesDto) {
    return this.weather.current(dto);
  }
  @Get('forecast')
  @ApiOperation({ summary: 'Dự báo 5 ngày theo mốc 3 giờ có thật' })
  forecast(@Query() dto: CoordinatesDto) {
    return this.weather.forecast(dto);
  }
  @Get('alerts')
  @ApiOperation({ summary: 'Gói Free: UNSUPPORTED; không gọi One Call' })
  alerts(@Query() _dto: EmptyQueryDto) {
    void _dto;
    return this.weather.alerts();
  }
}
