import { Test, TestingModule } from '@nestjs/testing';
import { FolloBatchController } from './follo-batch.controller';
import { FolloBatchService } from './follo-batch.service';

describe('FolloBatchController', () => {
  let folloBatchController: FolloBatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FolloBatchController],
      providers: [FolloBatchService],
    }).compile();

    folloBatchController = app.get<FolloBatchController>(FolloBatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(folloBatchController.getHello()).toBe('Hello World!');
    });
  });
});
