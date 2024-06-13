import { Module } from '@nestjs/common';
import { CommandsModule } from 'src/modules/commands/commands.module';
import { CommandsService } from 'src/modules/commands/commands.service';
import { CommandsJsonProvider } from 'src/modules/commands/commands-json.provider';
import config from 'src/utils/config';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';
import { DatabaseAnalytics } from 'src/modules/database/database.analytics';
import { CliController } from './controllers/cli.controller';
import { CliBusinessService } from './services/cli-business/cli-business.service';
import { CliAnalyticsService } from './services/cli-analytics/cli-analytics.service';

const COMMANDS_CONFIGS = config.get('commands');

@Module({
  imports: [CommandsModule],
  controllers: [CliController],
  providers: [
    CliBusinessService,
    CliAnalyticsService,
    {
      provide: CommandsService,
      useFactory: () => new CommandsService(
        COMMANDS_CONFIGS.map(({ name, url }) => new CommandsJsonProvider(name, url)),
      ),
    },
    DatabaseClientFactory,
    DatabaseAnalytics,
  ],
})
export class CliModule {}
