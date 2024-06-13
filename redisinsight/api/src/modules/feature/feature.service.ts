import { Feature } from 'src/modules/feature/model/feature';

export abstract class FeatureService {
  abstract getByName(name: string): Promise<Feature>;
  abstract isFeatureEnabled(name: string): Promise<boolean>;
  abstract list(): Promise<{ features: Record<string, Feature> }>;
  abstract recalculateFeatureFlags(): Promise<void>;
}
