import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SearchHistoryController } from './search-history.controller.js';
import { SearchHistoryService } from './search-history.service.js';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService],
})
export class SearchHistoryModule {}
