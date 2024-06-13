import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  mockCloudAccountInfo,
  mockCloudAutodiscoveryAnalytics,
  mockCloudCapiAuthDto,
  mockCloudDatabase, mockCloudDatabaseCapiService,
  mockCloudDatabaseFixed,
  mockCloudSubscription, mockCloudSubscriptionCapiService,
  mockCloudUserCapiService,
  mockDatabaseService,
  mockImportCloudDatabaseDto, mockImportCloudDatabaseDtoFixed,
  mockImportCloudDatabaseResponse,
  mockImportCloudDatabaseResponseFixed,
  mockSessionMetadata,
  MockType,
} from 'src/__mocks__';
import { DatabaseService } from 'src/modules/database/database.service';
import { CloudAutodiscoveryService } from 'src/modules/cloud/autodiscovery/cloud-autodiscovery.service';
import { CloudAutodiscoveryAnalytics } from 'src/modules/cloud/autodiscovery/cloud-autodiscovery.analytics';
import { ActionStatus } from 'src/common/models';
import { CloudSubscriptionType } from 'src/modules/cloud/subscription/models';
import { CloudAutodiscoveryAuthType } from 'src/modules/cloud/autodiscovery/models';
import { CloudDatabaseStatus } from 'src/modules/cloud/database/models';
import { CloudApiUnauthorizedException } from 'src/modules/cloud/common/exceptions';
import { CloudUserCapiService } from 'src/modules/cloud/user/cloud-user.capi.service';
import { CloudSubscriptionCapiService } from 'src/modules/cloud/subscription/cloud-subscription.capi.service';
import { CloudDatabaseCapiService } from 'src/modules/cloud/database/cloud-database.capi.service';

describe('CloudAutodiscoveryService', () => {
  let service: CloudAutodiscoveryService;
  let cloudUserCapiService: MockType<CloudUserCapiService>;
  let cloudSubscriptionCapiService: MockType<CloudSubscriptionCapiService>;
  let cloudDatabaseCapiService: MockType<CloudDatabaseCapiService>;
  let analytics: MockType<CloudAutodiscoveryAnalytics>;
  let databaseService: MockType<DatabaseService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudAutodiscoveryService,
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
        {
          provide: CloudUserCapiService,
          useFactory: mockCloudUserCapiService,
        },
        {
          provide: CloudSubscriptionCapiService,
          useFactory: mockCloudSubscriptionCapiService,
        },
        {
          provide: CloudDatabaseCapiService,
          useFactory: mockCloudDatabaseCapiService,
        },
        {
          provide: CloudAutodiscoveryAnalytics,
          useFactory: mockCloudAutodiscoveryAnalytics,
        },
      ],
    }).compile();

    service = module.get(CloudAutodiscoveryService);
    analytics = module.get(CloudAutodiscoveryAnalytics);
    databaseService = module.get(DatabaseService);
    cloudUserCapiService = module.get(CloudUserCapiService);
    cloudSubscriptionCapiService = module.get(CloudSubscriptionCapiService);
    cloudDatabaseCapiService = module.get(CloudDatabaseCapiService);
  });

  describe('getAccount', () => {
    it('successfully get cloud account info', async () => {
      expect(await service.getAccount(mockCloudCapiAuthDto)).toEqual(mockCloudAccountInfo);
    });
    it('should throw CloudApiUnauthorizedException exception', async () => {
      cloudUserCapiService.getCurrentAccount.mockRejectedValueOnce(new CloudApiUnauthorizedException());
      await expect(service.getAccount(mockCloudCapiAuthDto)).rejects.toThrow(
        CloudApiUnauthorizedException,
      );
    });
  });
  describe('discoverSubscriptions', () => {
    it('successfully discover fixed and flexible cloud subscriptions', async () => {
      expect(await service.discoverSubscriptions(
        mockCloudCapiAuthDto,
        CloudAutodiscoveryAuthType.Credentials,
      )).toEqual([mockCloudSubscription, mockCloudSubscription]);
      expect(analytics.sendGetRECloudSubsSucceedEvent)
        .toHaveBeenCalledWith(
          [mockCloudSubscription],
          CloudSubscriptionType.Fixed,
          CloudAutodiscoveryAuthType.Credentials,
        );
      expect(analytics.sendGetRECloudSubsSucceedEvent)
        .toHaveBeenCalledWith(
          [mockCloudSubscription],
          CloudSubscriptionType.Flexible,
          CloudAutodiscoveryAuthType.Credentials,
        );
    });
    it('throw CloudApiUnauthorizedException exception', async () => {
      cloudSubscriptionCapiService.getSubscriptions.mockRejectedValue(new CloudApiUnauthorizedException());

      await expect(service.discoverSubscriptions(
        mockCloudCapiAuthDto,
        CloudAutodiscoveryAuthType.Credentials,
      )).rejects.toThrow(
        CloudApiUnauthorizedException,
      );

      expect(analytics.sendGetRECloudSubsFailedEvent)
        .toHaveBeenCalledWith(
          new CloudApiUnauthorizedException(),
          CloudSubscriptionType.Fixed,
          CloudAutodiscoveryAuthType.Credentials,
        );
    });
  });
  describe('discoverDatabases', () => {
    it('should call getDatabases 2 times', async () => {
      expect(await service.discoverDatabases(
        mockCloudCapiAuthDto,
        {
          subscriptions: [
            {
              subscriptionId: 86070,
              subscriptionType: CloudSubscriptionType.Flexible,
              free: false,
            },
            {
              subscriptionId: 86071,
              subscriptionType: CloudSubscriptionType.Fixed,
              free: true,
            },
          ],
        },
        CloudAutodiscoveryAuthType.Credentials,
      )).toEqual([mockCloudDatabase, mockCloudDatabase]);

      expect(cloudDatabaseCapiService.getDatabases).toHaveBeenCalledTimes(2);
      expect(cloudDatabaseCapiService.getDatabases).toHaveBeenCalledWith(mockCloudCapiAuthDto, {
        subscriptionId: 86070,
        subscriptionType: CloudSubscriptionType.Flexible,
        free: false,
      });
      expect(cloudDatabaseCapiService.getDatabases).toHaveBeenCalledWith(mockCloudCapiAuthDto, {
        subscriptionId: 86071,
        subscriptionType: CloudSubscriptionType.Fixed,
        free: true,
      });
      expect(analytics.sendGetRECloudDbsSucceedEvent).toHaveBeenCalledWith(
        [mockCloudDatabase, mockCloudDatabase],
        CloudAutodiscoveryAuthType.Credentials,
      );
    });
    it('should call getDatabases 2 times (same id but different types)', async () => {
      await service.discoverDatabases(
        mockCloudCapiAuthDto,
        {
          subscriptions: [
            { subscriptionId: 86070, subscriptionType: CloudSubscriptionType.Flexible },
            { subscriptionId: 86070, subscriptionType: CloudSubscriptionType.Fixed },
          ],
        },
        CloudAutodiscoveryAuthType.Credentials,
      );

      expect(cloudDatabaseCapiService.getDatabases).toHaveBeenCalledTimes(2);
    });
    it('should call getDatabases 2 times (uniq by id and type)', async () => {
      await service.discoverDatabases(
        mockCloudCapiAuthDto,
        {
          subscriptions: [
            { subscriptionId: 86070, subscriptionType: CloudSubscriptionType.Flexible },
            { subscriptionId: 86071, subscriptionType: CloudSubscriptionType.Fixed },
            { subscriptionId: 86071, subscriptionType: CloudSubscriptionType.Fixed },
          ],
        },
        CloudAutodiscoveryAuthType.Credentials,
      );

      expect(cloudDatabaseCapiService.getDatabases).toHaveBeenCalledTimes(2);
    });
    it('subscription not found', async () => {
      cloudDatabaseCapiService.getDatabases = jest
        .fn()
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.discoverDatabases(
          mockCloudCapiAuthDto,
          {
            subscriptions: [
              { subscriptionId: 86070, subscriptionType: CloudSubscriptionType.Flexible },
              { subscriptionId: 86071, subscriptionType: CloudSubscriptionType.Fixed },
            ],
          },
          CloudAutodiscoveryAuthType.Credentials,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(analytics.sendGetRECloudDbsFailedEvent).toHaveBeenCalledWith(
        new NotFoundException(),
        CloudAutodiscoveryAuthType.Credentials,
      );
    });
  });
  describe('addRedisCloudDatabases', () => {
    it('should successfully add 1 fixed and 1 flexible databases', async () => {
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabase);
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabaseFixed);

      const result = await service.addRedisCloudDatabases(
        mockSessionMetadata,
        mockCloudCapiAuthDto,
        [
          mockImportCloudDatabaseDto,
          mockImportCloudDatabaseDtoFixed,
        ],
      );

      expect(result).toEqual([
        mockImportCloudDatabaseResponse,
        mockImportCloudDatabaseResponseFixed,
      ]);
    });
    it('should successfully add 1 fixed database and report 1 error without database details (404)', async () => {
      cloudDatabaseCapiService.getDatabase.mockRejectedValueOnce(new NotFoundException());
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabaseFixed);

      const result = await service.addRedisCloudDatabases(
        mockSessionMetadata,
        mockCloudCapiAuthDto,
        [
          mockImportCloudDatabaseDto,
          mockImportCloudDatabaseDtoFixed,
        ],
      );

      expect(result).toEqual([
        {
          ...mockImportCloudDatabaseResponse,
          error: {
            message: 'Not Found',
            statusCode: 404,
          },
          message: 'Not Found',
          status: 'fail',
          databaseDetails: undefined, // no database details when database wasn't fetched from cloud
        },
        mockImportCloudDatabaseResponseFixed,
      ]);
    });
    it('should successfully add 1 fixed database and report 1 error with database details', async () => {
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabase);
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabaseFixed);
      databaseService.create.mockRejectedValueOnce(new Error('Connectivity issue'));

      const result = await service.addRedisCloudDatabases(
        mockSessionMetadata,
        mockCloudCapiAuthDto,
        [
          mockImportCloudDatabaseDto,
          mockImportCloudDatabaseDtoFixed,
        ],
      );

      expect(result).toEqual([
        {
          ...mockImportCloudDatabaseResponse,
          message: 'Connectivity issue',
          status: ActionStatus.Fail,
        },
        mockImportCloudDatabaseResponseFixed,
      ]);
    });
    it('should successfully add 1 fixed database and report 1 error if db is not actives', async () => {
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce({
        ...mockCloudDatabase,
        status: CloudDatabaseStatus.Pending,
      });
      cloudDatabaseCapiService.getDatabase.mockResolvedValueOnce(mockCloudDatabaseFixed);

      const result = await service.addRedisCloudDatabases(
        mockSessionMetadata,
        mockCloudCapiAuthDto,
        [
          mockImportCloudDatabaseDto,
          mockImportCloudDatabaseDtoFixed,
        ],
      );

      expect(result).toEqual([
        {
          ...mockImportCloudDatabaseResponse,
          error: {
            error: 'Service Unavailable',
            message: 'The database is inactive.',
            statusCode: 503,
          },
          message: 'The database is inactive.',
          status: ActionStatus.Fail,
          databaseDetails: {
            ...mockImportCloudDatabaseResponse.databaseDetails,
            status: CloudDatabaseStatus.Pending,
          },
        },
        mockImportCloudDatabaseResponseFixed,
      ]);
    });
  });
});
