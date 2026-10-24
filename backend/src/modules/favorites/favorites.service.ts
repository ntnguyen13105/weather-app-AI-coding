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
import type { Favorite } from '../../generated/prisma/client.js';
const present = (row: Favorite) => ({
  id: row.id,
  location: publicLocation(row),
  createdAt: row.createdAt,
});
@Injectable()
export class FavoritesService {
  constructor(
    private readonly db: PrismaService,
    private readonly sessions: SessionService,
  ) {}
  async list(userId: string, query: PaginationDto) {
    const [rows, count] = await this.db.$transaction(
      [
        this.db.favorite.findMany({
          where: { userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.favorite.count({ where: { userId } }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { rows: rows.map(present), pagination: pagination(query, count) };
  }
  async add(userId: string, dto: LocationDto) {
    const data = locationData(dto);
    return this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, userId);
      if (
        await tx.favorite.findUnique({
          where: {
            userId_locationKey: { userId, locationKey: data.locationKey },
          },
        })
      )
        fail(409, 'FAVORITE_EXISTS');
      if ((await tx.favorite.count({ where: { userId } })) >= 50)
        fail(409, 'FAVORITE_LIMIT_REACHED');
      return present(await tx.favorite.create({ data: { ...data, userId } }));
    });
  }
  async remove(userId: string, id: string) {
    await this.db.$transaction(async (tx) => {
      await this.sessions.lock(tx, userId);
      if (!(await tx.favorite.deleteMany({ where: { id, userId } })).count)
        fail(404, 'NOT_FOUND');
    });
  }
}
