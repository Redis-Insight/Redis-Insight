import {
  DynamicModule,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RejsonRlController } from 'src/modules/browser/rejson-rl/rejson-rl.controller';
import { RejsonRlService } from 'src/modules/browser/rejson-rl/rejson-rl.service';

@Module({})
export class RejsonRlModule {
  static register({ route }): DynamicModule {
    return {
      module: RejsonRlModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: RejsonRlModule,
        }]),
      ],
      controllers: [RejsonRlController],
      providers: [RejsonRlService],
    };
  }
}
