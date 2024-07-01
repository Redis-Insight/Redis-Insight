import {
  expect,
  describe,
  it,
  before,
  Joi,
  _,
  deps,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  validateApiCall,
  requirements, serverConfig
} from '../deps';
import { ServerService } from 'src/modules/server/server.service';
import { convertArrayReplyToObject } from 'src/modules/redis/utils';
const { server, request, constants, rte, analytics } = deps;

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID, uuid = constants.TEST_CLI_UUID_1) =>
  request(server).post(`/${constants.API.DATABASES}/${instanceId}/cli/${uuid}/send-command`);

// input data schema
const dataSchema = Joi.object({
  command: Joi.string().required().messages({
    'any.required': '{#label} should not be empty',
  }),
  outputFormat: Joi.string().allow(null).valid('TEXT', 'RAW'),
}).strict();

const validInputData = {
  command: 'set foo bar',
};

const responseSchema = Joi.object().keys({
  response: Joi.string().required(),
  status: Joi.string().required(),
}).required();

const responseRawSchema = Joi.object().keys({
  response: Joi.any().required(),
  status: Joi.string().required(),
}).required();

const mainCheckFn = async (testCase) => {
  it(testCase.name, async () => {
    // additional checks before test run
    if (testCase.before) {
      await testCase.before();
    }

    await validateApiCall({
      endpoint,
      ...testCase,
    });

    // additional checks after test pass
    if (testCase.after) {
      await testCase.after();
    }
  });
};

describe('POST /databases/:instanceId/cli/:uuid/send-command', () => {
  requirements('rte.type=STANDALONE');


  before(rte.data.truncate);
  // Create Redis client for CLI
  beforeEach(async () => await request(server).patch(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`))

  describe('Validation', () => {
    generateInvalidDataTestCases(dataSchema, validInputData).map(
      validateInvalidDataTestCase(endpoint, dataSchema),
    );
  });

  describe('Common', () => {
    describe('Analytics', () => {
      requirements('rte.serverType=local');
      const key = constants.getRandomString();
      [
        {
          name: 'Should create string and send analytics event for it',
          data: {
            command: `set ${key} ${constants.TEST_STRING_VALUE_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(key)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.get(key)).to.eql(constants.TEST_STRING_VALUE_1);
            await analytics.waitForEvent({
              event: 'CLI_COMMAND_EXECUTED',
              properties: {
                databaseId: constants.TEST_INSTANCE_ID,
                commandType: 'core',
                moduleName: 'n/a',
                capability: 'string',
                command: 'SET',
                outputFormat: 'TEXT',
                buildType: ServerService.getAppType(serverConfig.get('server').buildType),
              },
            });
          }
        },
      ].map(mainCheckFn);
    });
    describe('String', () => {
      [
        {
          name: 'Should create string',
          data: {
            command: `set ${constants.TEST_STRING_KEY_1} ${constants.TEST_STRING_VALUE_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_STRING_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.get(constants.TEST_STRING_KEY_1)).to.eql(constants.TEST_STRING_VALUE_1);
          }
        },
        {
          name: 'Should get string',
          data: {
            command: `get ${constants.TEST_STRING_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(constants.TEST_STRING_VALUE_1)
          }
        },
        {
          name: 'Should remove string',
          data: {
            command: `del ${constants.TEST_STRING_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_STRING_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('List', () => {
      [
        {
          name: 'Should create list',
          data: {
            command: `lpush ${constants.TEST_LIST_KEY_1} ${constants.TEST_LIST_ELEMENT_1} ${constants.TEST_LIST_ELEMENT_2}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_LIST_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.lrange(constants.TEST_LIST_KEY_1, 0, 100)).to.eql([
              constants.TEST_LIST_ELEMENT_2,
              constants.TEST_LIST_ELEMENT_1,
            ]);
          }
        },
        {
          name: 'Should get list',
          data: {
            command: `lrange ${constants.TEST_LIST_KEY_1} 0 100`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "${constants.TEST_LIST_ELEMENT_2}"`);
            expect(body.response).to.have.string(`2) "${constants.TEST_LIST_ELEMENT_1}"`);
          }
        },
        {
          name: 'Should remove list',
          data: {
            command: `del ${constants.TEST_LIST_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_LIST_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Set', () => {
      [
        {
          name: 'Should create set',
          data: {
            command: `sadd ${constants.TEST_SET_KEY_1} ${constants.TEST_SET_MEMBER_1} ${constants.TEST_SET_MEMBER_2}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_SET_KEY_1)).to.eql(0);
          },
          after: async () => {
            const [cursor, set] = await rte.client.sscan(constants.TEST_SET_KEY_1, 0);
            expect(cursor).to.eql('0');
            expect(set.length).to.eql(2);
            expect(set.join()).to.include(constants.TEST_SET_MEMBER_1);
            expect(set.join()).to.include(constants.TEST_SET_MEMBER_2);
          },
        },
        {
          name: 'Should get set',
          data: {
            command: `sscan ${constants.TEST_SET_KEY_1} 0 count 100`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(constants.TEST_SET_MEMBER_2);
            expect(body.response).to.have.string(constants.TEST_SET_MEMBER_1);
          }
        },
        {
          name: 'Should remove list',
          data: {
            command: `del ${constants.TEST_SET_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_SET_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('ZSet', () => {
      [
        {
          name: 'Should create zset',
          data: {
            command: `zadd ${constants.TEST_ZSET_KEY_1} 1 ${constants.TEST_ZSET_MEMBER_1} 2 ${constants.TEST_ZSET_MEMBER_2}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_ZSET_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.zrange(constants.TEST_ZSET_KEY_1, 0, 100)).to.deep.eql([
              constants.TEST_ZSET_MEMBER_1,
              constants.TEST_ZSET_MEMBER_2,
            ]);
          },
        },
        {
          name: 'Should get zset',
          data: {
            command: `zrange ${constants.TEST_ZSET_KEY_1} 0 100`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "${constants.TEST_ZSET_MEMBER_1}"`);
            expect(body.response).to.have.string(`2) "${constants.TEST_ZSET_MEMBER_2}"`);
          }
        },
        {
          name: 'Should remove zset',
          data: {
            command: `del ${constants.TEST_ZSET_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_ZSET_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Hash', () => {
      [
        {
          name: 'Should create hash',
          data: {
            command: `hset ${constants.TEST_HASH_KEY_1} ${constants.TEST_HASH_FIELD_1_NAME} ${constants.TEST_HASH_FIELD_1_VALUE}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_HASH_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_1))).to.deep.eql({
              [constants.TEST_HASH_FIELD_1_NAME]: constants.TEST_HASH_FIELD_1_VALUE,
            });
          },
        },
        {
          name: 'Should get hash',
          data: {
            command: `hgetall ${constants.TEST_HASH_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "${constants.TEST_HASH_FIELD_1_NAME}"`);
            expect(body.response).to.have.string(`2) "${constants.TEST_HASH_FIELD_1_VALUE}"`);
          }
        },
        {
          name: 'Should remove hash',
          data: {
            command: `del ${constants.TEST_HASH_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_HASH_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('ReJSON-RL', () => {
      requirements('rte.modules.rejson');
      [
        {
          name: 'Should create json',
          data: {
            command: `json.set ${constants.TEST_REJSON_KEY_1} . "{\\"field\\":\\"value\\"}"`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_REJSON_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.data.executeCommand('json.get', constants.TEST_REJSON_KEY_1, '.')).to.eql('{"field":"value"}');
          },
        },
        {
          name: 'Should get json',
          data: {
            command: `json.get ${constants.TEST_REJSON_KEY_1} .field`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`value`);
            expect(body.response).to.have.string(`\\"`);
          }
        },
        {
          name: 'Should remove json',
          data: {
            command: `json.del ${constants.TEST_REJSON_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_REJSON_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('TSDB-TYPE', () => {
      requirements('rte.modules.timeseries');
      [
        {
          name: 'Should create ts',
          data: {
            command: `ts.create ${constants.TEST_TS_KEY_1} ${constants.TEST_TS_VALUE_1} ${constants.TEST_TS_VALUE_2}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_TS_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.exists(constants.TEST_TS_KEY_1)).to.eql(1);
          },
        },
        {
          name: 'Should add to ts',
          data: {
            command: `ts.add ${constants.TEST_TS_KEY_1} ${constants.TEST_TS_TIMESTAMP_1} ${constants.TEST_TS_VALUE_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.data.executeCommand('ts.get', constants.TEST_TS_KEY_1)).to.eql([
              constants.TEST_TS_TIMESTAMP_1,
              constants.TEST_TS_VALUE_1.toString(),
            ]);
          },
        },
        {
          name: 'Should get ts',
          data: {
            command: `ts.get ${constants.TEST_TS_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`2) "10"`);
          }
        },
        {
          name: 'Should remove ts',
          data: {
            command: `del ${constants.TEST_TS_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_TS_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Graph', () => {
      requirements('rte.modules.graph');
      [
        {
          name: 'Should create graph',
          data: {
            command: `graph.query ${constants.TEST_GRAPH_KEY_1} "CREATE (n1)"`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "Nodes created: 1"`);
          },
          before: async () => {
            expect(await rte.client.exists(constants.TEST_GRAPH_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.exists(constants.TEST_GRAPH_KEY_1)).to.eql(1);
          },
        },
        {
          name: 'Should get graph',
          data: {
            command: `graph.query ${constants.TEST_GRAPH_KEY_1} "MATCH (n1) RETURN n1"`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "n1"`);
          }
        },
        {
          name: 'Should remove graph',
          data: {
            command: `del ${constants.TEST_GRAPH_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_GRAPH_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('RediSearch v2', () => {
      describe('Hash', () => {
        requirements('rte.modules.search', 'rte.modules.search.version>=20000');
        [
          {
            name: 'Should create index',
            data: {
              command: `ft.create ${constants.TEST_SEARCH_HASH_INDEX_1} ON HASH
              PREFIX 1 ${constants.TEST_SEARCH_HASH_KEY_PREFIX_1} NOOFFSETS SCHEMA title TEXT WEIGHT 5.0`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.have.string('"OK"');
            },
            before: async () => {
              expect(await rte.client.call('ft._list')).to.not.include(constants.TEST_SEARCH_HASH_INDEX_1);
            },
            after: async () => {
              expect(await rte.client.call(`ft._list`)).to.include(constants.TEST_SEARCH_HASH_INDEX_1);
            },
          },
          {
            name: 'Should return the list of all existing indexes.',
            data: {
              command: `ft._list`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.include(constants.TEST_SEARCH_HASH_INDEX_1)
            },
          },
          {
            name: 'Should return index info',
            data: {
              outputFormat: 'RAW',
              command: `ft.info ${constants.TEST_SEARCH_HASH_INDEX_1}`,
            },
            responseRawSchema,
            checkFn: ({ body }) => {
              expect(body.response[0]).to.eql('index_name');
              expect(body.response[1]).to.eql(constants.TEST_SEARCH_HASH_INDEX_1);
              expect(body.response[2]).to.eql('index_options');
              expect(body.response[3]).to.eql(['NOOFFSETS']);
              expect(body.response[4]).to.eql('index_definition');
              expect(_.take(body.response[5], 4)).to.eql( ['key_type', 'HASH', 'prefixes', [constants.TEST_SEARCH_HASH_KEY_PREFIX_1]]);
              // redisearch return attributes in the current build.
              // todo: confirm that there were breaking changes in the new redisearch release
              // expect(body.response[6]).to.eql('fields');
              // expect(body.response[7]).to.deep.include( [ 'title', 'type', 'TEXT', 'WEIGHT', '5' ]);
            },
          },
          {
            name: 'Should find documents',
            data: {
              command: `ft.search ${constants.TEST_SEARCH_HASH_INDEX_1} "hello world"`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            before: async () => {
              for (let i = 0; i < 10; i++) {
                await rte.client.hset(`${constants.TEST_SEARCH_HASH_KEY_PREFIX_1}${i}`, 'title', `hello world ${i}`)
              }
            },
            checkFn: ({ body }) => {
              expect(body.response).to.have.string(`1) 10`);
            }
          },
          {
            name: 'Should aggregate documents by uniq @title',
            data: {
              command: `ft.aggregate ${constants.TEST_SEARCH_HASH_INDEX_1} * GROUPBY 1 @title`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.have.string(`1) 10`);
            }
          },
          {
            name: 'Should remove index',
            data: {
              command: `ft.dropindex ${constants.TEST_SEARCH_HASH_INDEX_1} DD`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            after: async () => {
              expect(await rte.client.call('ft._list')).to.not.include(constants.TEST_SEARCH_HASH_INDEX_1);
            }
          },
        ].map(mainCheckFn);
      })
      describe('JSON', () => {
        requirements(
          'rte.modules.search',
          'rte.modules.rejson',
          'rte.modules.search.version>=20200',
          'rte.modules.rejson>=20000'
        );
        [
          {
            name: 'Should create index',
            data: {
              command: `ft.create ${constants.TEST_SEARCH_JSON_INDEX_1} ON JSON
              PREFIX 1 ${constants.TEST_SEARCH_JSON_KEY_PREFIX_1}
              NOOFFSETS SCHEMA $.user.name AS name TEXT`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.have.string('"OK"');
            },
            before: async () => {
              expect(await rte.client.call('ft._list')).to.not.include(constants.TEST_SEARCH_JSON_INDEX_1);
            },
            after: async () => {
              expect(await rte.client.call(`ft._list`)).to.include(constants.TEST_SEARCH_JSON_INDEX_1);
            },
          },
          {
            name: 'Should return index info',
            data: {
              outputFormat: 'RAW',
              command: `ft.info ${constants.TEST_SEARCH_JSON_INDEX_1}`,
            },
            responseRawSchema,
            checkFn: ({ body }) => {
              expect(body.response[0]).to.eql('index_name');
              expect(body.response[1]).to.eql(constants.TEST_SEARCH_JSON_INDEX_1);
              expect(body.response[2]).to.eql('index_options');
              expect(body.response[3]).to.eql(['NOOFFSETS']);
              expect(body.response[4]).to.eql('index_definition');
              expect(_.take(body.response[5], 4)).to.eql( ['key_type', 'JSON', 'prefixes', [ constants.TEST_SEARCH_JSON_KEY_PREFIX_1 ]]);
              // expect(body.response[6]).to.eql('fields');
              // expect(body.response[7]).to.deep.include( [ 'name', 'type', 'TEXT', 'WEIGHT', '1' ]);
            },
          },
          {
            name: 'Should find documents',
            data: {
              command: `ft.search ${constants.TEST_SEARCH_JSON_INDEX_1} "@name:(John)"`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            before: async () => {
              for (let i = 0; i < 10; i++) {
                await rte.client.call(
                  'json.set',
                  [`${constants.TEST_SEARCH_JSON_KEY_PREFIX_1}${i}`, '$', `{"user":{"name":"John Smith${i}"}}`]
                )
              }
            },
            checkFn: ({ body }) => {
              expect(body.response).to.have.string(`1) 10`);
            }
          },
          {
            name: 'Should aggregate documents by uniq @name',
            data: {
              command: `ft.aggregate ${constants.TEST_SEARCH_JSON_INDEX_1} * GROUPBY 1 @name`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.have.string(`1) 10`);
            }
          },
          {
            name: 'Should remove index',
            data: {
              command: `ft.dropindex ${constants.TEST_SEARCH_JSON_INDEX_1} DD`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            after: async () => {
              expect(await rte.client.call('ft._list')).to.not.include(constants.TEST_SEARCH_JSON_INDEX_1);
            }
          },
        ].map(mainCheckFn);
      })
    });
    describe('RediSearch v1', () => {
      describe('Hash', () => {
        requirements('rte.modules.ft', 'rte.modules.ft.version>=10615');
        [
          {
            name: 'Should create index',
            data: {
              command: `ft.create ${constants.TEST_SEARCH_HASH_INDEX_1} NOOFFSETS SCHEMA title TEXT WEIGHT 5.0`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body.response).to.have.string('"OK"');
            },
            before: async () => {
              let errorMessage = '';
              try {
                await rte.client.call('ft.info', [constants.TEST_SEARCH_HASH_INDEX_1])
              } catch ({message}) {
                errorMessage = message;
              }
              expect(errorMessage).to.eql('Unknown Index name')
            },
            after: async () => {
              expect(await rte.client.call('ft.info', [constants.TEST_SEARCH_HASH_INDEX_1]))
                .to.include(constants.TEST_SEARCH_HASH_INDEX_1)
            },
          },
          {
            name: 'Should return index info',
            data: {
              outputFormat: 'RAW',
              command: `ft.info ${constants.TEST_SEARCH_HASH_INDEX_1}`,
            },
            responseRawSchema,
            checkFn: ({ body }) => {
              expect(body.response[0]).to.eql('index_name');
              expect(body.response[1]).to.eql(constants.TEST_SEARCH_HASH_INDEX_1);
              expect(body.response[2]).to.eql('index_options');
              expect(body.response[3]).to.eql(['NOOFFSETS']);
              expect(body.response[4]).to.eql('fields');
              expect(body.response[5]).to.deep.include( [ 'title', 'type', 'TEXT', 'WEIGHT', '5' ]);
            },
          },
          {
            name: 'Should find documents',
            data: {
              command: `ft.search ${constants.TEST_SEARCH_HASH_INDEX_1} "hello world"`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            before: async () => {
              for (let i = 0; i < 10; i++) {
                await rte.client.call(
                  'ft.add',
                  [constants.TEST_SEARCH_HASH_INDEX_1, `${constants.TEST_SEARCH_HASH_KEY_PREFIX_1}${i}`, '1.0', 'FIELDS', 'title', 'hello world']
                )
              }
            },
            checkFn: ({ body }) => {
              expect(body.response).to.have.string(`1) 10`);
            }
          },
          {
            name: 'Should remove index',
            data: {
              command: `ft.drop ${constants.TEST_SEARCH_HASH_INDEX_1}`,
              outputFormat: 'TEXT',
            },
            responseSchema,
            after: async () => {
              let errorMessage = '';
              try {
                await rte.client.call('ft.info', [constants.TEST_SEARCH_HASH_INDEX_1])
              } catch ({message}) {
                errorMessage = message;
              }
              expect(errorMessage).to.eql('Unknown Index name')
            }
          },
        ].map(mainCheckFn);
      })
    });
    describe('Stream', () => {
      requirements('rte.version>=5.0');
      [
        {
          name: 'Should create stream',
          data: {
            command: `xadd ${constants.TEST_STREAM_KEY_1} * ${constants.TEST_STREAM_DATA_1} ${constants.TEST_STREAM_DATA_2}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_STREAM_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.exists(constants.TEST_STREAM_KEY_1)).to.eql(1);
          },
        },
        {
          name: 'Should get stream',
          data: {
            command: `xrange ${constants.TEST_STREAM_KEY_1} - +`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.have.string(`1) "${constants.TEST_STREAM_DATA_1}"`);
            expect(body.response).to.have.string(`2) "${constants.TEST_STREAM_DATA_2}"`);
          }
        },
        {
          name: 'Should remove stream',
          data: {
            command: `del ${constants.TEST_STREAM_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_STREAM_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Bad commands', () => {
      [
        {
          name: 'Should return error if invalid command sent',
          data: {
            command: `setx ${constants.TEST_STRING_KEY_1} ${constants.TEST_STRING_VALUE_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('ERR unknown command');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (monitor)',
          data: {
            command: `monitor`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (subscribe)',
          data: {
            command: `subscribe`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (psubscribe)',
          data: {
            command: `psubscribe`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (sync)',
          data: {
            command: `sync`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (psync)',
          data: {
            command: `psync`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (script debug)',
          data: {
            command: `script debug`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
        {
          name: 'Should return error if try to run unsupported command (hello 3)',
          data: {
            command: `hello 3`,
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.status).to.eql('fail');
            expect(body.response).to.include('command is not supported by the Redis Insight CLI');
          }
        },
      ].map(mainCheckFn);
    });
    describe('Blocking commands', () => {
      [
        {
          name: 'Should use blocking command (unblock by cli command)',
          data: {
            command: `blpop ${constants.TEST_LIST_KEY_2} 0`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async function () {
            // unblock command after 1 sec
            setTimeout(async () => {
              const clients = (await rte.client.client('list')).split('\n');
              const currentClient = clients.filter((client) => client.toLowerCase().indexOf('cmd=blpop') > -1);
              expect(currentClient.length).to.eql(1);

              const blockedClientId = (currentClient[0].match(/^id=(\d+)/))[1];
              await rte.client.client('unblock', blockedClientId);
            }, 5000)
          },
        },
        {
          name: 'Should use blocking command (unblock by adding element)',
          data: {
            command: `blpop ${constants.TEST_LIST_KEY_2} 0`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async function () {
            // unblock command after 1 sec
            setTimeout(async () => {
              await rte.client.lpush(constants.TEST_LIST_KEY_2, 'element');
            }, 5000)
          },
        },
        {
          name: 'Should use blocking command (unblock by removing client through API)',
          data: {
            command: `blpop ${constants.TEST_LIST_KEY_2} 0`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async function () {
            // unblock command after 1 sec
            setTimeout(async () => {
              await request(server).delete(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`);
            }, 1000)
          },
        },
        {
          name: 'Should remove list',
          data: {
            command: `del ${constants.TEST_LIST_KEY_1}`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          before: async () => {
            await request(server).patch(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`);
          },
          after: async () => {
            expect(await rte.client.exists(constants.TEST_LIST_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Human readable commands', () => {
      [
        {
          name: 'Should return server info in correct text format',
          data: {
            command: `info server`,
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body.response).to.include('# Server\r\n')
          }
        },
      ].map(mainCheckFn);
    });
  });

  describe('Raw output', () => {
    [
      {
        name: 'Should return a string type response',
        data: {
          command: `set ${constants.TEST_STRING_KEY_1} ${constants.TEST_STRING_VALUE_1}`,
          outputFormat: 'RAW'
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect(body.response).to.eql('OK')
        }
      },
      {
        name: 'Should return a number type response',
        data: {
          command: `del ${constants.TEST_STRING_KEY_1}`,
          outputFormat: 'RAW'
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect(body.response).to.be.a('number')
        }
      },
      {
        name: 'Should return an array type response',
        data: {
          command: `lrange ${constants.TEST_LIST_KEY_1} 0 100`,
          outputFormat: 'RAW'
        },
        responseRawSchema,
        before: async () => {
          await rte.client.lpush(constants.TEST_LIST_KEY_1, constants.TEST_LIST_ELEMENT_1, constants.TEST_LIST_ELEMENT_2)
        },
        after: async () => {
          await rte.client.del(constants.TEST_LIST_KEY_1)
        },
        checkFn: ({ body }) => {
          expect(body.response).to.eql([
            constants.TEST_LIST_ELEMENT_2,
            constants.TEST_LIST_ELEMENT_1,
          ])
        }
      },
      {
        name: 'Should return an object type response',
        data: {
          command: `hgetall ${constants.TEST_HASH_KEY_1}`,
          outputFormat: 'RAW'
        },
        responseRawSchema,
        before: async () => {
          await rte.client.hset(constants.TEST_HASH_KEY_1, [constants.TEST_HASH_FIELD_1_NAME, constants.TEST_HASH_FIELD_1_VALUE])
        },
        after: async () => {
          await rte.client.del(constants.TEST_HASH_KEY_1)
        },
        checkFn: ({ body }) => {
          expect([
            // TODO: investigate the difference between getting a hash
            // result from ioredis
            {[constants.TEST_HASH_FIELD_1_NAME]: constants.TEST_HASH_FIELD_1_VALUE},
            // result from node-redis
            [constants.TEST_HASH_FIELD_1_NAME, constants.TEST_HASH_FIELD_1_VALUE]
          ]).to.deep.contain(body.response)
        }
      },
    ].map(mainCheckFn);
  })

  // Skip 'Cluster' tests because tested functionalities were removed
  xdescribe('Client', () => {
    [
      {
        name: 'Should throw ClientNotFoundError',
        data: {
          command: `info`,
          outputFormat: 'TEXT',
        },
        statusCode: 404,
        responseBody: {
          statusCode: 404,
          message: 'Client not found or it has been disconnected.',
          name: 'ClientNotFoundError',
        },
        before: async function () {
          await request(server).delete(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`)
        },
        after: async function () {
          await request(server).patch(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`)
        },
      },
    ].map(mainCheckFn);
  })
});

describe('POST /databases/:instanceId/cli/:uuid/send-command (MULTI)', () => {
  requirements('rte.type=STANDALONE');

  before(rte.data.truncate);
  // Create Redis client for CLI
  before(async () => await request(server).patch(`/${constants.API.DATABASES}/${constants.TEST_INSTANCE_ID}/cli/${constants.TEST_CLI_UUID_1}`))

  describe('Raw output', () => {
    [
      {
        name: 'Should start transaction',
        data: {
          command: `multi`,
          outputFormat: 'RAW',
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect(body.response).to.eq("OK");
        },
      },
      {
        name: 'Should create string',
        data: {
          command: `set ${constants.TEST_STRING_KEY_1} bar`,
          outputFormat: 'RAW',
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect(body.response).to.eq("QUEUED")
        },
      },
      {
        name: 'Should create string',
        data: {
          command: `incr ${constants.TEST_STRING_KEY_1}`,
          outputFormat: 'RAW',
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect(body.response).to.eq("QUEUED")
        },
      },
      {
        name: 'Should create string',
        data: {
          command: 'exec',
          outputFormat: 'RAW',
        },
        responseRawSchema,
        checkFn: ({ body }) => {
          expect([
            // TODO: investigate the difference between errors
            // result from ioredis
            ['OK', 'ReplyError: ERR value is not an integer or out of range'],
            // result from node-redis
            ['OK', 'Error: ERR value is not an integer or out of range'],
          ]).to.deep.contain(body.response)
        },
      },
    ].map(mainCheckFn);
  })
});
