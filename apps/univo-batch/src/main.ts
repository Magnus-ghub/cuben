import { NestFactory } from '@nestjs/core';
import { CubenBatchModule } from './cuben-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(CubenBatchModule);
  await app.listen(process.env.PORT_BATCH ?? 3000);
}
bootstrap();
