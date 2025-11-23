import { Injectable } from '@nestjs/common';

@Injectable()
export class FolloBatchService {
  getHello(): string {
    return 'Hello World!';
  }
}
