import { Test } from '@nestjs/testing';
import * as Redis from 'ioredis';
import {
  mockClientMetadata, mockClusterDatabaseWithTlsAuth,
  mockDatabase, mockDatabaseWithSshBasic,
  mockDatabaseWithTlsAuth,
  mockSentinelDatabaseWithTlsAuth,
  mockSshTunnelProvider,
  mockStandaloneRedisClient,
} from 'src/__mocks__';
import { EventEmitter } from 'events';
import apiConfig, { Config } from 'src/utils/config';
import { SshTunnelProvider } from 'src/modules/ssh/ssh-tunnel.provider';
import { IoredisRedisConnectionStrategy } from 'src/modules/redis/connection/ioredis.redis.connection.strategy';
import { ClusterIoredisClient, SentinelIoredisClient, StandaloneIoredisClient } from 'src/modules/redis/client';
import { InternalServerErrorException } from '@nestjs/common';
import ERROR_MESSAGES from 'src/constants/error-messages';
import { ReplyError } from 'src/models';

const REDIS_CLIENTS_CONFIG = apiConfig.get('redis_clients') as Config['redis_clients'];

jest.mock('ioredis', () => ({
  ...jest.requireActual('ioredis') as object,
}));

const mockError = new Error('some error');
const checkError = (cb) => (e) => {
  expect(e).toEqual(mockError);
  cb();
};

describe('IoredisRedisConnectionStrategy', () => {
  let service: IoredisRedisConnectionStrategy;
  let mockIoredisNativeClient;
  let mockIoredisClusterNativeClient;
  let spyRedis;
  let spyCluster;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IoredisRedisConnectionStrategy,
        {
          provide: SshTunnelProvider,
          useFactory: mockSshTunnelProvider,
        },
      ],
    })
      .compile();

    service = await module.get(IoredisRedisConnectionStrategy);

    class MockNativeRedisClient extends EventEmitter {
      addBuiltinCommand = jest.fn();
    }

    mockIoredisNativeClient = new MockNativeRedisClient();
    mockIoredisClusterNativeClient = new MockNativeRedisClient();
    spyRedis = jest.spyOn(Redis, 'default');
    spyRedis.mockImplementationOnce(() => mockIoredisNativeClient);
    spyCluster = jest.spyOn(Redis, 'Cluster');
    spyCluster.mockImplementationOnce(() => mockIoredisClusterNativeClient);
  });

  describe('retryStrategy', () => {
    it('should return 500ms delay for first retry', () => {
      expect(service['retryStrategy'](1)).toEqual(REDIS_CLIENTS_CONFIG.retryDelay);
    });
    it('should return 1000ms delay for second retry', () => {
      expect(service['retryStrategy'](2)).toEqual(REDIS_CLIENTS_CONFIG.retryDelay * 2);
    });
    it('should return undefined when number of retries exceeded', () => {
      expect(service['retryStrategy'](REDIS_CLIENTS_CONFIG.retryTimes + 1)).toEqual(undefined);
    });
  });

  describe('createStandaloneClient', () => {
    it('should successfully create standalone client', (done) => {
      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithTlsAuth, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(StandaloneIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          done();
        });
      process.nextTick(() => mockIoredisNativeClient.emit('ready'));
    });
    it('should successfully create standalone client with reconnect', (done) => {
      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithTlsAuth, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(StandaloneIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          done();
        });

      process.nextTick(() => {
        mockIoredisNativeClient.emit('reconnecting');
        process.nextTick(() => mockIoredisNativeClient.emit('ready'));
      });
    });
    it('should successfully create standalone client with ssh', (done) => {
      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithSshBasic, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(StandaloneIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          done();
        });

      process.nextTick(() => {
        mockIoredisNativeClient.emit('reconnecting');
        process.nextTick(() => mockIoredisNativeClient.emit('ready'));
      });
    });
    it('should successfully create standalone client with db = 0 for sentinel', (done) => {
      service.createStandaloneClient(mockClientMetadata, {
        ...mockSentinelDatabaseWithTlsAuth,
        db: 1, // will be overwritten to 1 during connection
      }, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(StandaloneIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          expect(spyRedis).toHaveBeenCalledWith(expect.objectContaining({ db: 0 }));
          done();
        });

      process.nextTick(() => {
        process.nextTick(() => mockIoredisNativeClient.emit('ready'));
      });
    });
    it('should successfully create standalone client with db > 0 for !sentinel', (done) => {
      service.createStandaloneClient(mockClientMetadata, {
        ...mockDatabase,
        db: 1, // will still be 1 during connection
      }, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(StandaloneIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          expect(spyRedis).toHaveBeenCalledWith(expect.objectContaining({ db: 1 }));
          done();
        });

      process.nextTick(() => {
        process.nextTick(() => mockIoredisNativeClient.emit('ready'));
      });
    });
    it('should fail to create standalone connection', (done) => {
      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithTlsAuth, {})
        .then(fail)
        .catch(checkError(done));

      process.nextTick(() => mockIoredisNativeClient.emit('error', mockError));
    });
    it('should fail to create standalone connection due to "end" event', (done) => {
      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithTlsAuth, {})
        .then(fail)
        .catch((e) => {
          expect(e).toBeInstanceOf(InternalServerErrorException);
          expect(e.message).toEqual(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
          done();
        });

      process.nextTick(() => mockIoredisNativeClient.emit('end'));
    });
    it('should handle sync error during standalone client creation', (done) => {
      spyRedis.mockReset();
      spyRedis.mockImplementationOnce(() => {
        throw mockError;
      });

      service.createStandaloneClient(mockClientMetadata, mockDatabaseWithTlsAuth, {})
        .then(fail)
        .catch(checkError(done));
    });
  });

  describe('createClusterClient', () => {
    beforeEach(() => {
      jest.spyOn(service, 'createStandaloneClient').mockResolvedValue(mockStandaloneRedisClient);
    });

    it('should successfully create cluster client', (done) => {
      service.createClusterClient(mockClientMetadata, mockClusterDatabaseWithTlsAuth, {})
        .then((client) => {
          expect(client).toBeInstanceOf(ClusterIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisClusterNativeClient);
          done();
        });

      process.nextTick(() => mockIoredisClusterNativeClient.emit('ready'));
    });
    it('should fail to create cluster connection due to "error" event', (done) => {
      service.createClusterClient(mockClientMetadata, mockClusterDatabaseWithTlsAuth, {})
        .then(fail)
        .catch(checkError(done));

      process.nextTick(() => mockIoredisClusterNativeClient.emit('error', mockError));
    });
    it('should fail with lastNodeError', (done) => {
      const mockedLastNodeError = Object.assign(new ReplyError('some message'), { name: 'Unsupported' });
      service.createClusterClient(mockClientMetadata, mockClusterDatabaseWithTlsAuth, {})
        .then(fail)
        .catch((e) => {
          expect(e).toEqual(mockedLastNodeError);
          done();
        });

      process.nextTick(() => mockIoredisClusterNativeClient.emit('error', { lastNodeError: mockedLastNodeError }));
    });
    it('should fail to create cluster connection due to "end" event', (done) => {
      service.createClusterClient(mockClientMetadata, mockClusterDatabaseWithTlsAuth, {})
        .then(fail)
        .catch((e) => {
          expect(e).toBeInstanceOf(InternalServerErrorException);
          expect(e.message).toEqual(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
          done();
        });

      process.nextTick(() => mockIoredisClusterNativeClient.emit('end'));
    });
    it('should handle sync error during cluster client creation', (done) => {
      spyCluster.mockReset();
      spyCluster.mockImplementationOnce(() => {
        throw mockError;
      });
      service.createClusterClient(mockClientMetadata, mockClusterDatabaseWithTlsAuth, {})
        .then(fail)
        .catch(checkError(done));
    });
  });

  describe('createSentinelClient', () => {
    it('should successfully create sentinel client', (done) => {
      service.createSentinelClient(mockClientMetadata, mockDatabaseWithTlsAuth, { useRetry: true })
        .then((client) => {
          expect(client).toBeInstanceOf(SentinelIoredisClient);
          expect(client.clientMetadata).toEqual(mockClientMetadata);
          expect(client['client']).toEqual(mockIoredisNativeClient);
          done();
        });

      process.nextTick(() => mockIoredisNativeClient.emit('ready'));
    });
    it('should fail to create sentinel connection due to "error" event', (done) => {
      service.createSentinelClient(mockClientMetadata, mockSentinelDatabaseWithTlsAuth, {})
        .then(fail)
        .catch(checkError(done));

      process.nextTick(() => mockIoredisNativeClient.emit('error', mockError));
    });
    it('should fail to create sentinel connection due to "end" event', (done) => {
      service.createSentinelClient(mockClientMetadata, mockSentinelDatabaseWithTlsAuth, {})
        .then(fail)
        .catch((e) => {
          expect(e).toBeInstanceOf(InternalServerErrorException);
          expect(e.message).toEqual(ERROR_MESSAGES.SERVER_CLOSED_CONNECTION);
          done();
        });

      process.nextTick(() => mockIoredisNativeClient.emit('end'));
    });
    it('should handle sync error during sentinel client creation', (done) => {
      spyRedis.mockReset();
      spyRedis.mockImplementationOnce(() => {
        throw mockError;
      });

      service.createSentinelClient(mockClientMetadata, mockSentinelDatabaseWithTlsAuth, {})
        .catch(checkError(done));
    });
  });
});
