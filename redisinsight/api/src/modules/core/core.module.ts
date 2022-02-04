import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaCertificateEntity } from 'src/modules/core/models/ca-certificate.entity';
import { ClientCertificateEntity } from 'src/modules/core/models/client-certificate.entity';
import { PlainEncryptionStrategy } from 'src/modules/core/encryption/strategies/plain-encryption.strategy';
import { AgreementsRepository } from './repositories/agreements.repository';
import { ServerRepository } from './repositories/server.repository';
import { SettingsRepository } from './repositories/settings.repository';
import settingsOnPremiseFactory from './providers/settings-on-premise';
import serverOnPremiseFactory from './providers/server-on-premise';
import { EncryptionService } from 'src/modules/core/encryption/encryption.service';
import { KeytarEncryptionStrategy } from 'src/modules/core/encryption/strategies/keytar-encryption.strategy';
import { CaCertBusinessService } from './services/certificates/ca-cert-business/ca-cert-business.service';
import { ClientCertBusinessService } from './services/certificates/client-cert-business/client-cert-business.service';
import { RedisService } from './services/redis/redis.service';
import { AnalyticsService } from './services/analytics/analytics.service';
import { SettingsAnalyticsService } from './services/settings-analytics/settings-analytics.service';

interface IModuleOptions {
  buildType: string;
}

/**
 * Core module
 */
@Global()
@Module({})
export class CoreModule {
  static register(options: IModuleOptions): DynamicModule {
    // TODO: use different module configurations depending on buildType
    return {
      module: CoreModule,
      imports: [
        TypeOrmModule.forFeature([
          CaCertificateEntity,
          ClientCertificateEntity,
          AgreementsRepository,
          ServerRepository,
          SettingsRepository,
        ]),
      ],
      providers: [
        settingsOnPremiseFactory,
        serverOnPremiseFactory,
        KeytarEncryptionStrategy,
        PlainEncryptionStrategy,
        EncryptionService,
        AnalyticsService,
        RedisService,
        CaCertBusinessService,
        ClientCertBusinessService,
        SettingsAnalyticsService,
      ],
      exports: [
        settingsOnPremiseFactory,
        serverOnPremiseFactory,
        EncryptionService,
        AnalyticsService,
        RedisService,
        CaCertBusinessService,
        ClientCertBusinessService,
      ],
    };
  }
}
