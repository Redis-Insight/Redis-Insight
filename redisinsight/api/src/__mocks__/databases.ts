import { Database } from 'src/modules/database/models/database';
import { mockCaCertificate, mockClientCertificate } from 'src/__mocks__/certificates';
import { SentinelMaster } from 'src/modules/redis-sentinel/models/sentinel-master';
import { Compressor, ConnectionType, DatabaseEntity } from 'src/modules/database/entities/database.entity';
import { EncryptionStrategy } from 'src/modules/encryption/models';
import { mockIORedisClient } from 'src/__mocks__/redis';
import { mockSentinelMasterDto } from 'src/__mocks__/redis-sentinel';
import { pick } from 'lodash';
import { RedisDatabaseInfoResponse } from 'src/modules/database/dto/redis-info.dto';
import { DatabaseOverview } from 'src/modules/database/models/database-overview';
import {
  mockSshOptionsBasic,
  mockSshOptionsBasicEntity,
  mockSshOptionsPrivateKey,
  mockSshOptionsPrivateKeyEntity,
} from 'src/__mocks__/ssh';
import { CloudDatabaseDetailsEntity } from 'src/modules/cloud/database/entities/cloud-database-details.entity';
import { mockCloudDatabaseDetails, mockCloudDatabaseDetailsEntity } from 'src/__mocks__/cloud-database';
import { mockRedisClientListResult } from 'src/__mocks__/database-info';

export const mockDatabaseId = 'a77b23c1-7816-4ea4-b61f-d37795a0f805-db-id';

export const mockDatabasePasswordEncrypted = 'database.password_ENCRYPTED';

export const mockDatabasePasswordPlain = 'some pass';

export const mockDatabaseSentinelMasterPasswordEncrypted = 'database.sentinelMasterPassword_ENCRYPTED';

export const mockDatabaseSentinelMasterPasswordPlain = 'some sentinel pass';

export const mockDatabase = Object.assign(new Database(), {
  id: mockDatabaseId,
  name: 'database-name',
  host: '127.0.100.1',
  port: 6379,
  connectionType: ConnectionType.STANDALONE,
  timeout: 30_000,
  new: false,
  compressor: Compressor.NONE,
  version: '7.0',
});

export const mockDatabaseModules = [
  {
    name: 'rg',
    version: 10204,
    semanticVersion: '1.2.4',
  },
  {
    name: 'bf',
    version: 20209,
    semanticVersion: '2.2.9',
  },
  {
    name: 'timeseries',
    version: 10616,
    semanticVersion: '1.6.16',
  },
  {
    name: 'search',
    version: 999999,
    semanticVersion: '99.99.99',
  },
  {
    name: 'graph',
    version: 20815,
    semanticVersion: '2.8.15',
  },
  {
    name: 'ReJSON',
    version: 20011,
    semanticVersion: '2.0.11',
  },
  {
    name: 'ai',
    version: 10205,
    semanticVersion: '1.2.5',
  },
];
export const mockDatabaseWithCloudDetails = Object.assign(new Database(), {
  ...mockDatabase,
  cloudDetails: mockCloudDatabaseDetails,
});

export const mockDatabaseEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabase,
  encryption: null,
});

export const mockDatabaseEntityWithCloudDetails = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseEntity,
  cloudDetails: Object.assign(new CloudDatabaseDetailsEntity(), {
    id: 'some-uuid',
    ...mockCloudDatabaseDetailsEntity,
  }),
});

export const mockDatabaseWithSshBasic = Object.assign(new Database(), {
  ...mockDatabase,
  ssh: true,
  sshOptions: mockSshOptionsBasic,
});

export const mockDatabaseWithSshBasicEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithSshBasic,
  encryption: null,
  sshOptions: mockSshOptionsBasicEntity,
});

export const mockDatabaseWithSshPrivateKey = Object.assign(new Database(), {
  ...mockDatabase,
  ssh: true,
  sshOptions: mockSshOptionsPrivateKey,
});

export const mockDatabaseWithSshPrivateKeyEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithSshPrivateKey,
  sshOptions: mockSshOptionsPrivateKeyEntity,
});

export const mockDatabaseWithAuth = Object.assign(new Database(), {
  ...mockDatabase,
  username: 'some username',
  password: mockDatabasePasswordPlain,
});

export const mockDatabaseWithAuthEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithAuth,
  password: mockDatabasePasswordEncrypted,
  encryption: EncryptionStrategy.KEYTAR,
});

export const mockDatabaseWithTls = Object.assign(new Database(), {
  ...mockDatabaseWithAuth,
  tls: true,
  verifyServerCert: true,
  tlsServername: 'some.local',
  caCert: mockCaCertificate,
});

export const mockDatabaseWithTlsEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithTls,
  password: mockDatabasePasswordEncrypted,
  encryption: EncryptionStrategy.KEYTAR,
  caCert: mockCaCertificate, // !not client ca entity since it managed on own repository
});

export const mockDatabaseWithTlsAuth = Object.assign(new Database(), {
  ...mockDatabaseWithTls,
  clientCert: mockClientCertificate,
});

export const mockDatabaseWithTlsAuthEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithTlsEntity,
  clientCert: mockClientCertificate, // !not client cert entity since it managed on own repository
});

export const mockSentinelMaster = Object.assign(new SentinelMaster(), {
  name: 'mymaster',
  username: 'master_group_username',
  password: mockDatabaseSentinelMasterPasswordPlain,
});

export const mockSentinelDatabaseWithTlsAuth = Object.assign(new Database(), {
  ...mockDatabaseWithTlsAuth,
  sentinelMaster: mockSentinelMaster,
  connectionType: ConnectionType.SENTINEL,
  nodes: mockSentinelMasterDto.nodes,
});

export const mockSentinelDatabaseWithTlsAuthEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithTlsAuthEntity,
  sentinelMasterName: mockSentinelMaster.name,
  sentinelMasterUsername: mockSentinelMaster.username,
  sentinelMasterPassword: mockDatabaseSentinelMasterPasswordEncrypted,
  connectionType: ConnectionType.SENTINEL,
  nodes: JSON.stringify(mockSentinelDatabaseWithTlsAuth.nodes),
});
export const mockClusterNodes = [
  {
    host: '127.0.100.1',
    port: 6379,
  },
  {
    host: '127.0.100.2',
    port: 6379,
  },
];

export const mockClusterDatabaseWithTlsAuth = Object.assign(new Database(), {
  ...mockDatabaseWithTlsAuth,
  connectionType: ConnectionType.CLUSTER,
  nodes: mockClusterNodes,
});

export const mockClusterDatabaseWithTlsAuthEntity = Object.assign(new DatabaseEntity(), {
  ...mockDatabaseWithTlsAuthEntity,
  connectionType: ConnectionType.CLUSTER,
  nodes: JSON.stringify(mockClusterNodes),
});

export const mockNewDatabase = Object.assign(new Database(), {
  ...mockDatabase,
  new: true,
});

export const mockDatabaseOverview: DatabaseOverview = {
  version: '6.2.4',
  usedMemory: 1,
  totalKeys: 2,
  totalKeysPerDb: {
    db0: 1,
  },
  connectedClients: 1,
  opsPerSecond: 1,
  networkInKbps: 1,
  networkOutKbps: 1,
  cpuUsagePercentage: null,
};

export const mockRedisServerInfoDto = {
  redis_version: '7.0.5',
  redis_mode: 'standalone',
  os: 'Linux 4.15.0-1087-gcp x86_64',
  arch_bits: '64',
  tcp_port: '11113',
  uptime_in_seconds: '1000',
};

export const mockRedisGeneralInfo: RedisDatabaseInfoResponse = {
  version: mockRedisServerInfoDto.redis_version,
  databases: 16,
  role: 'master',
  server: mockRedisServerInfoDto,
  usedMemory: 1000000,
  totalKeys: 1,
  connectedClients: 1,
  uptimeInSeconds: 1000,
  hitRatio: 1,
};

export const mockDatabaseRepository = jest.fn(() => ({
  exists: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(mockDatabase),
  create: jest.fn().mockResolvedValue(mockDatabase),
  update: jest.fn().mockResolvedValue(mockDatabase),
  delete: jest.fn(),
  list: jest.fn().mockResolvedValue([
    pick(mockDatabase, 'id', 'name'),
    pick(mockDatabase, 'id', 'name'),
  ]),
}));

export const mockDatabaseService = jest.fn(() => ({
  get: jest.fn().mockResolvedValue(mockDatabase),
  create: jest.fn().mockResolvedValue(mockDatabase),
  list: jest.fn(),
}));

export const mockDatabaseConnectionService = jest.fn(() => ({
  getOrCreateClient: jest.fn().mockResolvedValue(mockIORedisClient),
  createClient: jest.fn().mockResolvedValue(mockIORedisClient),
}));

export const mockDatabaseInfoProvider = jest.fn(() => ({
  determineDatabaseModules: jest.fn(),
  determineDatabaseServer: jest.fn(),
  determineSentinelMasterGroups: jest.fn().mockReturnValue([mockSentinelMasterDto]),
  determineClusterNodes: jest.fn().mockResolvedValue(mockClusterNodes),
  getRedisGeneralInfo: jest.fn().mockResolvedValueOnce(mockRedisGeneralInfo),
  getClientListInfo: jest.fn().mockReturnValue(mockRedisClientListResult),
}));

export const mockDatabaseOverviewProvider = jest.fn(() => ({
  getOverview: jest.fn().mockResolvedValue(mockDatabaseOverview),
}));

export const mockDatabaseFactory = jest.fn(() => ({
  createDatabaseModel: jest.fn().mockResolvedValue(mockDatabase),
  createStandaloneDatabaseModel: jest.fn().mockResolvedValue(mockDatabase),
  createClusterDatabaseModel: jest.fn().mockResolvedValue(mockClusterDatabaseWithTlsAuth),
  createSentinelDatabaseModel: jest.fn().mockResolvedValue(mockSentinelDatabaseWithTlsAuth),
}));

export const mockDatabaseAnalytics = jest.fn(() => ({
  sendInstanceListReceivedEvent: jest.fn(),
  sendConnectionFailedEvent: jest.fn(),
  sendInstanceAddedEvent: jest.fn(),
  sendInstanceAddFailedEvent: jest.fn(),
  sendInstanceEditedEvent: jest.fn(),
  sendInstanceDeletedEvent: jest.fn(),
  sendDatabaseConnectedClientListEvent: jest.fn(),
}));
