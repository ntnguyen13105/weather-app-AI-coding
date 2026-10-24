import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { configureHttp } from './common/http.js';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  configureHttp(app);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  if (app.get(ConfigService).get<string>('NODE_ENV') === 'development') {
    const options = new DocumentBuilder()
      .setTitle('Weather App API')
      .setDescription(
        'Giai đoạn 3: chỉ có health endpoints. Chưa có nghiệp vụ thời tiết/tài khoản.',
      )
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, options),
      { jsonDocumentUrl: 'api/docs-json' },
    );
  }
}
