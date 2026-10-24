import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard, CurrentUser } from '../auth/access.guard.js';
import { LocationDto, HistoryPaginationDto } from '../../common/location.js';
import { SearchHistoryService } from './search-history.service.js';
@ApiTags('Search history')
@ApiCookieAuth()
@UseGuards(AccessGuard)
@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly history: SearchHistoryService) {}
  @Get() async list(
    @CurrentUser() user: string,
    @Query() query: HistoryPaginationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.history.list(user, query);
    res.locals.pagination = result.pagination;
    return result.rows;
  }
  @Post() @HttpCode(200) record(
    @CurrentUser() user: string,
    @Body() dto: LocationDto,
  ) {
    return this.history.record(user, dto);
  }
  @Delete(':id') @HttpCode(204) remove(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.history.remove(user, id);
  }
  @Delete() @HttpCode(204) clear(@CurrentUser() user: string) {
    return this.history.remove(user);
  }
}
