import {
  expect,
  describe,
  it,
  before,
  deps,
  Joi,
  _,
  requirements,
  validateApiCall,
  JoiRedisString,
} from '../deps';
import { initSettings } from '../../helpers/local-db';
const { server, request, constants, rte } = deps;

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).post(`/${constants.API.DATABASES}/${instanceId}/keys`);

const responseSchema = Joi.array().items(Joi.object().keys({
  total: Joi.number().integer().required(),
  scanned: Joi.number().integer().required(),
  cursor: Joi.number().integer().required(),
  host: Joi.string(),
  port: Joi.number().integer(),
  keys: Joi.array().items(Joi.object().keys({
    name: JoiRedisString.required(),
    type: Joi.string(),
    ttl: Joi.number().integer(),
    size: Joi.number(), // todo: fix size pipeline for cluster
  })).required(),
}).required()).required();

const mainCheckFn = async (testCase) => {
  it(testCase.name, async () => {
    if (testCase.before) {
      await testCase.before();
    }

    await validateApiCall({
      endpoint,
      ...testCase,
    });

    if (testCase.after) {
      await testCase.after();
    }
  });
};

const isKeyInResponse = (body, keyName) => _.find(
  body,
  nodeKeys => _.find(
    nodeKeys.keys,
    (key) => _.isEqual(key.name, keyName),
  ),
)

describe('POST /databases/:id/keys', () => {
  // todo: add query validation
  xdescribe('Validation', () => {});

  describe('Modes', () => {
    requirements('!rte.bigData');

    before(() => rte.data.generateBinKeys(true));

    [
      {
        name: 'Should return all keys in utf-8 (by default)',
        data: {
          count: 10_000,
          cursor: '0',
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(isKeyInResponse(body, constants.TEST_STRING_KEY_BIN_UTF8_1)).to.not.eq(undefined);
        }
      },
      {
        name: 'Should return all keys in utf-8',
        query: {
          encoding: 'utf8',
        },
        data: {
          count: 10_000,
          cursor: '0',
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(isKeyInResponse(body, constants.TEST_STRING_KEY_BIN_UTF8_1)).to.not.eq(undefined);
        }
      },
      {
        name: 'Should return all keys in ascii',
        query: {
          encoding: 'ascii',
        },
        data: {
          count: 10_000,
          cursor: '0',
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(isKeyInResponse(body, constants.TEST_STRING_KEY_BIN_ASCII_1)).to.not.eq(undefined);
        }
      },
      {
        name: 'Should return all keys in buffer',
        query: {
          encoding: 'buffer',
        },
        data: {
          count: 10_000,
          cursor: '0',
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(isKeyInResponse(body, constants.TEST_STRING_KEY_BIN_BUF_OBJ_1)).to.not.eq(undefined);
        }
      },
    ].map(mainCheckFn);

  });

  describe('Sandbox rte', () => {
    requirements('!rte.sharedData')
    const KEYS_NUMBER = 1500; // 300 per each base type
    before(async () => await rte.data.generateNKeys(KEYS_NUMBER, true));

    describe('Search (standalone + cluster)', () => {
      [
        {
          name: 'Should find key by exact name',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_1`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(1);
            expect(result.keys[0].name).to.eq(`${constants.TEST_RUN_ID}_str_key_1`);
          }
        },
        {
          name: 'Should not find key by exact name',
          data: {
            cursor: '0',
            match: 'not_exist_key'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(0);
          }
        },
        {
          name: 'Should prevent full scan in one request',
          data: {
            count: 100,
            cursor: '0',
            match: 'not_exist_key*',
            countThreshold: 500,
          },
          responseSchema,
          after: async () => await initSettings(),
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(500).lte((500 + 100) * result.numberOfShards);
            expect(result.keys.length).to.eql(0);
          }
        },
        {
          name: 'Should search by with * in the end',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_11*`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(11);
            result.keys.map(({ name }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_11`)).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with * in the beginning',
          data: {
            cursor: '0',
            match: '*_key_111'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(5);
            result.keys.map(({ name }) => {
              expect(name.indexOf('_key_111')).to.eql(name.length - 8);
            })
          }
        },
        {
          name: 'Should search by with * in the middle',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_*_111`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(1);
            expect(result.keys[0].name).to.eq(`${constants.TEST_RUN_ID}_str_key_111`);
          }
        },
        {
          name: 'Should search by with ? in the end',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10?`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(10);
            result.keys.map(({ name, type, ttl, size }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
              expect(type).to.be.a('string');
              expect(ttl).to.be.a('number');
              expect(size).to.be.a('number');
            })
          }
        },
        {
          name: 'Should search by with ? in the end (without keys info)',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10?`,
            keysInfo: 'false',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(10);
            result.keys.map(({ name, type, ttl, size }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
              expect(type).to.eql(undefined);
              expect(ttl).to.eql(undefined);
              expect(size).to.eql(undefined);
            })
          }
        },
        {
          name: 'Should search by with [a-b] glob pattern',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10[0-5]`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(6);
            result.keys.map(({ name }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [a,b,c] glob pattern',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10[0,1,2]`
          },
          responseSchema,
          checkFn: ({body}) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(3);
            result.keys.map(({name}) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [abc] glob pattern',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10[012]`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(3);
            result.keys.map(({ name }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [^a] glob pattern',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_str_key_10[^0]`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(9);
            result.keys.map(({ name }) => {
              expect(name.indexOf(`${constants.TEST_RUN_ID}_str_key_10`)).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with combined glob patterns',
          data: {
            cursor: '0',
            match: `${constants.TEST_RUN_ID}_s?r_*_[1][0-5][^0]`
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(54);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Standalone', () => {
      requirements('rte.type=STANDALONE');

      [
        {
          name: 'Should scan all types',
          data: {
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].total).to.eql(KEYS_NUMBER);
            expect(body[0].scanned).to.eql(200);
            expect(body[0].cursor).to.not.eql(0);
            expect(body[0].keys.length).to.gte(200);
          }
        },
        {
          name: 'Should scan by provided count value',
          data: {
            count: 500,
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(500).lte(510);
            expect(result.keys.length).to.gte(500).lte(510);
          }
        },
      ].map(mainCheckFn);

      it('Should scan entire database', async () => {
        const keys = [];
        let cursor = null;
        let scanned = 0;

        while (cursor !== 0) {
          await validateApiCall({
            endpoint,
            data: {
              cursor: cursor || 0,
              count: 99,
            },
            checkFn: ({ body }) => {
              cursor = body[0].cursor;
              scanned += body[0].scanned;
              keys.push(...body[0].keys);
            },
          });
        }

        expect(keys.length).to.be.gte(KEYS_NUMBER);
        expect(keys.length).to.be.lt(KEYS_NUMBER + 5); // redis returns each key at least once
        expect(cursor).to.eql(0);
        expect(scanned).to.be.gte(KEYS_NUMBER);
        expect(scanned).to.be.lt(KEYS_NUMBER + 99);
      });

      describe('Filter by type', () => {
        requirements('rte.version>=6.0');

        [
          {
            name: 'Should filter by type (string)',
            data: {
              cursor: '0',
              type: 'string',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('str_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('string'));
            }
          },
          {
            name: 'Should filter by type (list)',
            data: {
              cursor: '0',
              type: 'list',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('list_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('list'));
            }
          },
          {
            name: 'Should filter by type (set)',
            data: {
              cursor: '0',
              type: 'set',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('set_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('set'));
            }
          },
          {
            name: 'Should filter by type (zset)',
            data: {
              cursor: '0',
              type: 'zset',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('zset_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('zset'));
            }
          },
          {
            name: 'Should filter by type (hash)',
            data: {
              cursor: '0',
              type: 'hash',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('hash_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('hash'));
            }
          },
        ].map(mainCheckFn);

        describe('REJSON-RL', () => {
          requirements('rte.modules.rejson');
          before(async () => await rte.data.generateNReJSONs(300, false));

          [
            {
              name: 'Should filter by type (ReJSON-RL)',
              data: {
                cursor: '0',
                type: 'ReJSON-RL',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('rejson_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('ReJSON-RL'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('TSDB-TYPE', () => {
          requirements('rte.modules.timeseries');
          before(async () => await rte.data.generateNTimeSeries(300, false));

          [
            {
              name: 'Should filter by type (timeseries)',
              data: {
                cursor: '0',
                type: 'TSDB-TYPE',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('ts_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('TSDB-TYPE'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('Stream', () => {
          requirements('rte.version>=5.0');
          before(async () => await rte.data.generateNStreams(300, false));

          [
            {
              name: 'Should filter by type (stream)',
              data: {
                cursor: '0',
                type: 'stream',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('st_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('stream'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('Graph', () => {
          requirements('rte.modules.graph');
          before(async () => await rte.data.generateNGraphs(300, false));

          [
            {
              name: 'Should filter by type (stream)',
              data: {
                cursor: '0',
                type: 'graphdata',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('graph_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('graphdata'));
              }
            },
          ].map(mainCheckFn);
        });
      });
    });
    describe('Cluster', () => {
      requirements('rte.type=CLUSTER');

      [
        {
          name: 'Should scan all types',
          data: {
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
              expect(shard.scanned).to.eql(200);
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.eql(200 * result.numberOfShards);
            expect(result.keys.length).to.gte(200 * result.numberOfShards);
          }
        },
        {
          name: 'Should scan by provided count value',
          data: {
            count: 300,
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(300 * result.numberOfShards).lte(310 * result.numberOfShards);
            expect(result.keys.length).to.gte(300 * result.numberOfShards).lte(310 * result.numberOfShards);
          }
        },
      ].map(mainCheckFn);

      it('Should scan entire database', async () => {
        const keys = [];
        let scanned = 0;
        let cursor = ['0'];
        while (cursor.length > 0) {
          await validateApiCall({
            endpoint,
            data: {
              cursor: cursor.join('||'),
              count: 99,
            },
            checkFn: ({ body }) => {
              cursor = [];
              body.map(shard => {
                if (shard.cursor !== 0) {
                  cursor.push(`${shard.host}:${shard.port}@${shard.cursor}`);
                }
                scanned += shard.scanned;
                keys.push(...shard.keys);
              });
            },
          });
        }

        expect(keys.length).to.be.gte(KEYS_NUMBER);
        expect(cursor).to.eql([]);
        expect(scanned).to.be.gte(KEYS_NUMBER);
      });

      describe('Filter by type', () => {
        requirements('rte.version>=6.0');
        [
          {
            name: 'Should filter by type (string)',
            data: {
              cursor: '0',
              type: 'string',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              const result = {
                total: 0,
                scanned: 0,
                keys: [],
                numberOfShards: 0,
              };

              body.map(shard => {
                result.total += shard.total;
                result.scanned += shard.scanned;
                result.keys.push(...shard.keys);
                result.numberOfShards++;
                expect(shard.scanned).to.gte(200);
                expect(shard.scanned).to.lte(KEYS_NUMBER);
              });
              expect(result.total).to.eql(KEYS_NUMBER);
              expect(result.scanned).to.gte(200 * result.numberOfShards);
              expect(result.keys.length).to.gte(200);
              result.keys.map(key => {
                expect(key.name).to.have.string('str_key_');
                expect(key.type).to.eql('string');
                expect(key.size).to.be.a('number');
                expect(key.ttl).to.be.a('number');
              });
            }
          },
        ].map(mainCheckFn);
      });
      describe('Filter by type (w/o keys info, with sended type)', () => {
        requirements('rte.version>=6.0');
        [
          {
            name: 'Should filter by type (string)',
            data: {
              cursor: '0',
              type: 'string',
              count: 200,
              keysInfo: false,
            },
            responseSchema,
            checkFn: ({ body }) => {
              const result = {
                total: 0,
                scanned: 0,
                keys: [],
                numberOfShards: 0,
              };

              body.map(shard => {
                result.total += shard.total;
                result.scanned += shard.scanned;
                result.keys.push(...shard.keys);
                result.numberOfShards++;
                expect(shard.scanned).to.gte(200);
                expect(shard.scanned).to.lte(KEYS_NUMBER);
              });
              expect(result.total).to.eql(KEYS_NUMBER);
              expect(result.scanned).to.gte(200 * result.numberOfShards);
              expect(result.keys.length).to.gte(200);
              result.keys.map(key => {
                expect(key.name).to.have.string('str_key_');
                expect(key.ttl).to.eq(undefined);
                expect(key.size).to.eq(undefined);
                expect(key.type).to.eq('string');
              });
            }
          },
        ].map(mainCheckFn);
      });
    });
    describe('non-ASCII keyName', () => {
      before(async () => await rte.data.generateKeys(true));

      [
        {
          name: 'check keyname with non-ASCII symbols should be properly listed',
          data: {
            cursor: '0',
            count: 200,
          },
          responseSchema,
          checkFn: async ({ body }) => {
            const [stringNonASCIIKey] = _.filter(body.map(
              nodeResult => nodeResult.keys.find((key) => key.name === constants.TEST_STRING_KEY_ASCII_UNICODE),
            ), array => !!array);

            expect(stringNonASCIIKey.name).to.eq(constants.TEST_STRING_KEY_ASCII_UNICODE)
            expect(stringNonASCIIKey.type).to.eq(constants.TEST_STRING_TYPE)
            expect(stringNonASCIIKey.ttl).to.eq(-1)
            expect(stringNonASCIIKey.size).to.gt(constants.TEST_STRING_KEY_ASCII_BUFFER.length)
          }
        },
      ].map(mainCheckFn);
    });
  });
  describe('Big data', () => {
    describe('Exact search on huge keys number', () => {
      requirements('rte.bigData');
      // keys inside existing data (~3.6M) but we will check for at least 10M to have a possibility to change
      // keys number at some point
      const NUMBER_OF_KEYS = 3_000_000;
      const key = 'user:15001:string';

      [
        {
          name: 'Should scan all types',
          data: {
            cursor: '0',
            match: key
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].total).to.gte(NUMBER_OF_KEYS);
            expect(body[0].scanned).to.gte(NUMBER_OF_KEYS);
            expect(body[0].cursor).to.eql(0);
            expect(body[0].keys.length).to.eql(1);
            expect(body[0].keys[0].name).to.eql(key);
          }
        },
      ].map(mainCheckFn);
    });
  });
  describe('ACL', () => {
    requirements('rte.acl');
    before(async () => await rte.data.generateKeys(true));
    before(async () => rte.data.setAclUserRules('~* +@all'));

    [
      {
        name: 'Should remove key',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          cursor: '0',
        },
        statusCode: 200,
      },
      {
        name: 'Should throw error if no permissions for "scan" command',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          cursor: '0',
        },
        statusCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
        },
        before: () => rte.data.setAclUserRules('~* +@all -scan')
      },
    ].map(mainCheckFn);
  });
});
