export enum KeyTypesTexts {
    Hash = 'Hash',
    List = 'List',
    Set = 'Set',
    ZSet = 'Sorted Set',
    String = 'String',
    ReJSON = 'JSON',
    Stream = 'STREAM',
    Graph = 'GRAPH',
    TimeSeries = 'TS',
}
export const keyLength = 50;

export const COMMANDS_TO_CREATE_KEY = Object.freeze({
    [KeyTypesTexts.Hash]: (key: string, field: string | number = 1, value: string | number = 1) => `HSET ${key} ${field} ${value}`,
    [KeyTypesTexts.List]: (key: string, element: string | number = 1) => `LPUSH ${key} ${element}`,
    [KeyTypesTexts.Set]: (key: string, member = 'member') => `SADD ${key} ${member}`,
    [KeyTypesTexts.ZSet]: (key: string, score = 1, member = 'member') => `ZADD ${key} ${score} ${member}`,
    [KeyTypesTexts.String]: (key: string, value = 'val') => `SET ${key} ${value}`,
    [KeyTypesTexts.ReJSON]: (key: string, json = '"val"') => `JSON.SET ${key} . '${json}'`,
    [KeyTypesTexts.Stream]: (key: string, field: string | number = 1, value: string | number = 1) => `XADD ${key} * ${field} ${value}`,
    [KeyTypesTexts.Graph]: (key: string) => `GRAPH.QUERY ${key} "CREATE ()"`,
    [KeyTypesTexts.TimeSeries]: (key: string) => `TS.CREATE ${key}`
})

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
