import { DatabaseRecommendation } from 'src/modules/database-recommendation/models';
import { DatabaseRecommendationEntity }
  from 'src/modules/database-recommendation/entities/database-recommendation.entity';
import { EncryptionStrategy } from 'src/modules/encryption/models';
import { mockDatabaseId } from 'src/__mocks__/databases';

export const mockDatabaseRecommendationId = 'databaseRecommendationID';

export const mockRecommendationName = 'string';

export const mockDatabaseRecommendationParamsEncrypted = 'recommendation.params_ENCRYPTED';

export const mockDatabaseRecommendationParamsPlain = [];

export const mockDatabaseRecommendation = Object.assign(new DatabaseRecommendation(), {
  id: mockDatabaseRecommendationId,
  name: mockRecommendationName,
  databaseId: mockDatabaseId,
  read: false,
  disabled: false,
  hide: false,
  params: mockDatabaseRecommendationParamsPlain,
});

export const mockDatabaseRecommendationEntity = new DatabaseRecommendationEntity(
  {
    ...mockDatabaseRecommendation,
    params: mockDatabaseRecommendationParamsEncrypted,
    encryption: EncryptionStrategy.KEYTAR,
  },
);

export const mockDatabaseRecommendationService = () => ({
  create: jest.fn(),
  list: jest.fn(),
  check: jest.fn(),
  read: jest.fn(),
});

export const mockDatabaseRecommendationProvider = jest.fn(() => ({
  getStrategy: jest.fn(),
}));

export const mockDatabaseRecommendationRepository = jest.fn(() => ({
  create: jest.fn(),
  list: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  isExist: jest.fn(),
  get: jest.fn(),
  sync: jest.fn(),
  delete: jest.fn(),
  getTotalUnread: jest.fn(),
}));

export const mockRecommendationScanner = jest.fn(() => ({
  determineRecommendation: jest.fn(),
}));

export const mockDatabaseRecommendationAnalytics = jest.fn(() => ({
  sendCreatedRecommendationEvent: jest.fn(),
}));
