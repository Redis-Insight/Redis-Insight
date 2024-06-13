import { Test, TestingModule } from '@nestjs/testing';
import {
  mockSocket,
  MockType,
  mockPubSubAnalyticsService,
  mockCommonClientMetadata,
  mockDatabaseClientFactory,
  mockStandaloneRedisClient,
  mockSessionMetadata,
} from 'src/__mocks__';
import { PubSubService } from 'src/modules/pub-sub/pub-sub.service';
import { UserSessionProvider } from 'src/modules/pub-sub/providers/user-session.provider';
import { SubscriptionProvider } from 'src/modules/pub-sub/providers/subscription.provider';
import { UserClient } from 'src/modules/pub-sub/model/user-client';
import { SubscriptionType } from 'src/modules/pub-sub/constants';
import { UserSession } from 'src/modules/pub-sub/model/user-session';
import { RedisClientSubscriber } from 'src/modules/pub-sub/model/redis-client-subscriber';
import { PubSubAnalyticsService } from 'src/modules/pub-sub/pub-sub.analytics.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';

const mockUserClient = new UserClient('socketId', mockSocket, 'databaseId');

const mockSubscriptionDto = {
  channel: 'channel-a',
  type: SubscriptionType.Subscribe,
};

const mockPSubscriptionDto = {
  channel: 'channel-a',
  type: SubscriptionType.PSubscribe,
};

const getRedisClientFn = jest.fn();
const mockRedisClientSubscriber = new RedisClientSubscriber('databaseId', getRedisClientFn);
const mockUserSession = new UserSession(mockUserClient, mockRedisClientSubscriber);

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
mockUserSession['subscribe'] = mockSubscribe;
mockUserSession['unsubscribe'] = mockUnsubscribe;
mockUserSession['destroy'] = jest.fn();

const mockPublishDto = {
  message: 'message-a',
  channel: 'channel-a',
};

describe('PubSubService', () => {
  const client = mockStandaloneRedisClient;
  let service: PubSubService;
  let sessionProvider: MockType<UserSessionProvider>;
  let databaseClientFactory: MockType<DatabaseClientFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        UserSessionProvider,
        SubscriptionProvider,
        {
          provide: UserSessionProvider,
          useFactory: () => ({
            getOrCreateUserSession: jest.fn(),
            getUserSession: jest.fn(),
            removeUserSession: jest.fn(),
          }),
        },
        {
          provide: PubSubAnalyticsService,
          useFactory: mockPubSubAnalyticsService,
        },
        {
          provide: DatabaseClientFactory,
          useFactory: mockDatabaseClientFactory,
        },
      ],
    }).compile();

    service = await module.get(PubSubService);
    databaseClientFactory = await module.get(DatabaseClientFactory);
    sessionProvider = await module.get(UserSessionProvider);

    sessionProvider.getOrCreateUserSession.mockReturnValue(mockUserSession);
    sessionProvider.getUserSession.mockReturnValue(mockUserSession);
    sessionProvider.removeUserSession.mockReturnValue(undefined);
    mockSubscribe.mockResolvedValue('OK');
    mockUnsubscribe.mockResolvedValue('OK');
    client.publish.mockResolvedValue(2);
  });

  describe('subscribe', () => {
    it('should subscribe to a single channel', async () => {
      await service.subscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
      expect(mockUserSession.subscribe).toHaveBeenCalledTimes(1);
    });
    it('should subscribe to a multiple channels', async () => {
      await service.subscribe(
        mockSessionMetadata,
        mockUserClient,
        { subscriptions: [mockSubscriptionDto, mockPSubscriptionDto] }
      );
      expect(mockUserSession.subscribe).toHaveBeenCalledTimes(2);
    });
    it('should handle HTTP error', async () => {
      try {
        mockSubscribe.mockRejectedValueOnce(new NotFoundException('Not Found'));
        await service.subscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
    it('should handle acl error', async () => {
      try {
        mockSubscribe.mockRejectedValueOnce(new Error('NOPERM'));
        await service.subscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a single channel', async () => {
      await service.unsubscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
      expect(mockUserSession.unsubscribe).toHaveBeenCalledTimes(1);
    });
    it('should unsubscribe from multiple channels', async () => {
      await service.unsubscribe(
        mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto, mockPSubscriptionDto] }
      );
      expect(mockUserSession.unsubscribe).toHaveBeenCalledTimes(2);
    });
    it('should handle HTTP error', async () => {
      try {
        mockUnsubscribe.mockRejectedValueOnce(new NotFoundException('Not Found'));
        await service.unsubscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
    it('should handle acl error', async () => {
      try {
        mockUnsubscribe.mockRejectedValueOnce(new Error('NOPERM'));
        await service.unsubscribe(mockSessionMetadata, mockUserClient, { subscriptions: [mockSubscriptionDto] });
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('publish', () => {
    it('should publish using existing client', async () => {
      const res = await service.publish(mockCommonClientMetadata, mockPublishDto);
      expect(res).toEqual({ affected: 2 });
    });
    it('should throw an error when client not found during publishing', async () => {
      databaseClientFactory.getOrCreateClient.mockRejectedValueOnce(new NotFoundException('Not Found'));

      try {
        await service.publish(mockCommonClientMetadata, mockPublishDto);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
    it('should throw forbidden error when there is no permissions to publish', async () => {
      databaseClientFactory.getOrCreateClient.mockRejectedValueOnce(new Error('NOPERM'));

      try {
        await service.publish(mockCommonClientMetadata, mockPublishDto);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('handleDisconnect', () => {
    it('should not do anything if no sessions', async () => {
      sessionProvider.getUserSession.mockReturnValueOnce(undefined);
      await service.handleDisconnect(mockUserClient.getId());
      expect(sessionProvider.removeUserSession).toHaveBeenCalledTimes(0);
    });
    it('should call session.destroy and remove session', async () => {
      await service.handleDisconnect(mockUserClient.getId());
      expect(sessionProvider.removeUserSession).toHaveBeenCalledTimes(1);
      expect(mockUserSession.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
