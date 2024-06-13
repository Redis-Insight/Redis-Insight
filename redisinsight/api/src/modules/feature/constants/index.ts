import { Feature } from 'src/modules/feature/model/feature';

export enum FeatureServerEvents {
  FeaturesRecalculate = 'FeaturesRecalculate',
  FeaturesRecalculated = 'FeaturesRecalculated',
}

export enum FeatureEvents {
  Features = 'features',
}

export enum FeatureStorage {
  Env = 'env',
  Database = 'database',
  Custom = 'custom',
}
export enum FeatureConfigConfigDestination {
  Default = 'default',
  Remote = 'remote',
}

export enum KnownFeatures {
  InsightsRecommendations = 'insightsRecommendations',
  CloudSso = 'cloudSso',
  CloudSsoRecommendedSettings = 'cloudSsoRecommendedSettings',
  RedisModuleFilter = 'redisModuleFilter',
  RedisClient = 'redisClient',
  appSettings = 'appSettings',
  profiler = 'profiler',
  dbAnalysis = 'dbAnalysis',
  appNotifications = 'appNotifications',
  triggersAndFunctions = 'triggersAndFunctions',
  DocumentationChat = 'documentationChat',
  DatabaseChat = 'databaseChat',
}

export interface IFeatureFlag {
  name: string;
  storage: string;
  factory?: () => Partial<Feature>;
}
