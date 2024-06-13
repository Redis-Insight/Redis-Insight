import {
  DynamicModule,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { SetService } from 'src/modules/browser/set/set.service';
import { SetController } from 'src/modules/browser/set/set.controller';

@Module({})
export class SetModule {
  static register({ route }): DynamicModule {
    return {
      module: SetModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: SetModule,
        }]),
      ],
      controllers: [SetController],
      providers: [SetService],
    };
  }
}
