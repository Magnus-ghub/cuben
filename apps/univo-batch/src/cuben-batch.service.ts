import { Injectable } from '@nestjs/common';

@Injectable()
export class CubenBatchService {
  getHello(): string {
    return 'Welcome to Cuben-batch Server!';
  }
}
