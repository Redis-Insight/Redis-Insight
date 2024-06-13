import { join, posix } from 'path';
import * as os from 'os';
import { trim } from 'lodash';
import { version } from '../package.json';

const homedir = join(__dirname, '..');

const buildInfoFileName = 'build.json';
const dataZipFileName = 'data.zip';

const staticDir = process.env.RI_BUILD_TYPE === 'ELECTRON' && process['resourcesPath']
  ? join(process['resourcesPath'], 'static')
  : join(__dirname, '..', 'static');

const defaultsDir = process.env.RI_BUILD_TYPE === 'ELECTRON' && process['resourcesPath']
  ? join(process['resourcesPath'], 'defaults')
  : join(__dirname, '..', 'defaults');

const proxyPath = trim(process.env.RI_PROXY_PATH, '/');

const customPluginsUri = posix.join('/', proxyPath, 'plugins');
const staticUri = posix.join('/', proxyPath, 'static');
const tutorialsUri = posix.join('/', proxyPath, 'static', 'tutorials');
const customTutorialsUri = posix.join('/', proxyPath, 'static', 'custom-tutorials');
const contentUri = posix.join('/', proxyPath, 'static', 'content');
const defaultPluginsUri = posix.join('/', proxyPath, 'static', 'plugins');
const pluginsAssetsUri = posix.join('/', proxyPath, 'static', 'resources', 'plugins');

const socketPath = posix.join('/', proxyPath, 'socket.io');
const dataDir = process.env.RI_BUILD_TYPE === 'ELECTRON' && process['resourcesPath']
  ? join(process['resourcesPath'], 'data')
  : join(__dirname, '..', 'data');

export default {
  dir_path: {
    tmpDir: os.tmpdir(),
    homedir,
    prevHomedir: homedir,
    dataDir: process.env.RI_DATA_DIR || dataDir,
    staticDir,
    defaultsDir,
    logs: join(homedir, 'logs'),
    customConfig: join(homedir, 'config.json'),
    defaultPlugins: join(staticDir, 'plugins'),
    customPlugins: join(homedir, 'plugins'),
    customTutorials: join(homedir, 'custom-tutorials'),
    pluginsAssets: join(staticDir, 'resources', 'plugins'),
    commands: join(homedir, 'commands'),
    defaultCommandsDir: join(defaultsDir, 'commands'),
    tutorials: process.env.RI_TUTORIALS_PATH || join(homedir, 'tutorials'),
    defaultTutorials: join(defaultsDir, 'tutorials'),
    content: process.env.RI_CONTENT_PATH || join(homedir, 'content'),
    defaultContent: join(defaultsDir, 'content'),
    caCertificates: join(homedir, 'ca_certificates'),
    clientCertificates: join(homedir, 'client_certificates'),
  },
  server: {
    version,
    env: process.env.NODE_ENV || 'development',
    host: process.env.RI_APP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.RI_APP_PORT, 10) || 5540,
    docPrefix: 'api/docs',
    globalPrefix: 'api',
    customPluginsUri,
    staticUri,
    tutorialsUri,
    customTutorialsUri,
    contentUri,
    defaultPluginsUri,
    pluginsAssetsUri,
    base: process.env.RI_BASE || '/',
    proxyPath,
    secretStoragePassword: process.env.RI_SECRET_STORAGE_PASSWORD,
    encryptionKey: process.env.RI_ENCRYPTION_KEY,
    tlsCert: process.env.RI_SERVER_TLS_CERT,
    tlsKey: process.env.RI_SERVER_TLS_KEY,
    staticContent: !!process.env.RI_SERVE_STATICS || true,
    buildType: process.env.RI_BUILD_TYPE || 'DOCKER_ON_PREMISE',
    appVersion: process.env.RI_APP_VERSION || '2.50.0',
    requestTimeout: parseInt(process.env.RI_REQUEST_TIMEOUT, 10) || 25000,
    excludeRoutes: [],
    excludeAuthRoutes: [],
  },
  sockets: {
    cors: process.env.RI_SOCKETS_CORS ? process.env.RI_SOCKETS_CORS === 'true' : false,
    serveClient: process.env.RI_SOCKETS_SERVE_CLIENT ? process.env.RI_SOCKETS_SERVE_CLIENT === 'true' : false,
    path: socketPath,
  },
  db: {
    database: join(homedir, 'redisinsight.db'),
    synchronize: process.env.RI_DB_SYNC ? process.env.RI_DB_SYNC === 'true' : false,
    migrationsRun: process.env.RI_DB_MIGRATIONS ? process.env.RI_DB_MIGRATIONS === 'true' : true,
  },
  redis_clients: {
    forceStrategy: process.env.RI_REDIS_CLIENTS_FORCE_STRATEGY,
    idleThreshold: parseInt(process.env.RI_REDIS_CLIENTS_IDLE_THRESHOLD, 10) || 1000 * 60 * 60, // 1h
    syncInterval: parseInt(process.env.RI_REDIS_CLIENTS_SYNC_INTERVAL, 10) || 1000 * 60, // 1m
    idleSyncInterval: parseInt(process.env.RI_CLIENTS_IDLE_SYNC_INTERVAL, 10) || 1000 * 60 * 60, // 1hr
    maxIdleThreshold: parseInt(process.env.RI_CLIENTS_MAX_IDLE_THRESHOLD, 10) || 1000 * 60 * 60, // 1hr
    retryTimes: parseInt(process.env.RI_CLIENTS_RETRY_TIMES, 10) || 3,
    retryDelay: parseInt(process.env.RI_CLIENTS_RETRY_DELAY, 10) || 500,
    maxRetriesPerRequest: parseInt(process.env.RI_CLIENTS_MAX_RETRIES_PER_REQUEST, 10) || 1,
  },
  redis_scan: {
    countDefault: parseInt(process.env.RI_SCAN_COUNT_DEFAULT, 10) || 200,
    countThreshold: parseInt(process.env.RI_SCAN_COUNT_THRESHOLD, 10) || 10000,
    countThresholdMax: parseInt(process.env.RI_SCAN_COUNT_THRESHOLD_MAX, 10) || Number.MAX_VALUE,
  },
  modules: {
    json: {
      sizeThreshold: parseInt(process.env.RI_JSON_SIZE_THRESHOLD, 10) || 1024,
    },
  },
  redis_cli: {
    unsupportedCommands: JSON.parse(process.env.RI_CLI_UNSUPPORTED_COMMANDS || '[]'),
  },
  profiler: {
    logFileIdleThreshold: parseInt(process.env.RI_PROFILER_LOG_FILE_IDLE_THRESHOLD, 10) || 1000 * 60, // 1min
  },
  analytics: {
    writeKey: process.env.RI_SEGMENT_WRITE_KEY || 'SOURCE_WRITE_KEY',
    flushInterval: parseInt(process.env.RI_ANALYTICS_FLUSH_INTERVAL, 10) || 3000,
  },
  logger: {
    logLevel: process.env.RI_LOG_LEVEL || 'info', // log level
    stdout: process.env.RI_STDOUT_LOGGER ? process.env.RI_STDOUT_LOGGER === 'true' : false, // disabled by default
    files: process.env.RI_FILES_LOGGER ? process.env.RI_FILES_LOGGER === 'true' : true, // enabled by default
    omitSensitiveData: process.env.RI_LOGGER_OMIT_DATA ? process.env.RI_LOGGER_OMIT_DATA === 'true' : true,
    pipelineSummaryLimit: parseInt(process.env.RI_LOGGER_PIPELINE_SUMMARY_LIMIT, 10) || 5,
  },
  plugins: {
    stateMaxSize: parseInt(process.env.RI_PLUGIN_STATE_MAX_SIZE, 10) || 1024 * 1024,
  },
  tutorials: {
    updateUrl: process.env.RI_TUTORIALS_UPDATE_URL
      || 'https://github.com/RedisInsight/Tutorials/releases/download/2.42',
    zip: process.env.RI_TUTORIALS_ZIP || dataZipFileName,
    buildInfo: process.env.RI_TUTORIALS_INFO || buildInfoFileName,
    devMode: !!process.env.RI_TUTORIALS_PATH,
  },
  content: {
    updateUrl: process.env.RI_CONTENT_UPDATE_URL
      || 'https://github.com/RedisInsight/Statics/releases/download/2.42',
    zip: process.env.RI_CONTENT_ZIP || dataZipFileName,
    buildInfo: process.env.RI_CONTENT_INFO || buildInfoFileName,
    devMode: !!process.env.RI_CONTENT_PATH,
  },
  notifications: {
    updateUrl: process.env.RI_NOTIFICATION_DEV_PATH
      || process.env.RI_NOTIFICATION_UPDATE_URL
      || 'https://github.com/RedisInsight/Notifications/releases/download/latest/notifications.json',
    syncInterval: parseInt(process.env.RI_NOTIFICATION_SYNC_INTERVAL, 10) || 60 * 60 * 1000,
    queryLimit: parseInt(process.env.RI_NOTIFICATION_QUERY_LIMIT, 10) || 20,
    devMode: !!process.env.RI_NOTIFICATION_DEV_PATH,
  },
  workbench: {
    maxResultSize: parseInt(process.env.RI_COMMAND_EXECUTION_MAX_RESULT_SIZE, 10) || 1024 * 1024,
    maxItemsPerDb: parseInt(process.env.RI_COMMAND_EXECUTION_MAX_ITEMS_PER_DB, 10) || 30,
    unsupportedCommands: JSON.parse(process.env.RI_WORKBENCH_UNSUPPORTED_COMMANDS || '[]'),
    countBatch: parseInt(process.env.RI_WORKBENCH_BATCH_SIZE, 10) || 5,
  },
  database_analysis: {
    maxItemsPerDb: parseInt(process.env.RI_DATABASE_ANALYSIS_MAX_ITEMS_PER_DB, 10) || 5,
  },
  browser_history: {
    maxItemsPerModeInDb: parseInt(process.env.RI_BROWSER_HISTORY_MAX_ITEMS_PER_MODE_IN_DB, 10) || 10,
  },
  commands: [
    {
      name: 'main',
      url: process.env.RI_COMMANDS_MAIN_URL
        || 'https://raw.githubusercontent.com/redis/redis-doc/master/commands.json',
    },
    {
      name: 'redisearch',
      url: process.env.RI_COMMANDS_REDISEARCH_URL
        || 'https://raw.githubusercontent.com/RediSearch/RediSearch/master/commands.json',
    },
    {
      name: 'redisjson',
      url: process.env.RI_COMMANDS_REDIJSON_URL
        || 'https://raw.githubusercontent.com/RedisJSON/RedisJSON/master/commands.json',
    },
    {
      name: 'redistimeseries',
      url: process.env.RI_COMMANDS_REDISTIMESERIES_URL
        || 'https://raw.githubusercontent.com/RedisTimeSeries/RedisTimeSeries/master/commands.json',
    },
    {
      name: 'redisai',
      url: process.env.RI_COMMANDS_REDISAI_URL
        || 'https://raw.githubusercontent.com/RedisAI/RedisAI/master/commands.json',
    },
    {
      name: 'redisgraph',
      url: process.env.RI_COMMANDS_REDISGRAPH_URL
        || 'https://raw.githubusercontent.com/RedisGraph/RedisGraph/master/commands.json',
    },
    {
      name: 'redisgears',
      url: process.env.RI_COMMANDS_REDISGEARS_URL
        || 'https://raw.githubusercontent.com/RedisGears/RedisGears/v1.2.5/commands.json',
    },
    {
      name: 'redisbloom',
      url: process.env.RI_COMMANDS_REDISBLOOM_URL
        || 'https://raw.githubusercontent.com/RedisBloom/RedisBloom/master/commands.json',
    },
    {
      name: 'triggers_and_functions',
      url: process.env.RI_COMMANDS_TRIGGERS_AND_FUNCTIONS_URL
        || 'https://raw.githubusercontent.com/RedisGears/RedisGears/master/commands.json',
    },
  ],
  connections: {
    timeout: parseInt(process.env.RI_CONNECTIONS_TIMEOUT_DEFAULT, 10) || 30 * 1_000, // 30 sec
  },
  redisStack: {
    id: process.env.RI_BUILD_TYPE === 'REDIS_STACK'
      ? process.env.RI_REDIS_STACK_DATABASE_ID || 'redis-stack' : undefined,
    name: process.env.RI_REDIS_STACK_DATABASE_NAME,
    host: process.env.RI_REDIS_STACK_DATABASE_HOST,
    port: process.env.RI_REDIS_STACK_DATABASE_PORT,
  },
  features_config: {
    url: process.env.RI_FEATURES_CONFIG_URL
      // eslint-disable-next-line max-len
      || 'https://raw.githubusercontent.com/RedisInsight/RedisInsight/main/redisinsight/api/config/features-config.json',
    syncInterval: parseInt(process.env.RI_FEATURES_CONFIG_SYNC_INTERVAL, 10) || 1_000 * 60 * 60 * 24, // 24h
  },
  cloud: {
    apiUrl: process.env.RI_CLOUD_API_URL || 'https://app-sm.k8s-cloudapi.sm-qa.qa.redislabs.com/api/v1',
    apiToken: process.env.RI_CLOUD_API_TOKEN || 'token',
    capiUrl: process.env.RI_CLOUD_CAPI_URL || 'https://api-k8s-cloudapi.qa.redislabs.com/v1',
    capiKeyName: process.env.RI_CLOUD_CAPI_KEY_NAME || 'RedisInsight',
    freeSubscriptionName: process.env.RI_CLOUD_FREE_SUBSCRIPTION_NAME || 'My free subscription',
    freeDatabaseName: process.env.RI_CLOUD_FREE_DATABASE_NAME || 'Redis-Stack-in-Redis-Enterprise-Cloud',
    defaultPlanRegion: process.env.RI_CLOUD_DEFAULT_PLAN_REGION || 'eu-west-1',
    jobIterationInterval: parseInt(process.env.RI_CLOUD_JOB_ITERATION_INTERVAL, 10) || 10_000, // 10 sec
    discoveryTimeout: parseInt(process.env.RI_CLOUD_DISCOVERY_TIMEOUT, 10) || 60 * 1000, // 1 min
    databaseConnectionTimeout: parseInt(process.env.RI_CLOUD_DATABASE_CONNECTION_TIMEOUT, 10) || 30 * 1000,
    renewTokensBeforeExpire: parseInt(process.env.RI_CLOUD_DATABASE_CONNECTION_TIMEOUT, 10) || 2 * 60_000, // 2min
    idp: {
      google: {
        authorizeUrl: process.env.RI_CLOUD_IDP_GOOGLE_AUTHORIZE_URL || process.env.RI_CLOUD_IDP_AUTHORIZE_URL,
        tokenUrl: process.env.RI_CLOUD_IDP_GOOGLE_TOKEN_URL || process.env.RI_CLOUD_IDP_TOKEN_URL,
        revokeTokenUrl: process.env.RI_CLOUD_IDP_GOOGLE_REVOKE_TOKEN_URL || process.env.RI_CLOUD_IDP_REVOKE_TOKEN_URL,
        issuer: process.env.RI_CLOUD_IDP_GOOGLE_ISSUER || process.env.RI_CLOUD_IDP_ISSUER,
        clientId: process.env.RI_CLOUD_IDP_GOOGLE_CLIENT_ID || process.env.RI_CLOUD_IDP_CLIENT_ID,
        redirectUri: process.env.RI_CLOUD_IDP_GOOGLE_REDIRECT_URI || process.env.RI_CLOUD_IDP_REDIRECT_URI,
        idp: process.env.RI_CLOUD_IDP_GOOGLE_ID,
      },
      github: {
        authorizeUrl: process.env.RI_CLOUD_IDP_GH_AUTHORIZE_URL || process.env.RI_CLOUD_IDP_AUTHORIZE_URL,
        tokenUrl: process.env.RI_CLOUD_IDP_GH_TOKEN_URL || process.env.RI_CLOUD_IDP_TOKEN_URL,
        revokeTokenUrl: process.env.RI_CLOUD_IDP_GH_REVOKE_TOKEN_URL || process.env.RI_CLOUD_IDP_REVOKE_TOKEN_URL,
        issuer: process.env.RI_CLOUD_IDP_GH_ISSUER || process.env.RI_CLOUD_IDP_ISSUER,
        clientId: process.env.RI_CLOUD_IDP_GH_CLIENT_ID || process.env.RI_CLOUD_IDP_CLIENT_ID,
        redirectUri: process.env.RI_CLOUD_IDP_GH_REDIRECT_URI || process.env.RI_CLOUD_IDP_REDIRECT_URI,
        idp: process.env.RI_CLOUD_IDP_GH_ID,
      },
    },
  },
  ai: {
    convAiApiUrl: process.env.RI_AI_CONVAI_API_URL || 'https://staging.redis.io/convai/api',
    convAiToken: process.env.RI_AI_CONVAI_TOKEN,
    querySocketUrl: process.env.RI_AI_QUERY_SOCKET_URL || 'https://app-sm.k8s-cloudapi.sm-qa.qa.redislabs.com',
    querySocketPath: process.env.RI_AI_QUERY_SOCKET_PATH || '/api/v1/cloud-copilot-service/socket.io/',
    queryHistoryLimit: parseInt(process.env.RI_AI_QUERY_HISTORY_LIMIT, 10) || 20,
    queryMaxResults: parseInt(process.env.RI_AI_QUERY_MAX_RESULTS, 10) || 50,
    queryMaxNestedElements: parseInt(process.env.RI_AI_QUERY_MAX_NESTED_ELEMENTS, 10) || 25,
  },
};
