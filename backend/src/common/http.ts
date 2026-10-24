import { randomUUID } from 'node:crypto';
import {
  Catch,
  HttpException,
  Injectable,
  type ArgumentsHost,
  type CallHandler,
  type ExceptionFilter,
  type ExecutionContext,
  type INestApplication,
  type NestInterceptor,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { map } from 'rxjs';

@Injectable()
class ResponseEnvelope implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: unknown) => ({
        data,
        meta: { requestId: response.locals.requestId },
      })),
    );
  }
}

@Catch()
class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      404: 'NOT_FOUND',
      503: 'DATABASE_UNAVAILABLE',
    };
    const messages: Record<number, string> = {
      400: 'Dữ liệu không hợp lệ.',
      404: 'Không tìm thấy tài nguyên.',
      503: 'Dịch vụ dữ liệu tạm thời không khả dụng.',
    };
    const code =
      typeof body === 'object' &&
      body &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : (codes[status] ?? 'INTERNAL_ERROR');
    response.status(status).json({
      error: {
        code,
        message: messages[status] ?? 'Có lỗi hệ thống. Vui lòng thử lại sau.',
      },
      meta: { requestId: response.locals.requestId },
    });
  }
}

export function configureHttp(app: INestApplication) {
  app.use((_request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalInterceptors(new ResponseEnvelope());
  app.useGlobalFilters(new ApiExceptionFilter());
}
