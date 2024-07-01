export enum BrowserToolKeysCommands {
  Scan = 'scan',
  Ttl = 'ttl',
  Type = 'type',
  Exists = 'exists',
  Expire = 'expire',
  Persist = 'persist',
  Del = 'del',
  Rename = 'rename',
  RenameNX = 'renamenx',
  MemoryUsage = 'memory usage',
}

export enum BrowserToolStringCommands {
  Set = 'set',
  Get = 'get',
  Getrange = 'getrange',
  StrLen = 'strlen',
}

export enum BrowserToolHashCommands {
  HSet = 'hset',
  HGetAll = 'hgetall',
  HGETALL = 'HGETALL',
  HGet = 'hget',
  HLen = 'hlen',
  HScan = 'hscan',
  HDel = 'hdel',
  HExpire = 'hexpire',
  HPersist = 'hpersist',
  HTtl = 'httl',
}

export enum BrowserToolListCommands {
  LLen = 'llen',
  Lrange = 'lrange',
  LSet = 'lset',
  LPush = 'lpush',
  LPop = 'lpop',
  RPush = 'rpush',
  RPushX = 'rpushx',
  LPushX = 'lpushx',
  RPop = 'rpop',
  LIndex = 'lindex',
}

export enum BrowserToolSetCommands {
  SScan = 'sscan',
  SAdd = 'sadd',
  SCard = 'scard',
  SRem = 'srem',
  SIsMember = 'sismember',
}

export enum BrowserToolZSetCommands {
  ZCard = 'zcard',
  ZScan = 'zscan',
  ZRange = 'zrange',
  ZRevRange = 'zrevrange',
  ZAdd = 'zadd',
  ZRem = 'zrem',
  ZScore = 'zscore',
}

export enum BrowserToolRejsonRlCommands {
  JsonDel = 'json.del',
  JsonSet = 'json.set',
  JsonGet = 'json.get',
  JsonType = 'json.type',
  JsonObjKeys = 'json.objkeys',
  JsonObjLen = 'json.objlen',
  JsonArrLen = 'json.arrlen',
  JsonStrLen = 'json.strlen',
  JsonArrAppend = 'json.arrappend',
  JsonDebug = 'json.debug',
}

export enum BrowserToolGraphCommands {
  GraphQuery = 'graph.query',
}
export enum BrowserToolStreamCommands {
  XLen = 'xlen',
  XInfoStream = 'xinfo stream',
  XRange = 'xrange',
  XRevRange = 'xrevrange',
  XAdd = 'xadd',
  XDel = 'xdel',
  XInfoGroups = 'xinfo groups',
  XInfoConsumers = 'xinfo consumers',
  XPending = 'xpending',
  XAck = 'xack',
  XClaim = 'xclaim',
  XGroupCreate = 'xgroup create',
  XGroupSetId = 'xgroup setid',
  XGroupDestroy = 'xgroup destroy',
  XGroupDelConsumer = 'xgroup delconsumer',
}

export enum BrowserToolTSCommands {
  TSInfo = 'ts.info',
}

export type BrowserToolCommands =
  | BrowserToolKeysCommands
  | BrowserToolStringCommands
  | BrowserToolSetCommands
  | BrowserToolListCommands
  | BrowserToolHashCommands
  | BrowserToolZSetCommands
  | BrowserToolRejsonRlCommands
  | BrowserToolStreamCommands
  | BrowserToolGraphCommands
  | BrowserToolTSCommands;
