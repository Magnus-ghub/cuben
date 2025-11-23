import { NestFactory } from '@nestjs/core';
import { FolloBatchModule } from './follo-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(FolloBatchModule);
  await app.listen(process.env.PORT_BATCH ?? 3000);
}
bootstrap();
