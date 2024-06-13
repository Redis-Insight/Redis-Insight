import { DynamicModule, Module, Type } from '@nestjs/common';
import { ListModule } from 'src/modules/browser/list/list.module';
import { HashModule } from 'src/modules/browser/hash/hash.module';
import { ZSetModule } from 'src/modules/browser/z-set/z-set.module';
import { StringModule } from 'src/modules/browser/string/string.module';
import { SetModule } from 'src/modules/browser/set/set.module';
import { BrowserHistoryModule } from 'src/modules/browser/browser-history/browser-history.module';
import { RejsonRlModule } from 'src/modules/browser/rejson-rl/rejson-rl.module';
import { StreamModule } from 'src/modules/browser/stream/stream.module';
import { RedisearchModule } from 'src/modules/browser/redisearch/redisearch.module';
import { KeysModule } from 'src/modules/browser/keys/keys.module';
import { BrowserHistoryRepository } from './browser-history/repositories/browser-history.repository';
import { LocalBrowserHistoryRepository } from './browser-history/repositories/local.browser-history.repository';

const route = '/databases/:dbInstance';

@Module({})
export class BrowserModule {
  static register(
    browserHistoryRepository: Type<BrowserHistoryRepository> = LocalBrowserHistoryRepository,
  ): DynamicModule {
    return {
      module: BrowserModule,
      imports: [
        ListModule.register({ route }),
        HashModule.register({ route }),
        ZSetModule.register({ route }),
        StringModule.register({ route }),
        SetModule.register({ route }),
        BrowserHistoryModule.register({ route }, browserHistoryRepository),
        StreamModule.register({ route }),
        RejsonRlModule.register({ route }),
        RedisearchModule.register({ route }),
        KeysModule.register({ route }),
      ],
      exports: [BrowserHistoryModule],
    };
  }
}
