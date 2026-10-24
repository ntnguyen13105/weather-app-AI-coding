import { HttpException } from '@nestjs/common';
export function fail(status: number, code: string): never {
  throw new HttpException({ code }, status);
}
