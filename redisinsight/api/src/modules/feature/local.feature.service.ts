import { find, forEach, isBoolean } from 'lodash';
import { Injectable, Logger } from '@nestjs/common';
import { FeatureRepository } from 'src/modules/feature/repositories/feature.repository';
import { FeatureServerEvents, FeatureStorage } from 'src/modules/feature/constants';
import { FeaturesConfigRepository } from 'src/modules/feature/repositories/features-config.repository';
import { FeatureFlagProvider } from 'src/modules/feature/providers/feature-flag/feature-flag.provider';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { FeatureAnalytics } from 'src/modules/feature/feature.analytics';
import { knownFeatures } from 'src/modules/feature/constants/known-features';
import { Feature } from 'src/modules/feature/model/feature';
import { FeatureService } from 'src/modules/feature/feature.service';
import { FeatureFlagStrategy } from 'src/modules/feature/providers/feature-flag/strategies/feature.flag.strategy';

@Injectable()
export class LocalFeatureService extends FeatureService {
  private logger = new Logger('FeaturesConfigService');

  constructor(
    private readonly repository: FeatureRepository,
    private readonly featuresConfigRepository: FeaturesConfigRepository,
    private readonly featureFlagProvider: FeatureFlagProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly analytics: FeatureAnalytics,
  ) {
    super();
  }

  async getByName(name: string): Promise<Feature> {
    try {
      return await this.repository.get(name);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if feature enabled
   * @param name
   */
  async isFeatureEnabled(name: string): Promise<boolean> {
    try {
      // todo: add non-database features if needed
      const model = await this.repository.get(name);

      return model?.flag === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns list of features flags
   */
  async list(): Promise<{ features: Record<string, Feature> }> {
    this.logger.log('Getting features list');

    const features = {};

    const featuresFromDatabase = await this.repository.list();

    forEach(knownFeatures, (feature) => {
      // todo: implement various storage strategies support with next features
      switch (feature?.storage) {
        case FeatureStorage.Database: {
          const dbFeature = find(featuresFromDatabase, { name: feature.name });
          if (dbFeature) {
            features[feature.name] = {
              name: dbFeature.name,
              flag: dbFeature.flag,
              strategy: dbFeature.strategy || undefined,
              data: dbFeature.data || undefined,
            };
          }
          break;
        }
        case FeatureStorage.Custom:
          features[feature.name] = feature?.factory?.();
          break;
        default:
          // do nothing
      }
    });

    return { features };
  }

  // todo: add api doc + models
  /**
   * Recalculate flags for database features based on controlGroup and new conditions
   */
  @OnEvent(FeatureServerEvents.FeaturesRecalculate)
  async recalculateFeatureFlags() {
    this.logger.log('Recalculating features flags');

    try {
      const actions = {
        toUpsert: [],
        toDelete: [],
      };

      const featuresFromDatabase = await this.repository.list();
      const featuresConfig = await this.featuresConfigRepository.getOrCreate();

      this.logger.debug('Recalculating features flags for new config', featuresConfig);

      await Promise.all(Array.from(featuresConfig?.data?.features || new Map(), async ([name, feature]) => {
        if (knownFeatures[name]) {
          actions.toUpsert.push({
            ...(await this.featureFlagProvider.calculate(knownFeatures[name], feature)),
          });
        }
      }));

      // calculate to delete features
      actions.toDelete = featuresFromDatabase.filter((feature) => !featuresConfig?.data?.features?.has?.(feature.name));

      // delete features
      await Promise.all(actions.toDelete.map((feature) => this.repository.delete(feature.name)));
      // upsert modified features
      await Promise.all(actions.toUpsert.map((feature) => this.repository.upsert(feature)));

      this.logger.log(
        `Features flags recalculated. Updated: ${actions.toUpsert.length} deleted: ${actions.toDelete.length}`,
      );

      const list = await this.list();
      this.eventEmitter.emit(FeatureServerEvents.FeaturesRecalculated, list);

      try {
        this.analytics.sendFeatureFlagRecalculated({
          configVersion: (await this.featuresConfigRepository.getOrCreate())?.data?.version,
          features: list.features,
          force: await this.listOfForceFlags(),
        });
      } catch (e) {
        // ignore telemetry error
      }
    } catch (e) {
      this.logger.error('Unable to recalculate features flags', e);
    }
  }

  /**
   * Find forced flags values from custom config using only known features list
   */
  async listOfForceFlags(): Promise<Record<string, boolean>> {
    try {
      const features = {};
      const forceFeatures = (await FeatureFlagStrategy.getCustomConfig());

      forEach(knownFeatures, (known) => {
        if (isBoolean(forceFeatures[known.name])) {
          features[known.name] = forceFeatures[known.name];
        }
      });

      return features;
    } catch (e) {
      return {};
    }
  }
}
