import {
  DynamicModule,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { HashService } from 'src/modules/browser/hash/hash.service';
import { HashController } from 'src/modules/browser/hash/hash.controller';

@Module({})
export class HashModule {
  static register({ route }): DynamicModule {
    return {
      module: HashModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: HashModule,
        }]),
      ],
      controllers: [HashController],
      providers: [HashService],
    };
  }
}
