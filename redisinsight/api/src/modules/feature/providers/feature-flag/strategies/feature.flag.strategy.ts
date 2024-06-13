import * as fs from 'fs-extra';
import { get } from 'lodash';
import { FeaturesConfigService } from 'src/modules/feature/features-config.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import {
  FeatureConfigFilter, FeatureConfigFilterAnd,
  FeatureConfigFilterCondition, FeatureConfigFilterOr,
  FeatureConfigFilterType,
} from 'src/modules/feature/model/features-config';
import config, { Config } from 'src/utils/config';
import { Feature } from 'src/modules/feature/model/feature';
import { IFeatureFlag } from 'src/modules/feature/constants';

const PATH_CONFIG = config.get('dir_path') as Config['dir_path'];

export abstract class FeatureFlagStrategy {
  constructor(
    protected readonly featuresConfigService: FeaturesConfigService,
    protected readonly settingsService: SettingsService,
  ) {}

  abstract calculate(knownFeature: IFeatureFlag, data: any): Promise<Feature>;

  static async getCustomConfig(): Promise<object> {
    try {
      const customConfig = JSON.parse(await fs.readFile(PATH_CONFIG.customConfig, 'utf8'));
      return customConfig?.features || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Check if controlNumber is in defined range
   * Should return false in case of any error
   * @param perc
   * @protected
   */
  protected async isInTargetRange(perc: number[][] = [[-1]]): Promise<boolean> {
    try {
      const { controlNumber } = await this.featuresConfigService.getControlInfo();

      return !!perc.find((range) => controlNumber >= range[0] && controlNumber < range[1]);
    } catch (e) {
      return false;
    }
  }

  protected async getServerState(): Promise<object> {
    const state: any = {
      config: config.get(),
      env: process.env,
      agreements: null,
      settings: null,
    };

    // determine agreements and settings
    try {
      // todo: [USER_CONTEXT] temporary workaround
      const appSettings = await this.settingsService.getAppSettings({
        userId: '1',
        sessionId: '1',
      }).catch(null);

      state.agreements = appSettings?.agreements;
      state.settings = appSettings;
    } catch (e) {
      // silently ignore error
    }
    return state;
  }

  /**
   * Check all filters (starting from "AND" since { filters: [] } equal to filters: [{ and: []}])
   * @param filters
   * @protected
   */
  protected async filter(filters: FeatureConfigFilterType[]): Promise<boolean> {
    try {
      const serverState = await this.getServerState();
      return this.checkAndFilters(filters, serverState);
    } catch (e) {
      return false;
    }
  }

  /**
   * Check all feature filters with recursion
   * @param filter
   * @param serverState
   * @private
   */
  private checkFilter(filter: FeatureConfigFilterType, serverState: object): boolean {
    try {
      if (filter instanceof FeatureConfigFilterAnd) {
        return this.checkAndFilters(filter.and, serverState);
      }

      if (filter instanceof FeatureConfigFilterOr) {
        return this.checkOrFilters(filter.or, serverState);
      }

      if (filter instanceof FeatureConfigFilter) {
        const value = get(serverState, filter?.name);

        switch (filter?.cond) {
          case FeatureConfigFilterCondition.Eq:
            return value === filter?.value;
          case FeatureConfigFilterCondition.Neq:
            return value !== filter?.value;
          case FeatureConfigFilterCondition.Gt:
            return value > filter?.value;
          case FeatureConfigFilterCondition.Gte:
            return value >= filter?.value;
          case FeatureConfigFilterCondition.Lt:
            return value < filter?.value;
          case FeatureConfigFilterCondition.Lte:
            return value <= filter?.value;
          default:
            return false;
        }
      }
    } catch (e) {
      // ignore error
    }

    return false;
  }

  /**
   * Process "AND" filter when all of conditions (including in deep nested OR or AND) should pass
   * @param filters
   * @param serverState
   * @private
   */
  private checkAndFilters(filters: FeatureConfigFilterType[], serverState: object): boolean {
    try {
      return !!filters.every((filter) => this.checkFilter(filter, serverState));
    } catch (e) {
      return false;
    }
  }

  /**
   * Process "OR" conditions when at least one condition should pass
   * @param filters
   * @param serverState
   * @private
   */
  private checkOrFilters(filters: FeatureConfigFilterType[], serverState: object): boolean {
    try {
      return !!filters.some((filter) => this.checkFilter(filter, serverState));
    } catch (e) {
      return false;
    }
  }
}
