import { Test, TestingModule } from '@nestjs/testing';
import {
  mockDatabaseClientFactory,
  mockLogFile,
  mockRedisShardObserver, mockSessionMetadata,
  mockStandaloneRedisClient,
} from 'src/__mocks__';
import { RedisObserverProvider } from 'src/modules/profiler/providers/redis-observer.provider';
import { RedisObserverStatus } from 'src/modules/profiler/constants';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';

describe('RedisObserverProvider', () => {
  const client = mockStandaloneRedisClient;
  let service: RedisObserverProvider;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisObserverProvider,
        {
          provide: DatabaseClientFactory,
          useFactory: mockDatabaseClientFactory,
        },
      ],
    }).compile();

    service = await module.get(RedisObserverProvider);

    client.call.mockResolvedValue('OK');
    client.monitor.mockReturnValue(mockRedisShardObserver);
  });

  it('getOrCreateObserver new observer', async () => {
    const redisObserver = await service.getOrCreateObserver(mockSessionMetadata, mockLogFile.instanceId);

    expect(redisObserver['redis']).toEqual(client);
    expect(service['redisObservers'].size).toEqual(1);

    expect(await service.getObserver(mockLogFile.instanceId)).toEqual(redisObserver);
    await service.removeObserver(mockLogFile.instanceId);
    expect(service['redisObservers'].size).toEqual(0);
  });

  it('getOrCreateObserver check statuses', async () => {
    const redisObserver = await service.getOrCreateObserver(
      mockSessionMetadata,
      mockLogFile.instanceId,
    );

    redisObserver['init'] = jest.fn().mockResolvedValue(Promise.resolve());
    expect(redisObserver['redis']).toEqual(client);
    expect(redisObserver['status']).toEqual(RedisObserverStatus.Ready);

    const promise = service.getOrCreateObserver(mockSessionMetadata, mockLogFile.instanceId);
    redisObserver.emit('connect');
    const redisObserver2 = await promise;
    expect(redisObserver).toEqual(redisObserver2);

    redisObserver['status'] = RedisObserverStatus.Ready;
    const redisObserver3 = await service.getOrCreateObserver(mockSessionMetadata, mockLogFile.instanceId);
    expect(redisObserver).toEqual(redisObserver3);

    redisObserver['status'] = RedisObserverStatus.Error;
    const promise2 = service.getOrCreateObserver(mockSessionMetadata, mockLogFile.instanceId);
    redisObserver.emit('connect');
    const redisObserver4 = await promise2;
    expect(redisObserver).toEqual(redisObserver4);

    try {
      redisObserver['status'] = RedisObserverStatus.Empty;
      const promise3 = service.getOrCreateObserver(mockSessionMetadata, mockLogFile.instanceId);
      redisObserver.emit('connect_error', new Error('error'));
      await promise3;
      fail();
    } catch (e) {
      expect(e.message).toEqual('error');
    }
  });
});
