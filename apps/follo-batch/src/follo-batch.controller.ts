import { Controller, Get } from '@nestjs/common';
import { FolloBatchService } from './follo-batch.service';

@Controller()
export class FolloBatchController {
  constructor(private readonly folloBatchService: FolloBatchService) {}

  @Get()
  getHello(): string {
    return this.folloBatchService.getHello();
  }
}
