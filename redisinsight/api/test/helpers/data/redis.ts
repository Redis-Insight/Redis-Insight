import { get } from 'lodash';
import { constants } from '../constants';
import * as _ from 'lodash';

export const initDataHelper = (rte) => {
  const client = rte.client;

  const executeCommand = async (...args: string[]): Promise<any> => {
    return client.nodes ? Promise.all(client.nodes('master').map(async (node) => {
      try {
        return node.send_command(...args);
      } catch (e) {
        return null;
      }
    })) : client.send_command(args.shift(), ...args);
  };

  const executeCommandAll = async (...args: string[]): Promise<any> => {
    return client.nodes ? Promise.all(client.nodes().map(async (node) => {
      try {
        return node.send_command(...args);
      } catch (e) {
        return null;
      }
    })) : client.send_command(args.shift(), ...args);
  };

  const setAclUserRules = async (
    rules: string,
  ): Promise<any> => {
    const command = `ACL SETUSER ${constants.TEST_INSTANCE_ACL_USER} reset on ${rules} >${constants.TEST_INSTANCE_ACL_PASS}`;

    return executeCommand(...command.split(' '));
  };

  const flushTestRunData = async (node) => {
    if (!constants.TEST_RTE_SHARED_DATA) {
      return node.flushall();
    }

    // 5M count looks like "too much" but each test run should generate even less then 100 keys
    // we want to not wait for a long time when run tests on huge databases (currently ~4M keys)
    const count = constants.TEST_RTE_BIG_DATA ? 5_000_000 : 10_000;
    let cursor = null;
    let keys = [];
    while (cursor !== '0') {
      [cursor, keys] = await node.send_command('scan', [cursor, 'count', count, 'match', `${constants.TEST_RUN_ID}*`])
      if (keys.length) {
        await node.send_command('del', ...keys)
      }
    }
  }

  const truncate = async () => {
    return client.nodes ? Promise.all(client.nodes('master').map(async (node) => {
        try {
          return flushTestRunData(node);
        } catch (e) {
          return null;
        }
    })) : flushTestRunData(client);
  };

  // keys
  const generateKeys = async (clean: boolean) => {
    if (clean) {
      await truncate();
    }

    await generateStrings();
    await generateLists();
    await generateSets();
    await generateZSets();
    await generateHashes();
    await generateReJSONs();
    await generateStreams();
  };

  const insertKeysBasedOnEnv = async (pipeline, forcePipeline: boolean = false) => {
    const builtInCommand = client.getBuiltinCommands().includes(pipeline[0][0]);
    if (!forcePipeline && (!builtInCommand || rte.env.type === 'CLUSTER')) {
      for (const command of pipeline) {
        try {
          await executeCommand(...command); // todo: implement performant way to insert keys for Cluster nodes
        } catch (e) {
          if (!e.message.includes('MOVED') && !e.message.includes('ASK')) {
            throw e;
          }
        }
      }
    } else {
      await client.pipeline(pipeline).exec();
    }
  };

  const generateAnyKeys = async (types: Array<any>, number: number = 15000, clean: boolean) => {
    if (clean) {
      await truncate();
    }

    const numberPerType = Math.floor(number / types.length);

    for (let i = 0; i < types.length; i++) {
      await insertKeysBasedOnEnv(types[i].create(numberPerType));
    }
  }

  // Strings
  const generateStrings = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.set(constants.TEST_STRING_KEY_1, constants.TEST_STRING_VALUE_1);
    await client.set(constants.TEST_STRING_KEY_2, constants.TEST_STRING_VALUE_2, 'EX', constants.TEST_STRING_EXPIRE_2);
    await client.set(constants.TEST_STRING_KEY_ASCII_BUFFER, constants.TEST_STRING_KEY_ASCII_VALUE);
  };

  // List
  const generateLists = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.lpush(
      constants.TEST_LIST_KEY_1,
      constants.TEST_LIST_ELEMENT_2,
      constants.TEST_LIST_ELEMENT_1,
    );
    await client.rpush(
      constants.TEST_LIST_KEY_2,
      ...(new Array(100).fill(0)).map((item, i) => `element_${i+1}`)
    );
  };

  // Set
  const generateSets = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.sadd(constants.TEST_SET_KEY_1, constants.TEST_SET_MEMBER_1);
    await client.sadd(
      constants.TEST_SET_KEY_2,
      ...(new Array(100).fill(0)).map((item, i) => `member_${i+1}`)
    );
  };

  // ZSet
  const generateZSets = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.zadd(
      constants.TEST_ZSET_KEY_1,
      constants.TEST_ZSET_MEMBER_1_SCORE,
      constants.TEST_ZSET_MEMBER_1,
      constants.TEST_ZSET_MEMBER_2_SCORE,
      constants.TEST_ZSET_MEMBER_2,
    );

    await client.zadd(
      constants.TEST_ZSET_KEY_2,
      ...(() => {
        const toInsert = [];
        (new Array(100).fill(0)).map((item, i) => {
          toInsert.push(i + 1, `member_${i + 1}`);
        });
        return toInsert;
      })(),
    );
    await client.zadd(
      constants.TEST_ZSET_KEY_3,
      ...(() => {
        const toInsert = [];
        (new Array(3000).fill(0)).map((item, i) => {
          toInsert.push(i + 1, `member_${i + 1}`);
        });
        return toInsert;
      })(),
    );
  };

  // Hash
  const generateHashes = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.hset(
      constants.TEST_HASH_KEY_1,
      constants.TEST_HASH_FIELD_1_NAME,
      constants.TEST_HASH_FIELD_1_VALUE,
      constants.TEST_HASH_FIELD_2_NAME,
      constants.TEST_HASH_FIELD_2_VALUE,
    );
    await client.hset(
      constants.TEST_HASH_KEY_2,
      ...(() => {
        const toInsert = [];
        (new Array(3000).fill(0)).map((item, i) => {
          toInsert.push(`field_${i + 1}`, `value_${i + 1}`);
        });
        return toInsert;
      })(),
    );
  };

  // ReJSON-RL
  const generateReJSONs = async (clean: boolean = false) => {
    if (!get(rte, ['env', 'modules', 'rejson'])) {
      return;
    }

    if (clean) {
      await truncate();
    }

    await executeCommand('json.set', constants.TEST_REJSON_KEY_1, '.', JSON.stringify(constants.TEST_REJSON_VALUE_1));
    await executeCommand('json.set', constants.TEST_REJSON_KEY_2, '.', JSON.stringify(constants.TEST_REJSON_VALUE_2));
    await executeCommand('json.set', constants.TEST_REJSON_KEY_3, '.', JSON.stringify(constants.TEST_REJSON_VALUE_3));
  };

  // Streams
  const generateStreams = async (clean: boolean = false) => {
    if (clean) {
      await truncate();
    }

    await client.xadd(constants.TEST_STREAM_KEY_1, '*', constants.TEST_STREAM_FIELD_1, constants.TEST_STREAM_VALUE_1)
  };

  const generateHugeStream = async (number: number = 100000, clean: boolean) => {
    if (clean) {
      await truncate();
    }

    const batchSize = 10000;
    let inserted = 0;
    do {
      const pipeline = [];
      const limit = inserted + batchSize;
      for (inserted; inserted < limit && inserted < number; inserted++) {
        pipeline.push(['xadd', `${constants.TEST_STREAM_HUGE_KEY}`, '*', `f_${inserted}`, `v_${inserted}`]);
      }

      await insertKeysBasedOnEnv(pipeline);
    } while (inserted < number)
  };

  const generateHugeNumberOfFieldsForHashKey = async (number: number = 100000, clean: boolean) => {
    if (clean) {
      await truncate();
    }

    const batchSize = 10000;
    let inserted = 0;
    do {
      const pipeline = [];
      const limit = inserted + batchSize;
      for (inserted; inserted < limit && inserted < number; inserted++) {
        pipeline.push(['hset', constants.TEST_HASH_KEY_1, `f_${inserted}`, 'v']);
      }

      await insertKeysBasedOnEnv(pipeline, true);
    } while (inserted < number)
  };

  const generateHugeNumberOfTinyStringKeys = async (number: number = 100000, clean: boolean) => {
    if (clean) {
      await truncate();
    }

    const batchSize = 10000;
    let inserted = 0;
    do {
      const pipeline = [];
      const limit = inserted + batchSize;
      for (inserted; inserted < limit && inserted < number; inserted++) {
        pipeline.push(['set', `${constants.TEST_RUN_ID}_${inserted}`, 'v']);
      }

      await insertKeysBasedOnEnv(pipeline);
    } while (inserted < number)
  };

  const generateNKeys = async (number: number = 15000, clean: boolean) => {
    await generateAnyKeys([
      { create: n => _.map(new Array(n), (v,i) => ['set', `${constants.TEST_RUN_ID}_str_key_${i}`, `str_val_${i}`]) }, // string
      { create: n => _.map(new Array(n), (v,i) => ['lpush', `${constants.TEST_RUN_ID}_list_key_${i}`, `list_val_${i}`]) }, // list
      { create: n => _.map(new Array(n), (v,i) => ['sadd', `${constants.TEST_RUN_ID}_set_key_${i}`, `set_val_${i}`]) }, // set
      { create: n => _.map(new Array(n), (v,i) => ['zadd', `${constants.TEST_RUN_ID}_zset_key_${i}`, 0, `zset_val_${i}`]) }, // zset
      { create: n => _.map(new Array(n), (v,i) => ['hset', `${constants.TEST_RUN_ID}_hash_key_${i}`, `field`, `hash_val_${i}`]) }, // hash
    ], number, clean);
  };

  const generateNReJSONs = async (number: number = 300, clean: boolean) => {
    const jsonValue = JSON.stringify(constants.TEST_REJSON_VALUE_1);
    await generateAnyKeys([
      { create: n => _.map(new Array(n), (v,i) => ['json.set', `${constants.TEST_RUN_ID}_rejson_key_${i}`, '.', jsonValue]) },
    ], number, clean);
  };

  const generateNTimeSeries = async (number: number = 300, clean: boolean) => {
    await generateAnyKeys([
      { create: n => _.map(new Array(n), (v,i) => ['ts.create', `${constants.TEST_RUN_ID}_ts_key_${i}`, `ts_val_${i}`]) },
    ], number, clean);
  };

  const generateNStreams = async (number: number = 300, clean: boolean) => {
    await generateAnyKeys([
      { create: n => _.map(new Array(n), (v,i) => ['xadd', `${constants.TEST_RUN_ID}_st_key_${i}`, `*`, `st_field_${i}`, `st_val_${i}`]) },
    ], number, clean);
  };

  const generateNGraphs = async (number: number = 300, clean: boolean) => {
    await generateAnyKeys([
      { create: n => _.map(new Array(n), (v,i) => ['graph.query', `${constants.TEST_RUN_ID}_graph_key_${i}`, `CREATE (n_${i})`]) },
    ], number, clean);
  };

  const getClientNodes = () => {
    if (client.nodes) {
      return client.nodes();
    } else {
      return [client];
    }
  }

  return {
    executeCommand,
    executeCommandAll,
    setAclUserRules,
    truncate,
    generateKeys,
    generateHugeNumberOfFieldsForHashKey,
    generateHugeNumberOfTinyStringKeys,
    generateHugeStream,
    generateNKeys,
    generateNReJSONs,
    generateNTimeSeries,
    generateNStreams,
    generateNGraphs,
    getClientNodes,
  }
}
