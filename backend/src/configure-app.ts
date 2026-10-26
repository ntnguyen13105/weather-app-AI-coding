import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { configureHttp } from './common/http.js';
import { describeResponses } from './common/openapi.js';

export function configureApp(app: INestApplication) {
  const proxy = app.get(ConfigService).get<string>('TRUST_PROXY_IP');
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', proxy ? [proxy] : false);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  configureHttp(app);
  app.use(json({ limit: '16kb', strict: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          fields: errors.map((error) => ({
            field: error.property,
            message: 'Trường không hợp lệ hoặc không được phép.',
          })),
        }),
    }),
  );
  if (app.get(ConfigService).get<string>('NODE_ENV') === 'development') {
    const options = new DocumentBuilder()
      .setTitle('Weather App API')
      .setDescription(
        'Weather App REST API. Mọi mutation yêu cầu Origin và X-CSRF-Token; cookie HttpOnly. Xem docs/api-contract.md cho ví dụ và giới hạn.',
      )
      .setVersion('0.1.0')
      .addCookieAuth('wa-access')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      describeResponses(SwaggerModule.createDocument(app, options)),
      { jsonDocumentUrl: 'api/docs-json' },
    );
  }
}
