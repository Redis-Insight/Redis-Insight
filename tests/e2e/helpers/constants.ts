export enum KeyTypesTexts {
    Hash = 'Hash',
    List = 'List',
    Set = 'Set',
    ZSet = 'Sorted Set',
    String = 'String',
    ReJSON = 'JSON',
    Stream = 'Stream',
    Graph = 'Graph',
    TimeSeries = 'TS',
}
export const keyLength = 50;

export const COMMANDS_TO_CREATE_KEY = Object.freeze({
    [KeyTypesTexts.Hash]: (key: string, value: string | number = 'value', field: string | number = 'field') => `HSET ${key} '${field}' '${value}'`,
    [KeyTypesTexts.List]: (key: string, element: string | number = 'element') => `LPUSH ${key} '${element}'`,
    [KeyTypesTexts.Set]: (key: string, member = 'member') => `SADD ${key} '${member}'`,
    [KeyTypesTexts.ZSet]: (key: string, member = 'member', score = 1) => `ZADD ${key} ${score} '${member}'`,
    [KeyTypesTexts.String]: (key: string, value = 'val') => `SET ${key} '${value}'`,
    [KeyTypesTexts.ReJSON]: (key: string, json = '"val"') => `JSON.SET ${key} . '${json}'`,
    [KeyTypesTexts.Stream]: (key: string, value: string | number = 'value', field: string | number = 'field') => `XADD ${key} * '${field}' '${value}'`,
    [KeyTypesTexts.Graph]: (key: string) => `GRAPH.QUERY ${key} "CREATE ()"`,
    [KeyTypesTexts.TimeSeries]: (key: string) => `TS.CREATE ${key}`
});

export enum rte {
    none = 'none',
    standalone = 'standalone',
    sentinel = 'sentinel',
    ossCluster = 'oss-cluster',
    reCluster = 're-cluster',
    reCloud = 're-cloud'
}

export enum env {
    web = 'web',
    desktop = 'desktop'
}

export enum RecommendationIds {
    redisVersion = 'redisVersion',
    searchVisualization = 'searchVisualization',
    setPassword = 'setPassword',
    optimizeTimeSeries = 'RTS',
    luaScript = 'luaScript',
    useSmallerKeys = 'useSmallerKeys',
    avoidLogicalDatabases = 'avoidLogicalDatabases',
    searchJson = 'searchJSON',
    rdi = 'tryRDI'
}

export enum LibrariesSections {
    Functions = 'Functions',
    KeyspaceTriggers = 'Keyspace',
    ClusterFunctions = 'Cluster',
    StreamFunctions= 'Stream',
}

export enum FunctionsSections {
    General = 'General',
    Flag = 'Flag',
}

export enum MonacoEditorInputs {
    //add library fields
    Code = 'code-value',
    Configuration = 'configuration-value',
    // added library fields
    Library = 'library-code',
    LibraryConfiguration = 'library-configuration',
}

export enum ResourcePath {
    Databases = '/databases',
    RedisSentinel = '/redis-sentinel',
    ClusterDetails = '/cluster-details',
    SyncFeatures = '/features/sync',
    Rdi = '/rdi'
}

export enum ExploreTabs {
    Tutorials  = 'Tutorials',
    Tips = 'Tips',
}

export enum KeysInteractionTabs {
    BrowserAndFilter  = 'Browser and filter',
    SearchAndQuery = 'Search and query',
    Workbench = 'Workbench'
}

export enum Compatibility {
    SearchAndQuery  = 'search',
    Json = 'json',
    TimeSeries = 'time-series'
}

export enum ChatBotTabs {
    General  = 'General',
    Database = 'Database',
}

export enum RedisOverviewPage {
    DataBase  = 'Redis Databases',
    Rdi = 'My RDI instances',
}

export enum TextConnectionSection {
    Success  = 'success',
    Failed = 'failed',
}

export enum RdiTemplatePipelineType {
    Ingest  = 'ingest',
    WriteBehind = 'write-behind',
}

export enum RdiTemplateDatabaseType  {
    SqlServer  = 'sql',
    Oracle = 'oracle',
    MySql = 'mysql',
}

export enum RdiPopoverOptions  {
    Server  = 'server',
    File = 'file',
    Pipeline = 'empty',
}

