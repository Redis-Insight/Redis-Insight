import { Injectable } from '@nestjs/common';
import { FeatureFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/feature.flag.strategy';
import {
  CommonFlagStrategy,
} from 'src/modules/feature/providers/feature-flag/strategies/common.flag.strategy';
import { DefaultFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/default.flag.strategy';
import { FeaturesConfigService } from 'src/modules/feature/features-config.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import { IFeatureFlag, KnownFeatures } from 'src/modules/feature/constants';
import { CloudSsoFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/cloud-sso.flag.strategy';
import { Feature } from 'src/modules/feature/model/feature';
import { WithDataFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/with-data.flag.strategy';
import { SwitchableFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/switchable.flag.strategy';

@Injectable()
export class FeatureFlagProvider {
  private strategies: Map<string, FeatureFlagStrategy> = new Map();

  constructor(
    private readonly featuresConfigService: FeaturesConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.strategies.set('default', new DefaultFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.InsightsRecommendations, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.CloudSso, new CloudSsoFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.CloudSsoRecommendedSettings, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.RedisModuleFilter, new WithDataFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.RedisClient, new WithDataFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.DocumentationChat, new SwitchableFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.DatabaseChat, new SwitchableFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.appSettings, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.profiler, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.dbAnalysis, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.appNotifications, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
    this.strategies.set(KnownFeatures.triggersAndFunctions, new CommonFlagStrategy(
      this.featuresConfigService,
      this.settingsService,
    ));
  }

  getStrategy(name: string): FeatureFlagStrategy {
    return this.strategies.get(name) || this.getStrategy('default');
  }

  calculate(knownFeature: IFeatureFlag, featureConditions: any): Promise<Feature> {
    const strategy = this.getStrategy(knownFeature.name);

    return strategy.calculate(knownFeature, featureConditions);
  }
}
