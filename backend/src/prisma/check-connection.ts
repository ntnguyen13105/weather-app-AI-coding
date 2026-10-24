import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PrismaService } from './prisma.service.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});
try {
  const prisma = app.get(PrismaService);
  await prisma.$queryRaw`SELECT 1`;
  console.log('Kết nối PostgreSQL qua Prisma thành công (SELECT 1).');
} catch {
  console.error(
    'Không kết nối được PostgreSQL. Kiểm tra server và DATABASE_URL; không gửi secret vào log.',
  );
  process.exitCode = 1;
} finally {
  await app.close();
}
