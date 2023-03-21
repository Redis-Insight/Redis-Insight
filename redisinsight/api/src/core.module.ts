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

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AnalyticsModule,
    EncryptionModule.register(),
    SettingsModule.register(),
    CertificateModule.register(),
    DatabaseModule.register(),
    RedisModule,
    DatabaseRecommendationModule,
    SshModule,
  ],
  exports: [
    EncryptionModule,
    SettingsModule,
    CertificateModule,
    DatabaseModule,
    DatabaseRecommendationModule,
    RedisModule,
    SshModule,
  ],
})
export class CoreModule {}
