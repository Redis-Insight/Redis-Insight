import { Global, Module } from '@nestjs/common';
import { EncryptionModule } from 'src/modules/encryption/encryption.module';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { DatabaseRecommendationModule } from 'src/modules/database-recommendation/database-recommendation.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from 'src/modules/redis/redis.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { SshModule } from 'src/modules/ssh/ssh.module';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { FeatureModule } from 'src/modules/feature/feature.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SessionModule } from 'src/modules/session/session.module';
import { ServerModule } from 'src/modules/server/server.module';
import { ConstantsModule } from 'src/modules/constants/constants.module';

@Global()
@Module({
  imports: [
    ConstantsModule.register(),
    EventEmitterModule.forRoot(),
    AnalyticsModule,
    EncryptionModule.register(),
    SettingsModule.register(),
    CertificateModule.register(),
    DatabaseModule.register(),
    RedisModule,
    DatabaseRecommendationModule.register(),
    SshModule,
    NestjsFormDataModule,
    FeatureModule.register(),
    AuthModule.register(),
    SessionModule.register(),
    ServerModule.register(),
  ],
  exports: [
    ConstantsModule,
    EncryptionModule,
    SettingsModule,
    CertificateModule,
    DatabaseModule,
    DatabaseRecommendationModule,
    RedisModule,
    SshModule,
    NestjsFormDataModule,
    FeatureModule,
    SessionModule,
    ServerModule,
  ],
})
export class CoreModule {}
