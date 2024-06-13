import { HashController } from 'src/modules/browser/hash/hash.controller';
import { KeysController } from 'src/modules/browser/keys/keys.controller';
import { ListController } from 'src/modules/browser/list/list.controller';
import { RejsonRlController } from 'src/modules/browser/rejson-rl/rejson-rl.controller';
import { SetController } from 'src/modules/browser/set/set.controller';
import { StreamController } from 'src/modules/browser/stream/controllers/stream.controller';
import { ConsumerGroupController } from 'src/modules/browser/stream/controllers/consumer-group.controller';
import { ConsumerController } from 'src/modules/browser/stream/controllers/consumer.controller';
import { StringController } from 'src/modules/browser/string/string.controller';
import { ZSetController } from 'src/modules/browser/z-set/z-set.controller';
import { CliController } from 'src/modules/cli/controllers/cli.controller';
import { WorkbenchController } from 'src/modules/workbench/workbench.controller';

export const redisConnectionControllers = [
  HashController,
  KeysController,
  ListController,
  RejsonRlController,
  SetController,
  StreamController,
  ConsumerGroupController,
  ConsumerController,
  StringController,
  ZSetController,
  CliController,
  WorkbenchController,
];
