import { DynamicModule, Global, Type } from '@nestjs/common';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';
import { LocalConstantsProvider } from 'src/modules/constants/providers/local.constants.provider';

@Global()
export class ConstantsModule {
  static register(provider: Type<ConstantsProvider> = LocalConstantsProvider): DynamicModule {
    return {
      module: ConstantsModule,
      providers: [
        {
          provide: ConstantsProvider,
          useClass: provider,
        },
      ],
      exports: [
        ConstantsProvider,
      ],
    };
  }
}
