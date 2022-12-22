import { Connection, createConnection, getConnectionManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseEntity } from 'src/modules/database/entities/database.entity';
import { SettingsEntity } from 'src/modules/settings/entities/settings.entity';
import { AgreementsEntity } from 'src/modules/settings/entities/agreements.entity';
import { CommandExecutionEntity } from "src/modules/workbench/entities/command-execution.entity";
import { PluginStateEntity } from "src/modules/workbench/entities/plugin-state.entity";
import { constants } from './constants';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';

export const repositories = {
  DAtABASE: 'DatabaseEntity',
  CA_CERT_REPOSITORY: 'CaCertificateEntity',
  CLIENT_CERT_REPOSITORY: 'ClientCertificateEntity',
  AGREEMENTS: 'AgreementsEntity',
  COMMAND_EXECUTION: 'CommandExecutionEntity',
  PLUGIN_STATE: 'PluginStateEntity',
  SETTINGS: 'SettingsEntity',
  NOTIFICATION: 'NotificationEntity',
  DATABASE_ANALYSIS: 'DatabaseAnalysisEntity',
}

let localDbConnection;
const getDBConnection = async (): Promise<Connection> => {
  if (!localDbConnection) {
    const dbFile = constants.TEST_LOCAL_DB_FILE_PATH;
    localDbConnection = await createConnection({
      name: 'integrationtests',
      type: "sqlite",
      database: dbFile,
      entities: [`./../**/*.entity.ts`],
      synchronize: false,
      migrationsRun: false,
    })
      .catch(err => {
        if (err.name === "AlreadyHasActiveConnectionError") {
          return getConnectionManager().get("default");
        }
        throw err;
      });
  }

  return localDbConnection;
}

export const getRepository = async (repository: string) => {
  return (await getDBConnection()).getRepository(repository);
};

export const encryptData = (data) => {
  if (!data) {
    return null;
  }

  if (constants.TEST_ENCRYPTION_STRATEGY === 'KEYTAR') {
    let cipherKey = createHash('sha256')
      .update(constants.TEST_KEYTAR_PASSWORD, 'utf8')
      .digest();
    const cipher = createCipheriv('aes-256-cbc', cipherKey, Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  return data;
}

export const decryptData = (data) => {
  if (!data) {
    return null;
  }

  if (constants.TEST_ENCRYPTION_STRATEGY === 'KEYTAR') {
    let cipherKey = createHash('sha256')
      .update(constants.TEST_KEYTAR_PASSWORD, 'utf8')
      .digest();

    const decipher = createDecipheriv('aes-256-cbc', cipherKey, Buffer.alloc(16, 0));
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  return data;
}

export const generateNCommandExecutions = async (
  partial: Record<string, any>,
  number: number,
  truncate: boolean = false,
) => {
  const result = [];
  const rep = await getRepository(repositories.COMMAND_EXECUTION);

  if (truncate) {
    await rep.clear();
  }

  for (let i = 0; i < number; i++) {
    result.push(await rep.save({
      id: uuidv4(),
      command: encryptData('set foo bar'),
      result: encryptData(JSON.stringify([{
        status: 'success',
        response: `"OK_${i}"`,
        node: {
          host: 'localhost',
          port: 6479,
          slot: 12499
        }
      }])),
      nodeOptions: JSON.stringify({
        host: 'localhost',
        port: 6479,
        enableRedirection: true,
      }),
      role: 'ALL',
      mode: 'ASCII',
      encryption: constants.TEST_ENCRYPTION_STRATEGY,
      executionTime: Math.round(Math.random() * 10000),
      createdAt: new Date(),
      ...partial,
    }));
  }

  return result;
}

export const generateNDatabaseAnalysis = async (
  partial: Record<string, any>,
  number: number,
  truncate: boolean = false,
) => {
  const result = [];
  const rep = await getRepository(repositories.DATABASE_ANALYSIS);

  if (truncate) {
    await rep.clear();
  }

  for (let i = 0; i < number; i++) {
    result.push(await rep.save({
      id: uuidv4(),
      databaseId: uuidv4(),
      delimiter: constants.TEST_DATABASE_ANALYSIS_DELIMITER_1,
      filter: encryptData(JSON.stringify(constants.TEST_DATABASE_ANALYSIS_FILTER_1)),
      progress: encryptData(JSON.stringify(constants.TEST_DATABASE_ANALYSIS_PROGRESS_1)),
      totalKeys: encryptData(JSON.stringify(constants.TEST_DATABASE_ANALYSIS_TOTAL_KEYS_1)),
      totalMemory: encryptData(JSON.stringify(constants.TEST_DATABASE_ANALYSIS_TOTAL_MEMORY_1)),
      topKeysNsp: encryptData(JSON.stringify([
        {
          ...constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_NSP_1,
          nsp: Buffer.from(constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_NSP_1.nsp),
        },
      ])),
      topMemoryNsp: encryptData(JSON.stringify([
        {
          ...constants.TEST_DATABASE_ANALYSIS_TOP_MEMORY_NSP_1,
          nsp: Buffer.from(constants.TEST_DATABASE_ANALYSIS_TOP_MEMORY_NSP_1.nsp),
        },
      ])),
      topKeysLength: encryptData(JSON.stringify([
        {
          ...constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_1,
          name: Buffer.from(constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_1.name),
        },
      ])),
      topKeysMemory: encryptData(JSON.stringify([
        {
          ...constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_1,
          name: Buffer.from(constants.TEST_DATABASE_ANALYSIS_TOP_KEYS_1.name),
        },
      ])),
      expirationGroups: encryptData(JSON.stringify([
        constants.TEST_DATABASE_ANALYSIS_EXPIRATION_GROUP_1,
      ])),
      createdAt: new Date(),
      encryption: constants.TEST_ENCRYPTION_STRATEGY,
      ...partial,
    }));
  }

  return result;
}

export const generatePluginState = async (
  partial: Record<string, any>,
  truncate: boolean = false,
) => {
  const rep = await getRepository(repositories.PLUGIN_STATE);

  if (truncate) {
    await rep.clear();
  }

  return rep.save({
    id: uuidv4(),
    state: encryptData(JSON.stringify('some state')),
    encryption: constants.TEST_ENCRYPTION_STRATEGY,
    createdAt: new Date(),
    ...partial,
  })
}

const createCACertificate = async (certificate) => {
  const rep = await getRepository(repositories.CA_CERT_REPOSITORY);
  return rep.save(certificate);
}

const createClientCertificate = async (certificate) => {
  const rep = await getRepository(repositories.CLIENT_CERT_REPOSITORY);
  return rep.save(certificate);
}

const createTesDbInstance = async (rte, server): Promise<void> => {
  const rep = await getRepository(repositories.DAtABASE);

  const instance: any = {
    id: constants.TEST_INSTANCE_ID,
    name: constants.TEST_INSTANCE_NAME,
    host: constants.TEST_REDIS_HOST,
    port: constants.TEST_REDIS_PORT,
    username: constants.TEST_REDIS_USER,
    password: encryptData(constants.TEST_REDIS_PASSWORD),
    encryption: constants.TEST_ENCRYPTION_STRATEGY,
    tls: false,
    verifyServerCert: false,
    connectionType: rte.env.type,
  };

  if (rte.env.type === constants.CLUSTER) {
    instance.nodes = JSON.stringify(rte.env.nodes);
  }

  if (rte.env.type === constants.SENTINEL) {
    instance.nodes = JSON.stringify([{
      host: constants.TEST_REDIS_HOST,
      port: constants.TEST_REDIS_PORT,
    }]);
    instance.sentinelMasterName = constants.TEST_SENTINEL_MASTER_GROUP;
    instance.sentinelMasterUsername = constants.TEST_SENTINEL_MASTER_USER;
    instance.sentinelMasterPassword = encryptData(constants.TEST_SENTINEL_MASTER_PASS);
  }

  if (constants.TEST_REDIS_TLS_CA) {
    instance.tls = true;
    instance.verifyServerCert = true;
    instance.caCert = await createCACertificate({
      id: constants.TEST_CA_ID,
      name: constants.TEST_CA_NAME,
      encryption: constants.TEST_ENCRYPTION_STRATEGY,
      certificate: encryptData(constants.TEST_REDIS_TLS_CA),
    });

    if (constants.TEST_USER_TLS_CERT && constants.TEST_USER_TLS_CERT) {
      instance.clientCert = await createClientCertificate({
        id: constants.TEST_USER_CERT_ID,
        name: constants.TEST_USER_CERT_NAME,
        encryption: constants.TEST_ENCRYPTION_STRATEGY,
        certificate: encryptData(constants.TEST_USER_TLS_CERT),
        key: encryptData(constants.TEST_USER_TLS_KEY),
      });
    }
  }

  await rep.save(instance);
}

export const createDatabaseInstances = async () => {
  const rep = await getRepository(repositories.DAtABASE);
  const instances = [
    {
      id: constants.TEST_INSTANCE_ID_2,
      name: constants.TEST_INSTANCE_NAME_2,
      host: constants.TEST_INSTANCE_HOST_2,
      db: constants.TEST_REDIS_DB_INDEX,
    },
    {
      id: constants.TEST_INSTANCE_ID_3,
      name: constants.TEST_INSTANCE_NAME_3,
      host: constants.TEST_INSTANCE_HOST_3,
    }
  ];

  for (let instance of instances) {
    // await rep.remove(instance);
    await rep.save({
      tls: false,
      verifyServerCert: false,
      host: 'localhost',
      port: 3679,
      connectionType: 'STANDALONE',
      ...instance,
      modules: '[]',
    });
  }
}

export const createAclInstance = async (rte, server): Promise<void> => {
  const rep = await getRepository(repositories.DAtABASE);
  const instance: any = {
    id: constants.TEST_INSTANCE_ACL_ID,
    name: constants.TEST_INSTANCE_ACL_NAME,
    host: constants.TEST_REDIS_HOST,
    port: constants.TEST_REDIS_PORT,
    username: constants.TEST_INSTANCE_ACL_USER,
    password: encryptData(constants.TEST_INSTANCE_ACL_PASS),
    encryption: constants.TEST_ENCRYPTION_STRATEGY,
    tls: false,
    verifyServerCert: false,
    connectionType: rte.env.type,
  }

  if (rte.env.type === constants.CLUSTER) {
    instance.nodes = JSON.stringify(rte.env.nodes);
  }

  if (rte.env.type === constants.SENTINEL) {
    instance.nodes = JSON.stringify([{
      host: constants.TEST_REDIS_HOST,
      port: constants.TEST_REDIS_PORT,
    }]);
    instance.username = constants.TEST_REDIS_USER;
    instance.password = encryptData(constants.TEST_REDIS_PASSWORD);
    instance.sentinelMasterName = constants.TEST_SENTINEL_MASTER_GROUP;
    instance.sentinelMasterUsername = constants.TEST_INSTANCE_ACL_USER;
    instance.sentinelMasterPassword = encryptData(constants.TEST_INSTANCE_ACL_PASS);
  }

  if (constants.TEST_REDIS_TLS_CA) {
    instance.tls = true;
    instance.verifyServerCert = true;
    instance.caCert = await createCACertificate({
      id: constants.TEST_CA_ID,
      name: constants.TEST_CA_NAME,
      encryption: constants.TEST_ENCRYPTION_STRATEGY,
      certificate: encryptData(constants.TEST_REDIS_TLS_CA),
    });

    if (constants.TEST_USER_TLS_CERT && constants.TEST_USER_TLS_CERT) {
      instance.clientCert = await createClientCertificate({
        id: constants.TEST_USER_CERT_ID,
        name: constants.TEST_USER_CERT_NAME,
        certFilename: constants.TEST_USER_CERT_FILENAME,
        encryption: constants.TEST_ENCRYPTION_STRATEGY,
        certificate: encryptData(constants.TEST_USER_TLS_CERT),
        key: encryptData(constants.TEST_USER_TLS_KEY),
      });
    }
  }

  await rep.save(instance);
}

export const getInstanceByName = async (name: string) => {
  const rep = await getRepository(repositories.DAtABASE);
  return rep.findOneBy({ name });
}

export const getInstanceById = async (id: string) => {
  const rep = await getRepository(repositories.DAtABASE);
  return rep.findOneBy({ id });
}

export const applyEulaAgreement = async () => {
  const rep = await getRepository(repositories.AGREEMENTS);
  const agreements: any = await rep.findOneBy({});
  agreements.version = '1.0.0';
  agreements.data = JSON.stringify({eula: true, encryption: true});

  await rep.save(agreements);
}

export const setAgreements = async (agreements = {}) => {
  const defaultAgreements = {eula: true, encryption: true};

  const rep = await getRepository(repositories.AGREEMENTS);
  const entity: any = await rep.findOneBy({});

  entity.version = '1.0.0';
  entity.data = JSON.stringify({ ...defaultAgreements, ...agreements });

  await rep.save(entity);
}

const resetAgreements = async () => {
  const rep = await getRepository(repositories.AGREEMENTS);
  const agreements: any = await rep.findOneBy({});
  agreements.version = null;
  agreements.data = null;

  await rep.save(agreements);
}

export const initAgreements = async () => {
  const rep = await getRepository(repositories.AGREEMENTS);
  const agreements: any = await rep.findOneBy({});
  agreements.version = constants.TEST_AGREEMENTS_VERSION;
  agreements.data = JSON.stringify({
    eula: true,
    encryption: constants.TEST_ENCRYPTION_STRATEGY === 'KEYTAR',
  });

  await rep.save(agreements);
}

export const resetSettings = async () => {
  await resetAgreements();
  const rep = await getRepository(repositories.SETTINGS);
  const settings: any = await rep.findOneBy({});
  settings.data = null;

  await rep.save(settings);
}

export const initSettings = async () => {
  await initAgreements();
  const rep = await getRepository(repositories.SETTINGS);
  const settings: any = await rep.findOneBy({});
  settings.data = null;

  await rep.save(settings);
}

export const setAppSettings = async (data: object) => {
  const rep = await getRepository(repositories.SETTINGS);
  const settings: any = await rep.findOneBy({});
  settings.data = JSON.stringify({
    ...JSON.parse(settings.data),
    ...data
  });
  await rep.save(settings);
}

const truncateAll = async () => {
  await (await getRepository(repositories.DAtABASE)).clear();
  await (await getRepository(repositories.CA_CERT_REPOSITORY)).clear();
  await (await getRepository(repositories.CLIENT_CERT_REPOSITORY)).clear();
  await (await resetSettings());
}

export const initLocalDb = async (rte, server) => {
  await truncateAll();
  await createTesDbInstance(rte, server);
  await initAgreements();
  if (rte.env.acl) {
    await createAclInstance(rte, server);
  }
}

export const createNotifications = async (notifications: object[], truncate: boolean) => {
  const rep = await getRepository(repositories.NOTIFICATION);

  if(truncate) {
    await rep.createQueryBuilder().delete().execute();
  }

  await rep.insert(notifications);
}

export const createDefaultNotifications = async (truncate: boolean = false) => {
  const notifications = [
    constants.TEST_NOTIFICATION_1,
    constants.TEST_NOTIFICATION_2,
    constants.TEST_NOTIFICATION_3,
  ];

  await createNotifications(notifications, truncate);
}

export const createNotExistingNotifications = async (truncate: boolean = false) => {
  const notifications = [
    constants.TEST_NOTIFICATION_NE_1,
    constants.TEST_NOTIFICATION_NE_2,
    constants.TEST_NOTIFICATION_NE_3,
  ];

  await createNotifications(notifications, truncate);
}
