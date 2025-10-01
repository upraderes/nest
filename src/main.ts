import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 NEST Namespace Execution and Status Tool is running on: http://localhost:${port}`);
  logger.log(`📊 Dashboard available at: http://localhost:${port}/dashboard`);
}

bootstrap();