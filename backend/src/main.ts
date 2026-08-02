import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta propiedades no declaradas en el DTO en vez de dejarlas pasar.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.useGlobalFilters(
    new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  const swagger = new DocumentBuilder()
    .setTitle('IAOINK API')
    .setDescription('API de finanzas personales de IAOINK')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  console.log(`IAOINK API escuchando en http://localhost:${port}/api`);
  console.log(`Documentación en http://localhost:${port}/api/docs`);
}

void bootstrap();
