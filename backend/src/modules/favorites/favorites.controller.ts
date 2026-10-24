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
import { LocationDto, PaginationDto } from '../../common/location.js';
import { FavoritesService } from './favorites.service.js';
@ApiTags('Favorites')
@ApiCookieAuth()
@UseGuards(AccessGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}
  @Get() async list(
    @CurrentUser() user: string,
    @Query() query: PaginationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.favorites.list(user, query);
    res.locals.pagination = result.pagination;
    return result.rows;
  }
  @Post() add(@CurrentUser() user: string, @Body() dto: LocationDto) {
    return this.favorites.add(user, dto);
  }
  @Delete(':id') @HttpCode(204) remove(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.favorites.remove(user, id);
  }
}
