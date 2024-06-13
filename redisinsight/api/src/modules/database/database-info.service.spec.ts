import { Test, TestingModule } from '@nestjs/testing';
import {
  mockCommonClientMetadata,
  mockDatabaseClientFactory,
  mockDatabaseInfoProvider,
  mockDatabaseOverview,
  mockDatabaseOverviewProvider,
  mockDatabaseRecommendationService,
  mockDatabaseService,
  mockRedisGeneralInfo,
  mockSessionMetadata,
  mockStandaloneRedisClient,
  MockType,
} from 'src/__mocks__';
import { DatabaseInfoService } from 'src/modules/database/database-info.service';
import { DatabaseOverviewProvider } from 'src/modules/database/providers/database-overview.provider';
import { DatabaseRecommendationService } from 'src/modules/database-recommendation/database-recommendation.service';
import { RECOMMENDATION_NAMES } from 'src/constants';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';
import { DatabaseInfoProvider } from 'src/modules/database/providers/database-info.provider';
import { DatabaseService } from './database.service';

describe('DatabaseInfoService', () => {
  const client = mockStandaloneRedisClient;
  let service: DatabaseInfoService;
  let databaseClientFactory: MockType<DatabaseClientFactory>;
  let recommendationService: MockType<DatabaseRecommendationService>;
  let databaseService: MockType<DatabaseService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInfoService,
        {
          provide: DatabaseClientFactory,
          useFactory: mockDatabaseClientFactory,
        },
        {
          provide: DatabaseOverviewProvider,
          useFactory: mockDatabaseOverviewProvider,
        },
        {
          provide: DatabaseInfoProvider,
          useFactory: mockDatabaseInfoProvider,
        },
        {
          provide: DatabaseRecommendationService,
          useFactory: mockDatabaseRecommendationService,
        },
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
      ],
    }).compile();

    service = await module.get(DatabaseInfoService);
    databaseClientFactory = await module.get(DatabaseClientFactory);
    recommendationService = module.get(DatabaseRecommendationService);
    databaseService = module.get(DatabaseService);
  });

  describe('getInfo', () => {
    it('should create client and get general info', async () => {
      expect(await service.getInfo(mockCommonClientMetadata)).toEqual(mockRedisGeneralInfo);
    });
  });

  describe('getOverview', () => {
    it('should create client and get overview', async () => {
      expect(await service.getOverview(mockCommonClientMetadata)).toEqual(mockDatabaseOverview);
    });
  });

  describe('getDatabaseIndex', () => {
    it('should not return a new client', async () => {
      expect(await service.getDatabaseIndex(mockCommonClientMetadata, 0)).toEqual(undefined);
    });
    it('Should throw Error when error during creating a client', async () => {
      databaseClientFactory.createClient.mockRejectedValueOnce(new Error());
      await expect(service.getDatabaseIndex(mockCommonClientMetadata, 0)).rejects.toThrow(Error);
    });
    it('getDatabaseIndex should call databaseService.get() if previous clientMetadata.db is Undefined', async () => {
      const db = 2;
      databaseClientFactory.createClient.mockResolvedValueOnce(client);
      await service.getDatabaseIndex(mockCommonClientMetadata, db);

      expect(databaseService.get).toBeCalledWith(mockSessionMetadata, mockCommonClientMetadata.databaseId);
    });
    describe('recommendationService', () => {
      it('getDatabaseIndex should call recommendationService', async () => {
        const db = 2;
        databaseClientFactory.createClient.mockResolvedValueOnce(client);
        await service.getDatabaseIndex(mockCommonClientMetadata, db);

        expect(recommendationService.check).toBeCalledWith(
          { ...mockCommonClientMetadata, db },
          RECOMMENDATION_NAMES.AVOID_LOGICAL_DATABASES,
          { db, prevDb: 0 },
        );
      });
      it('getDatabaseIndex should not call recommendationService if Error exists', async () => {
        databaseClientFactory.createClient.mockRejectedValueOnce(new Error());
        await expect(service.getDatabaseIndex(mockCommonClientMetadata, 2)).rejects.toThrow(Error);
        await expect(recommendationService.check).toBeCalledTimes(0);
        await expect(databaseService.get).toBeCalledTimes(1);
        await expect(databaseService.get).toBeCalledWith(mockSessionMetadata, mockCommonClientMetadata.databaseId);
      });
    });
  });
});
