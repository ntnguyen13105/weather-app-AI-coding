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
        meta: {
          requestId: response.locals.requestId,
          ...(response.locals.pagination
            ? { pagination: response.locals.pagination }
            : {}),
        },
      })),
    );
  }
}

@Catch()
class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const prismaCode =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
    const parserType =
      error && typeof error === 'object' && 'type' in error
        ? String(error.type)
        : '';
    const dbUnavailable =
      [
        'P1001',
        'P1002',
        'P1008',
        'P1017',
        'P2024',
        'P2037',
        'ECONNREFUSED',
      ].includes(prismaCode) ||
      (error instanceof Error &&
        error.name === 'PrismaClientInitializationError');
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : parserType === 'entity.too.large'
          ? 413
          : parserType === 'entity.parse.failed'
            ? 400
            : dbUnavailable
              ? 503
              : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'AUTH_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      429: 'RATE_LIMITED',
      503: 'DATABASE_UNAVAILABLE',
    };
    const messages: Record<number, string> = {
      400: 'Dữ liệu không hợp lệ.',
      401: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      403: 'Yêu cầu không được phép.',
      404: 'Không tìm thấy tài nguyên.',
      409: 'Dữ liệu bị trùng hoặc đã đạt giới hạn.',
      413: 'Nội dung yêu cầu quá lớn.',
      415: 'Yêu cầu cần sử dụng JSON.',
      429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      502: 'Nguồn thời tiết trả dữ liệu không hợp lệ.',
      503: 'Dịch vụ dữ liệu tạm thời không khả dụng.',
      504: 'Nguồn thời tiết chưa phản hồi kịp thời.',
    };
    const code =
      typeof body === 'object' &&
      body &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : (codes[status] ?? 'INTERNAL_ERROR');
    if (
      typeof body === 'object' &&
      body &&
      'retryAfter' in body &&
      typeof body.retryAfter === 'number'
    )
      response.setHeader('Retry-After', body.retryAfter);
    const fields =
      typeof body === 'object' && body && 'fields' in body
        ? body.fields
        : undefined;
    response.status(status).json({
      error: {
        code,
        message: messages[status] ?? 'Có lỗi hệ thống. Vui lòng thử lại sau.',
        ...(status === 400 && fields ? { fields } : {}),
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
