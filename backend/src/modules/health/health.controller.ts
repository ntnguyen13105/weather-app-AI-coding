import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';

const healthSchema = (status: string) => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: {
    data: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: [status] } },
    },
    meta: {
      type: 'object',
      required: ['requestId'],
      properties: { requestId: { type: 'string', format: 'uuid' } },
    },
  },
});

@ApiTags('Kiểm tra hệ thống')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOkResponse({
    description: 'Tiến trình API đang hoạt động',
    schema: healthSchema('ok'),
  })
  live() {
    return this.health.live();
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Kết nối PostgreSQL hoạt động',
    schema: healthSchema('ready'),
  })
  @ApiServiceUnavailableResponse({
    description: 'DATABASE_UNAVAILABLE: không kết nối được PostgreSQL',
  })
  ready() {
    return this.health.ready();
  }
}
