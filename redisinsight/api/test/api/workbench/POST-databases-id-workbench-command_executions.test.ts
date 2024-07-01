import {
  expect,
  before,
  describe,
  it,
  Joi,
  _,
  deps,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  validateApiCall,
  requirements,
} from '../deps';
import { convertArrayReplyToObject } from 'src/modules/redis/utils';
const { server, request, constants, rte, localDb } = deps;

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).post(`/${constants.API.DATABASES}/${instanceId}/workbench/command-executions`);

// input data schema
const dataSchema = Joi.object({
  commands: Joi.array().items(Joi.string().allow('')).required().messages({
    'string.base': 'each value in commands must be a string'
  }),
  mode: Joi.string().valid('RAW', 'ASCII').allow(null),
  resultsMode: Joi.string().valid('DEFAULT', 'GROUP_MODE').allow(null),
}).messages({
  'any.required': '{#label} should not be empty',
}).strict();

const validInputData = {
  commands: ['set foo bar'],
  mode: 'RAW',
  resultsMode: 'DEFAULT',
};

const responseSchema = Joi.array().items(Joi.object().keys({
  id: Joi.string().required(),
  databaseId: Joi.string().required(),
  command: Joi.string().required(),
  mode: Joi.string().allow(null),
  resultsMode: Joi.string().allow(null),
  result: Joi.array().items(Joi.object({
    response: Joi.any().required(),
    status: Joi.string().required(),
  })),
  createdAt: Joi.date().required(),
  executionTime: Joi.number().integer(),
  db: Joi.number().integer().allow(null),
  isNotStored: Joi.boolean(),
  summary: Joi.object({
    total: Joi.number(),
    success: Joi.number(),
    fail: Joi.number(),
  }),
})).required();

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

describe('POST /databases/:instanceId/workbench/command-executions', () => {
  before(rte.data.truncate);

  describe('Validation', () => {
    generateInvalidDataTestCases(dataSchema, validInputData).map(
      validateInvalidDataTestCase(endpoint, dataSchema),
    );
  });

  describe('Common', () => {
    describe('String', () => {
      const bigStringValue = Buffer.alloc(1023 * 1024, 'a').toString();

      [
        {
          name: 'Should return 404 not found when incorrect instance',
          endpoint: () => endpoint(constants.TEST_NOT_EXISTED_INSTANCE_ID),
          statusCode: 404,
          responseBody: {
            statusCode: 404,
            message: 'Invalid database instance id.',
            error: 'Not Found'
          },
        },
        {
          name: 'Should get string',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].command).to.eql(`get ${constants.TEST_STRING_KEY_1}`);
            expect(body[0].executionTime).to.be.a('number');
            expect(body[0].db).to.be.eql(0);
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].response).to.eql(bigStringValue);
            expect(body[0].result[0].status).to.eql('success');

            const entity: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            expect(entity.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(localDb.encryptData(JSON.stringify(body[0].result))).to.eql(entity.result);
          },
          before: async () => {
            expect(await rte.client.set(constants.TEST_STRING_KEY_1, bigStringValue));
          }
        },
        {
          name: 'Should remove string',
          data: {
            commands: [`del ${constants.TEST_STRING_KEY_1}`],
          },
          responseSchema,
          after: async () => {
            expect(await rte.client.exists(constants.TEST_STRING_KEY_1)).to.eql(0);
          }
        },
      ].map(mainCheckFn);
    });
    describe('Big String', () => {
      const bigStringValue = Buffer.alloc(1024 * 1024, 'a').toString();

      [
        {
          name: 'Should create string',
          data: {
            commands: [`set ${constants.TEST_STRING_KEY_1} ${bigStringValue}`],
          },
          responseSchema,
          before: async () => {
            expect(await rte.client.exists(constants.TEST_STRING_KEY_1)).to.eql(0);
          },
          after: async () => {
            expect(await rte.client.get(constants.TEST_STRING_KEY_1)).to.eql(bigStringValue);
          }
        },
        {
          name: 'Should get string',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].command).to.eql(`get ${constants.TEST_STRING_KEY_1}`);
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].response).to.eql(bigStringValue);
            expect(body[0].result[0].status).to.eql('success');

            const entity: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            expect(entity.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(localDb.encryptData(JSON.stringify([{
              status: 'success',
              response: 'Results have been deleted since they exceed 1 MB. Re-run the command to see new results.',
            }]))).to.eql(entity.result);
          }
        },
        {
          name: 'Should remove string',
          data: {
            commands: [`del ${constants.TEST_STRING_KEY_1}`],
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
            commands: [`lpush ${constants.TEST_LIST_KEY_1} ${constants.TEST_LIST_ELEMENT_1} ${constants.TEST_LIST_ELEMENT_2}`],
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
            commands: [`lrange ${constants.TEST_LIST_KEY_1} 0 100`],
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].result).to.eql([
              {
                status: 'success',
                response: [
                  constants.TEST_LIST_ELEMENT_2,
                  constants.TEST_LIST_ELEMENT_1,
                ]
              },
            ]);

            const entity: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            expect(entity.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(localDb.encryptData(JSON.stringify(body[0].result))).to.eql(entity.result);
          }
        },
        {
          name: 'Should remove list',
          data: {
            commands: [`del ${constants.TEST_LIST_KEY_1}`],
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
            commands: [`sadd ${constants.TEST_SET_KEY_1} ${constants.TEST_SET_MEMBER_1} ${constants.TEST_SET_MEMBER_2}`],
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
            commands: [`sscan ${constants.TEST_SET_KEY_1} 0 count 100`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0]).to.eql('0'); // 0 cursor
            // Check for members. No order guaranteed
            expect(body[0].result[0].response[1]).to.include(constants.TEST_SET_MEMBER_1);
            expect(body[0].result[0].response[1]).to.include(constants.TEST_SET_MEMBER_2);
          }
        },
        {
          name: 'Should get set (multiline)',
          data: {
            commands: [`sscan\n    ${constants.TEST_SET_KEY_1} 0\n    count\n    100`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].command).to.eql(`sscan\n    ${constants.TEST_SET_KEY_1} 0\n    count\n    100`);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0]).to.eql('0'); // 0 cursor
            // Check for members. No order guaranteed
            expect(body[0].result[0].response[1]).to.include(constants.TEST_SET_MEMBER_1);
            expect(body[0].result[0].response[1]).to.include(constants.TEST_SET_MEMBER_2);
          }
        },
        {
          name: 'Should remove list',
          data: {
            commands: [`del ${constants.TEST_SET_KEY_1}`],
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
            commands: [`zadd ${constants.TEST_ZSET_KEY_1} 1 ${constants.TEST_ZSET_MEMBER_1} 2 ${constants.TEST_ZSET_MEMBER_2}`],
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
            commands: [`zrange ${constants.TEST_ZSET_KEY_1} 0 100`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result).to.eql(
              [
                {
                  status: 'success',
                  response: [
                    constants.TEST_ZSET_MEMBER_1,
                    constants.TEST_ZSET_MEMBER_2,
                  ],
                },
              ]
            );
          }
        },
        {
          name: 'Should remove zset',
          data: {
            commands: [`del ${constants.TEST_ZSET_KEY_1}`],
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
            commands: [`hset ${constants.TEST_HASH_KEY_1} ${constants.TEST_HASH_FIELD_1_NAME} ${constants.TEST_HASH_FIELD_1_VALUE}`],
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
            commands: [`hgetall ${constants.TEST_HASH_KEY_1}`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect([
              // TODO: investigate the difference between getting a hash
              // result from ioredis
              [{
                response: {[constants.TEST_HASH_FIELD_1_NAME]: constants.TEST_HASH_FIELD_1_VALUE},
                status: 'success',
              }],
              // result from node-redis
              [{
                response: [constants.TEST_HASH_FIELD_1_NAME, constants.TEST_HASH_FIELD_1_VALUE],
                status: 'success',
              }]
            ]).to.deep.contain(body[0].result)
          }
        },
        {
          name: 'Should remove hash',
          data: {
            commands: [`del ${constants.TEST_HASH_KEY_1}`],
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
            commands: [`json.set ${constants.TEST_REJSON_KEY_1} . "{\\"field\\":\\"value\\"}"`],
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
            commands: [`json.get ${constants.TEST_REJSON_KEY_1} .field`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result).to.eql([
              {
                status: 'success',
                response: '\\"value\\"'
              },
            ]);
          }
        },
        {
          name: 'Should remove json',
          data: {
            commands: [`json.del ${constants.TEST_REJSON_KEY_1}`],
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
            commands: [`ts.create ${constants.TEST_TS_KEY_1} ${constants.TEST_TS_VALUE_1} ${constants.TEST_TS_VALUE_2}`],
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
            commands: [`ts.add ${constants.TEST_TS_KEY_1} ${constants.TEST_TS_TIMESTAMP_1} ${constants.TEST_TS_VALUE_1}`],
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
            commands: [`ts.get ${constants.TEST_TS_KEY_1}`],
            outputFormat: 'TEXT',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result).to.eql([
              {
                status: 'success',
                response: [
                  constants.TEST_TS_TIMESTAMP_1,
                  constants.TEST_TS_VALUE_1.toString(),
                ]
              },
            ]);
          }
        },
        {
          name: 'Should remove ts',
          data: {
            commands: [`del ${constants.TEST_TS_KEY_1}`],
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
            commands: [`graph.query ${constants.TEST_GRAPH_KEY_1} "CREATE (n1)"`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0]).to.include('Nodes created: 1');
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
            commands: [`graph.query ${constants.TEST_GRAPH_KEY_1} "MATCH (n1) RETURN n1"`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0]).to.eql(['n1']);
            expect(body[0].result[0].response[1]).to.be.an('array');
            expect(body[0].result[0].response[2][0]).to.eql('Cached execution: 0');
            expect(body[0].result[0].response[2][1]).to.have.string('Query internal execution time:');
          }
        },
        {
          name: 'Should remove graph',
          data: {
            commands: [`del ${constants.TEST_GRAPH_KEY_1}`],
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
              commands: [`ft.create ${constants.TEST_SEARCH_HASH_INDEX_1} ON HASH
              PREFIX 1 ${constants.TEST_SEARCH_HASH_KEY_PREFIX_1} NOOFFSETS SCHEMA title TEXT WEIGHT 5.0`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].result).to.eql([
                {
                  status: 'success',
                  response: 'OK',
                },
              ]);
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
              commands: [`ft._list`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].result).to.eql([
                {
                  status: 'success',
                  response: [constants.TEST_SEARCH_HASH_INDEX_1],
                },
              ]);
            },
          },
          {
            name: 'Should return index info',
            data: {
              commands: [`ft.info ${constants.TEST_SEARCH_HASH_INDEX_1}`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              const response = body[0].result[0].response;

              expect(body[0].result.length).to.eql(1);
              expect(body[0].result[0].status).to.eql('success');
              expect(response[0]).to.eql('index_name');
              expect(response[1]).to.eql(constants.TEST_SEARCH_HASH_INDEX_1);
              expect(response[2]).to.eql('index_options');
              expect(response[3]).to.eql(['NOOFFSETS']);
              expect(response[4]).to.eql('index_definition');
              expect(_.take(response[5], 4)).to.eql( ['key_type', 'HASH', 'prefixes', [constants.TEST_SEARCH_HASH_KEY_PREFIX_1]]);
            },
          },
          {
            name: 'Should find documents',
            data: {
              commands: [`ft.search ${constants.TEST_SEARCH_HASH_INDEX_1} "hello world"`],
            },
            responseSchema,
            before: async () => {
              for (let i = 0; i < 10; i++) {
                await rte.client.hset(`${constants.TEST_SEARCH_HASH_KEY_PREFIX_1}${i}`, 'title', `hello world ${i}`)
              }
            },
            checkFn: ({ body }) => {
              const response: any[] = [10];

              for (let i = 0; i < 10; i++) {
                response.push(
                  `${constants.TEST_SEARCH_HASH_KEY_PREFIX_1}${i}`,
                  ['title', `hello world ${i}`],
                );
              }

              expect(body[0].result).to.eql([
                {
                  status: 'success',
                  response,
                },
              ]);
            }
          },
          {
            name: 'Should aggregate documents by uniq @title',
            data: {
              commands: [`ft.aggregate ${constants.TEST_SEARCH_HASH_INDEX_1} * GROUPBY 1 @title`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              const response = body[0].result[0].response;

              expect(body[0].result.length).to.eql(1);
              expect(body[0].result[0].status).to.eql('success');
              expect(response[0]).to.eql(10);
              expect(response).to.deep.include(['title', 'hello world 1']);
            }
          },
          {
            name: 'Should remove index',
            data: {
              commands: [`ft.dropindex ${constants.TEST_SEARCH_HASH_INDEX_1} DD`],
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
              commands: [`ft.create ${constants.TEST_SEARCH_JSON_INDEX_1} ON JSON
              PREFIX 1 ${constants.TEST_SEARCH_JSON_KEY_PREFIX_1}
              NOOFFSETS SCHEMA $.user.name AS name TEXT`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].result).to.eql([
                {
                  status: 'success',
                  response: 'OK',
                },
              ]);
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
              commands: [`ft.info ${constants.TEST_SEARCH_JSON_INDEX_1}`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              const response = body[0].result[0].response;

              expect(body[0].result.length).to.eql(1);
              expect(body[0].result[0].status).to.eql('success');
              expect(response[0]).to.eql('index_name');
              expect(response[1]).to.eql(constants.TEST_SEARCH_JSON_INDEX_1);
              expect(response[2]).to.eql('index_options');
              expect(response[3]).to.eql(['NOOFFSETS']);
              expect(response[4]).to.eql('index_definition');
              expect(_.take(response[5], 4)).to.eql( ['key_type', 'JSON', 'prefixes', [ constants.TEST_SEARCH_JSON_KEY_PREFIX_1 ]]);
            },
          },
          {
            name: 'Should find documents',
            data: {
              commands: [`ft.search ${constants.TEST_SEARCH_JSON_INDEX_1} "@name:(John)"`],
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
              const response: any[] = [10];

              for (let i = 0; i < 10; i++) {
                response.push(
                  `${constants.TEST_SEARCH_JSON_KEY_PREFIX_1}${i}`,
                  ['$', `{\\"user\\":{\\"name\\":\\"John Smith${i}\\"}}`],
                );
              }

              expect(body[0].result).to.eql([
                {
                  status: 'success',
                  response,
                },
              ]);
            }
          },
          {
            name: 'Should aggregate documents by uniq @name',
            data: {
              commands: [`ft.aggregate ${constants.TEST_SEARCH_JSON_INDEX_1} * GROUPBY 1 @name`],
            },
            responseSchema,
            checkFn: ({ body }) => {
              const response = body[0].result[0].response;

              expect(body[0].result.length).to.eql(1);
              expect(body[0].result[0].status).to.eql('success');
              expect(response[0]).to.eql(10);
              expect(response).to.deep.include(['name', 'John Smith0']);
            }
          },
          {
            name: 'Should remove index',
            data: {
              commands: [`ft.dropindex ${constants.TEST_SEARCH_JSON_INDEX_1} DD`],
            },
            responseSchema,
            after: async () => {
              expect(await rte.client.call('ft._list')).to.not.include(constants.TEST_SEARCH_JSON_INDEX_1);
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
            commands: [`xadd ${constants.TEST_STREAM_KEY_1} * ${constants.TEST_STREAM_DATA_1} ${constants.TEST_STREAM_DATA_2}`],
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
            commands: [`xrange ${constants.TEST_STREAM_KEY_1} - +`],
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0][0]).to.have.string('-');
            expect(body[0].result[0].response[0][1]).to.eql([
              constants.TEST_STREAM_DATA_1,
              constants.TEST_STREAM_DATA_2,
            ]);
          }
        },
        {
          name: 'Should remove stream',
          data: {
            commands: [`del ${constants.TEST_STREAM_KEY_1}`],
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
            commands: [`setx ${constants.TEST_STRING_KEY_1} ${constants.TEST_STRING_VALUE_1}`],
          },
          checkFn: ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].result[0].status).to.eql('fail');
            expect(body[0].result[0].response).to.include('ERR unknown command');
          },
        },
        {
          name: 'Should return error if try to run unsupported command (monitor)',
          data: {
            commands: [`monitor`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (subscribe)',
          data: {
            commands: [`subscribe`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (psubscribe)',
          data: {
            commands: [`psubscribe`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (sync)',
          data: {
            commands: [`sync`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (psync)',
          data: {
            commands: [`psync`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (script debug)',
          data: {
            commands: [`script debug`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run unsupported command (hello 3)',
          data: {
            commands: [`hello 3`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
        {
          name: 'Should return error if try to run blocking command',
          data: {
            commands: [`blpop key`],
          },
          checkFn: ({ body }) => {
            expect(body[0].executionTime).to.eql(undefined);
          },
        },
      ].map((testCase) => mainCheckFn({
        responseSchema,
        checkFn: async ({ body }) => {
          expect(body[0].result.length).to.eql(1);
          expect(body[0].result[0].status).to.eql('fail');
          expect(body[0].result[0].response).to.include('command is not supported by the Redis Insight Workbench');
        },
        ...testCase,
      }));
    });
    describe('History items limit', () => {
      it('Number of history items should be less then 30', async () => {
        const repo = await (localDb.getRepository(localDb.repositories.COMMAND_EXECUTION));
        await localDb.generateNCommandExecutions({
          databaseId: constants.TEST_INSTANCE_ID,
          createdAt: new Date(Date.now() - 1000)
        }, 30, true);

        for (let i = 0; i < 40; i++) {
          await validateApiCall(        {
            endpoint,
            data: {
              commands: [`get ${constants.TEST_STRING_KEY_1}`],
            },
            responseSchema,
            checkFn: async ({ body }) => {
              expect(body[0].result.length).to.eql(1);

              const count = await repo.countBy({ databaseId: constants.TEST_INSTANCE_ID });
              expect(count).to.lte(30);

              // check that the last execution command was not deleted
              // await repo.findOneOrFail({ id: body.id }); // sometimes localDb is not in sync. investigate
            },
          });
        }
      });
    });
  });
  // Skip 'Standalone + Sentinel' and 'Cluster' tests because tested functionalities were removed
  xdescribe('Standalone + Sentinel', () => {
    requirements('!rte.type=CLUSTER');

    describe('Incorrect requests for redis client type', () => {
      [
        {
          name: 'Should return error if try to execute command for role for standalone database',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
          },
          statusCode: 400,
          responseBody: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Wrong database type.',
          },
        },
        {
          name: 'Should return error if try to execute command for particular node for standalone database',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
          },
          statusCode: 400,
          responseBody: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Wrong database type.',
          },
        },
      ].map(mainCheckFn);
    });
  });
  xdescribe('Cluster', () => {
    // requirements('rte.type=CLUSTER');
    requirements('!rte.re');

    let database;
    let nodes;

    before(async () => {
      database = await (await localDb.getRepository(localDb.repositories.DATABASE)).findOneBy({
        id: constants.TEST_INSTANCE_ID,
      });
      nodes = JSON.parse(database.nodes);
    });

    describe('Commands using role', () => {
      [
        {
          name: 'Get command with role=ALL',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
            role: 'ALL',
          },
          responseSchema,
          before: async () => {
            await rte.client.set(constants.TEST_STRING_KEY_1, constants.TEST_STRING_VALUE_1);
          },
          checkFn: async ({ body }) => {
            const result = body[0].result;

            expect(result.length).to.eql(nodes.length);
            expect(body[0].role).to.eql('ALL');
            expect(body[0].nodeOptions).to.eql(undefined);

            const resultSummary = {
              moved: 0,
              succeed: 0,
            };

            result.forEach(nodeResult => {
              const node = nodes.find(node => {
                return nodeResult.node.host === node.host && nodeResult.node.port === node.port;
              });

              if (!node) {
                fail(`Unexpected node detected: ${JSON.stringify(nodeResult.node)}`);
              }

              switch (nodeResult.status) {
                case 'fail':
                  expect(nodeResult.response).to.have.string('MOVED');
                  resultSummary.moved++;
                  break;
                case 'success':
                  expect(nodeResult.response).to.eql(constants.TEST_STRING_VALUE_1);
                  resultSummary.succeed++;
                  break;
                default:
                  fail(`Unexpected node result status: ${nodeResult.status}`);
              }
            });

            expect(resultSummary.moved).to.gt(0);
            expect(resultSummary.succeed).to.gt(0);
            expect(resultSummary.moved + resultSummary.succeed).to.eq(nodes.length)
          },
        },
        {
          name: 'Get command with role=MASTER',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
            role: 'MASTER',
          },
          responseSchema,
          checkFn: async ({ body }) => {
            const result = body[0].result;

            expect(result.length).to.lte(nodes.length);

            const resultSummary = {
              moved: 0,
              succeed: 0,
            };

            result.forEach(nodeResult => {
              const node = nodes.find(node => {
                return nodeResult.node.host === node.host && nodeResult.node.port === node.port;
              });

              if (!node) {
                fail(`Unexpected node detected: ${JSON.stringify(nodeResult.node)}`);
              }

              switch (nodeResult.status) {
                case 'fail':
                  expect(nodeResult.response).to.have.string('MOVED');
                  resultSummary.moved++;
                  break;
                case 'success':
                  expect(nodeResult.response).to.eql(constants.TEST_STRING_VALUE_1);
                  resultSummary.succeed++;
                  break;
                default:
                  fail(`Unexpected node result status: ${nodeResult.status}`);
              }
            });

            expect(resultSummary.moved).to.gt(0);
            expect(resultSummary.succeed).to.gt(0);
            expect(resultSummary.moved + resultSummary.succeed).to.lte(nodes.length)
          },
        },
        {
          name: 'Set command with role=SLAVE should return all failed responses',
          data: {
            commands: [`set ${constants.TEST_STRING_KEY_1} ${constants.TEST_STRING_KEY_1}`],
            role: 'SLAVE',
          },
          responseSchema,
          checkFn: async ({ body }) => {
            const result = body[0].result;

            expect(result.length).to.lte(nodes.length);

            const resultSummary = {
              moved: 0,
              succeed: 0,
            };

            result.forEach(nodeResult => {
              const node = nodes.find(node => {
                return nodeResult.node.host === node.host && nodeResult.node.port === node.port;
              });

              if (!node) {
                fail(`Unexpected node detected: ${JSON.stringify(nodeResult.node)}`);
              }

              switch (nodeResult.status) {
                case 'fail':
                  expect(nodeResult.response).to.have.string('MOVED');
                  resultSummary.moved++;
                  break;
                case 'success':
                  expect(nodeResult.response).to.eql(constants.TEST_STRING_VALUE_1);
                  resultSummary.succeed++;
                  break;
                default:
                  fail(`Unexpected node result status: ${nodeResult.status}`);
              }
            });

            expect(resultSummary.moved).to.gte(0);
            expect(resultSummary.succeed).to.eq(0);
            expect(resultSummary.moved + resultSummary.succeed).to.lte(nodes.length)
          },
        },
      ].map(mainCheckFn);
    });
    describe('Commands using nodeOptions', () => {
      [
        {
          name: 'Incorrect node should return an error',
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
            nodeOptions: {
              host: 'unreachable',
              port: 6380,
              enableRedirection: true,
            },
          },
          statusCode: 400,
          responseBody: {
            statusCode: 400,
            message: 'Node unreachable:6380 not exist in OSS Cluster.',
            error: 'Bad Request'
          },
          before: async () => {
            await rte.client.set(constants.TEST_STRING_KEY_1, constants.TEST_STRING_VALUE_1);
          },
        },
      ].map(mainCheckFn);

      it('Should auto redirect and never fail', async () => {
        await validateApiCall(        {
          endpoint,
          data: {
            commands: [`get ${constants.TEST_STRING_KEY_1}`],
            nodeOptions: {
              ...nodes[0],
              enableRedirection: true,
            },
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].result.length).to.eql(1);
            expect(body[0].role).to.eql(null);
            expect(body[0].nodeOptions).to.eql({
              ...nodes[0],
              enableRedirection: true,
            });
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response).to.eql(constants.TEST_STRING_VALUE_1);
          },
        });
      });
    });
  });
  describe('Execution time', () => {
    describe('pipeline', () => {
      [
        {
          name: 'Pipeline with two commands',
          data: {
            commands: [`lrange ${constants.TEST_LIST_KEY_1} 0 100`, 'info'],
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].executionTime).to.be.a('number')
            expect(body[1].executionTime).to.be.a('number')

            const entity_1: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            const entity_2: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[1].id,
            });

            expect(entity_1.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(entity_2.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(body[0].executionTime).to.eql(entity_1.executionTime);
            expect(body[1].executionTime).to.eql(entity_2.executionTime);
            expect(body[0].db).to.eql(entity_1.db);
            expect(body[1].db).to.eql(entity_2.db);
            expect(localDb.encryptData(body[0].command)).to.eql(entity_1.command);
            expect(localDb.encryptData(body[1].command)).to.eql(entity_2.command);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[1].result[0].status).to.eql('success');
          }
        },
        {
          name: 'Pipeline with one wrong command',
          data: {
            commands: [`lrange ${constants.TEST_LIST_KEY_1} 0 100`, 'dasd'],
          },
          responseSchema,
          checkFn: async ({ body }) => {
            expect(body[0].executionTime).to.be.a('number')
            expect(body[1].executionTime).to.be.a('number')

            const entity_1: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            const entity_2: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[1].id,
            });

            expect(entity_1.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(entity_2.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(body[0].executionTime).to.eql(entity_1.executionTime);
            expect(body[1].executionTime).to.eql(entity_2.executionTime);
            expect(body[0].db).to.eql(entity_1.db);
            expect(body[1].db).to.eql(entity_2.db);
            expect(localDb.encryptData(body[0].command)).to.eql(entity_1.command);
            expect(localDb.encryptData(body[1].command)).to.eql(entity_2.command);
            expect(body[0].result[0].status).to.eql('success');
            expect(body[1].result[0].status).to.eql('fail');
          },
        }
      ].map(mainCheckFn);
    });
    describe('Group mode', () => {
      [
        {
          name: 'Group mode with two commands',
          data: {
            commands: [`lpush ${constants.TEST_LIST_KEY_1} ${constants.TEST_LIST_ELEMENT_1} ${constants.TEST_LIST_ELEMENT_2}`, `lrange ${constants.TEST_LIST_KEY_1} 0 100`],
            resultsMode: 'GROUP_MODE',
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
          },
          checkFn: async ({ body }) => {
            expect(body[0].executionTime).to.be.a('number')

            const entity: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            expect(entity.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(body[0].executionTime).to.eql(entity.executionTime);
            expect(body[0].db).to.eql(entity.db);
            // group mode should always return success
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0].status).to.eql('success');
            expect(body[0].result[0].response[1]).to.eql(
              {
                status: 'success',
                response: [
                  constants.TEST_LIST_ELEMENT_2,
                  constants.TEST_LIST_ELEMENT_1,
                ],
                command: `lrange ${constants.TEST_LIST_KEY_1} 0 100`,
              },
            );
            expect(body[0].summary).to.eql({ total: 2, success: 2, fail: 0 });
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(localDb.encryptData(JSON.stringify(body[0].result))).to.eql(entity.result);
          }
        },
        {
          name: 'Group mode with one wrong command',
          data: {
            commands: [`lrange ${constants.TEST_LIST_KEY_1} 0 100`, 'dasd'],
            resultsMode: 'GROUP_MODE',
          },
          responseSchema,
          checkFn: async ({ body }) => {

            const entity: any = await (await localDb.getRepository(localDb.repositories.COMMAND_EXECUTION)).findOneBy({
              id: body[0].id,
            });

            expect(body[0].executionTime).to.be.a('number')
            expect(entity.encryption).to.eql(constants.TEST_ENCRYPTION_STRATEGY);
            expect(body[0].executionTime).to.eql(entity.executionTime);
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(body[0].summary).to.eql({ total: 2, success: 1, fail: 1 });
            // group mode should always return success
            expect(body[0].result[0].status).to.eql('success');
            expect(body[0].result[0].response[0].status).to.eql('success');
            expect(body[0].result[0].response[1].status).to.eql('fail');
            expect(localDb.encryptData(body[0].command)).to.eql(entity.command);
            expect(body[0].result[0].response[0].response).to.eql([
                constants.TEST_LIST_ELEMENT_2,
                constants.TEST_LIST_ELEMENT_1,
            ]);
            expect(body[0].result[0].response[1].response).to.include('ERR unknown command');
            expect(localDb.encryptData(JSON.stringify(body[0].result))).to.eql(entity.result);
            expect(body[0].db).to.be.a('number')
            expect(body[0].db).to.eql(entity.db);
          }
        },
      ].map(mainCheckFn);
    });
  });
});
