import {
  DynamicModule,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ListService } from 'src/modules/browser/list/list.service';
import { ListController } from 'src/modules/browser/list/list.controller';

@Module({})
export class ListModule {
  static register({ route }): DynamicModule {
    return {
      module: ListModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: ListModule,
        }]),
      ],
      controllers: [ListController],
      providers: [ListService],
    };
  }
}
