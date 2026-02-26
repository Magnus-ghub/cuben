import { Controller, Get } from '@nestjs/common';
import { CubenBatchService } from './cuben-batch.service';

@Controller()
export class CubenBatchController {
  constructor(private readonly cubenBatchService: CubenBatchService) {}

  @Get()
  getHello(): string {
    return this.cubenBatchService.getHello();
  }
}
