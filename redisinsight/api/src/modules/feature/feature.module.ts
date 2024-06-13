import { Module, Type } from '@nestjs/common';
import { FeatureController } from 'src/modules/feature/feature.controller';
import { LocalFeatureService } from 'src/modules/feature/local.feature.service';
import { FeatureService } from 'src/modules/feature/feature.service';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { FeaturesConfigRepository } from 'src/modules/feature/repositories/features-config.repository';
import { LocalFeaturesConfigRepository } from 'src/modules/feature/repositories/local.features-config.repository';
import { FeaturesConfigService } from 'src/modules/feature/features-config.service';
import { FeatureRepository } from 'src/modules/feature/repositories/feature.repository';
import { LocalFeatureRepository } from 'src/modules/feature/repositories/local.feature.repository';
import { FeatureFlagProvider } from 'src/modules/feature/providers/feature-flag/feature-flag.provider';
import { FeatureGateway } from 'src/modules/feature/feature.gateway';
import { FeatureAnalytics } from 'src/modules/feature/feature.analytics';

@Module({})
export class FeatureModule {
  static register(
    featureRepository: Type<FeatureRepository> = LocalFeatureRepository,
    featuresConfigRepository: Type<FeaturesConfigRepository> = LocalFeaturesConfigRepository,
    featureService: Type<FeatureService> = LocalFeatureService,
  ) {
    return {
      module: FeatureModule,
      controllers: [FeatureController],
      providers: [
        FeaturesConfigService,
        FeatureFlagProvider,
        FeatureGateway,
        FeatureAnalytics,
        {
          provide: FeatureService,
          useClass: featureService,
        },
        {
          provide: FeatureRepository,
          useClass: featureRepository,
        },
        {
          provide: FeaturesConfigRepository,
          useClass: featuresConfigRepository,
        },
      ],
      exports: [
        FeatureService,
        FeaturesConfigService,
      ],
      imports: [
        NotificationModule,
      ],
    };
  }
}
