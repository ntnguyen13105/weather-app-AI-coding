import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionService } from '../auth/session.service.js';
import { fail } from '../../common/api-error.js';
import {
  locationData,
  publicLocation,
  pagination,
  type LocationDto,
  type PaginationDto,
} from '../../common/location.js';
import type { SearchHistory } from '../../generated/prisma/client.js';
const present = (row: SearchHistory) => ({
  id: row.id,
  location: publicLocation(row),
  searchedAt: row.searchedAt,
});
@Injectable()
export class SearchHistoryService {
  constructor(
    private readonly db: PrismaService,
    private readonly sessions: SessionService,
  ) {}
  async list(userId: string, query: PaginationDto) {
    const [rows, count] = await this.db.$transaction(
      [
        this.db.searchHistory.findMany({
          where: { userId },
          orderBy: [{ searchedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.searchHistory.count({ where: { userId } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { rows: rows.map(present), pagination: pagination(query, count) };
  }
  async record(userId: string, dto: LocationDto) {
    const data = locationData(dto);
    return this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, userId);
      const row = await tx.searchHistory.upsert({
        where: {
          userId_locationKey: { userId, locationKey: data.locationKey },
        },
        create: { ...data, userId },
        update: { ...data, searchedAt: new Date() },
      });
      const old = await tx.searchHistory.findMany({
        where: { userId },
        orderBy: [{ searchedAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        select: { id: true },
      });
      if (old.length)
        await tx.searchHistory.deleteMany({
          where: { userId, id: { in: old.map((item) => item.id) } },
        });
      return present(row);
    });
  }
  async remove(userId: string, id?: string) {
    await this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, userId);
      const deleted = await tx.searchHistory.deleteMany({
        where: { userId, ...(id ? { id } : {}) },
      });
      if (id && !deleted.count) fail(404, 'NOT_FOUND');
    });
  }
}
