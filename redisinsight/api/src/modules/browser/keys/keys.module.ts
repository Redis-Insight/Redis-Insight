import {
  DynamicModule,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { KeysController } from 'src/modules/browser/keys/keys.controller';
import { StandaloneScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/standalone.scanner.strategy';
import { ClusterScannerStrategy } from 'src/modules/browser/keys/scanner/strategies/cluster.scanner.strategy';
import { Scanner } from 'src/modules/browser/keys/scanner/scanner';
import { KeysService } from 'src/modules/browser/keys/keys.service';
import { KeyInfoProvider } from 'src/modules/browser/keys/key-info/key-info.provider';
import { GraphKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/graph.key-info.strategy';
import { HashKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/hash.key-info.strategy';
import { ListKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/list.key-info.strategy';
import { RejsonRlKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/rejson-rl.key-info.strategy';
import { SetKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/set.key-info.strategy';
import { StreamKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/stream.key-info.strategy';
import { StringKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/string.key-info.strategy';
import { TsKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/ts.key-info.strategy';
import {
  UnsupportedKeyInfoStrategy,
} from 'src/modules/browser/keys/key-info/strategies/unsupported.key-info.strategy';
import { ZSetKeyInfoStrategy } from 'src/modules/browser/keys/key-info/strategies/z-set.key-info.strategy';

@Module({})
export class KeysModule {
  static register({ route }): DynamicModule {
    return {
      module: KeysModule,
      imports: [
        RouterModule.register([{
          path: route,
          module: KeysModule,
        }]),
      ],
      controllers: [KeysController],
      providers: [
        Scanner,
        StandaloneScannerStrategy,
        ClusterScannerStrategy,
        KeysService,
        KeyInfoProvider,
        // scanner strategies
        StandaloneScannerStrategy,
        ClusterScannerStrategy,
        // key info strategies
        GraphKeyInfoStrategy,
        HashKeyInfoStrategy,
        ListKeyInfoStrategy,
        RejsonRlKeyInfoStrategy,
        SetKeyInfoStrategy,
        StreamKeyInfoStrategy,
        StringKeyInfoStrategy,
        TsKeyInfoStrategy,
        UnsupportedKeyInfoStrategy,
        ZSetKeyInfoStrategy,
      ],
    };
  }
}
