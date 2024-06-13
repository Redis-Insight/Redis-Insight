import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { BrowserHistoryService } from 'src/modules/browser/browser-history/browser-history.service';
import { BrowserHistoryController } from 'src/modules/browser/browser-history/browser-history.controller';
import { BrowserHistoryRepository } from './repositories/browser-history.repository';

@Global()
@Module({})
export class BrowserHistoryModule {
  static register({ route }, browserHistoryRepository: Type<BrowserHistoryRepository>): DynamicModule {
    return {
      module: BrowserHistoryModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: BrowserHistoryModule,
        }]),
      ],
      controllers: [BrowserHistoryController],
      providers: [
        BrowserHistoryService,
        {
          provide: BrowserHistoryRepository,
          useClass: browserHistoryRepository,
        },
      ],
      exports: [BrowserHistoryService],
    };
  }
}
