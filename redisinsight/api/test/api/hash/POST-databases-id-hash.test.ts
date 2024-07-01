import {
  expect,
  describe,
  it,
  before,
  deps,
  requirements,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  validateApiCall, getMainCheckFn
} from '../deps';
const { server, request, constants, rte } = deps;
import * as Joi from 'joi';
import { convertArrayReplyToObject } from 'src/modules/redis/utils';

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).post(`/${constants.API.DATABASES}/${instanceId}/hash`);

// input data schema
const dataSchema = Joi.object({
  keyName: Joi.string().allow('').required(),
  fields: Joi.array().items(Joi.object().keys({
    field: Joi.string().allow('').label('.field'),
    value: Joi.string().allow('').label('.value'),
  })).required().messages({
    'array.sparse': 'fields must be either object or array',
    'array.base': 'property {#label} must be either object or array',
  }),
  expire: Joi.number().integer().allow(null).min(1).max(2147483647),
}).strict();

const validInputData = {
  keyName: constants.TEST_HASH_KEY_1,
  fields: [{
    field: constants.TEST_HASH_FIELD_1_NAME,
    value: constants.TEST_HASH_FIELD_1_VALUE,
  }],
  expire: constants.TEST_HASH_EXPIRE_1,
};

const mainCheckFn = getMainCheckFn(endpoint);

const createCheckFn = async (testCase) => {
  it(testCase.name, async () => {
    // additional checks before test run
    if (testCase.before) {
      await testCase.before();
    } else {
      if (testCase.statusCode === 201) {
        expect(await rte.client.exists(testCase.data.keyName)).to.eql(0);
      }
    }

    await validateApiCall({
      endpoint,
      ...testCase,
    });

    // additional checks after test pass
    if (testCase.after) {
      await testCase.after();
    } else {
      if (testCase.statusCode === 201) {
        expect(await rte.client.exists(testCase.data.keyName)).to.eql(1);
        expect(convertArrayReplyToObject(await rte.client.hgetall(testCase.data.keyName))).to.eql({
          [testCase.data.fields[0].field]: testCase.data.fields[0].value,
        });
        if (testCase.data.expire) {
          expect(await rte.client.ttl(testCase.data.keyName)).to.gte(testCase.data.expire - 5);
        } else {
          expect(await rte.client.ttl(testCase.data.keyName)).to.eql(-1);
        }
      }
    }
  });
};

describe('POST /databases/:instanceId/hash', () => {
  describe('Modes', () => {
    requirements('!rte.bigData');
    beforeEach(rte.data.truncate);

    [
      {
        name: 'Should hash from buff',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_BUF_OBJ_1,
          fields: [{
            field: constants.TEST_HASH_FIELD_BIN_BUF_OBJ_1,
            value: constants.TEST_HASH_VALUE_BIN_BUF_OBJ_1,
          }],
        },
        statusCode: 201,
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(1);
          expect(await rte.data.sendCommand('hscan', [constants.TEST_HASH_KEY_BIN_BUFFER_1, 0], null)).to.deep.eq([
            Buffer.from('0'),
            [
              constants.TEST_HASH_FIELD_BIN_BUFFER_1,
              constants.TEST_HASH_VALUE_BIN_BUFFER_1,
            ],
          ]);
        },
      },
      {
        name: 'Should hash from ascii',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_ASCII_1,
          fields: [{
            field: constants.TEST_HASH_FIELD_BIN_ASCII_1,
            value: constants.TEST_HASH_VALUE_BIN_ASCII_1,
          }],
        },
        statusCode: 201,
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(1);
          expect(await rte.data.sendCommand('hscan', [constants.TEST_HASH_KEY_BIN_BUFFER_1, 0], null)).to.deep.eq([
            Buffer.from('0'),
            [
              constants.TEST_HASH_FIELD_BIN_BUFFER_1,
              constants.TEST_HASH_VALUE_BIN_BUFFER_1,
            ],
          ]);
        },
      },
    ].map(mainCheckFn);
  });

  describe('Main', () => {
    before(rte.data.truncate);

    describe('Validation', () => {
      generateInvalidDataTestCases(dataSchema, validInputData).map(
        validateInvalidDataTestCase(endpoint, dataSchema),
      );
    });

    describe('Common', () => {
      [
        {
          name: 'Should create item with empty value',
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: '',
              value: '',
            }],
          },
          statusCode: 201,
        },
        {
          name: 'Should create item with key ttl',
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
            expire: constants.TEST_HASH_EXPIRE_1,
          },
          statusCode: 201,
        },
        {
          name: 'Should create regular item',
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [{
              field: constants.TEST_HASH_FIELD_1_NAME,
              value: constants.TEST_HASH_FIELD_1_VALUE,
            }],
          },
          statusCode: 201,
        },
        {
          name: 'Should return conflict error if key already exists',
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 409,
          responseBody: {
            statusCode: 409,
            error: 'Conflict',
            message: 'This key name is already in use.',
          },
          after: async () =>
            // check that value was not overwritten
            expect(convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_1))).to.deep.eql({
              [constants.TEST_HASH_FIELD_1_NAME]: constants.TEST_HASH_FIELD_1_VALUE,
            })
        },
        {
          name: 'Should return NotFound error if instance id does not exists',
          endpoint: () => endpoint(constants.TEST_NOT_EXISTED_INSTANCE_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 404,
          responseBody: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Invalid database instance id.',
          },
        },
      ].map(createCheckFn);
    });

    describe('ACL', () => {
      requirements('rte.acl');
      before(async () => rte.data.setAclUserRules('~* +@all'));

      [
        {
          name: 'Should create regular item',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 201,
        },
        {
          name: 'Should throw error if no permissions for "hset" command',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 403,
          responseBody: {
            statusCode: 403,
            error: 'Forbidden',
          },
          before: () => rte.data.setAclUserRules('~* +@all -hset')
        },
        {
          name: 'Should throw error if no permissions for "exists" command',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 403,
          responseBody: {
            statusCode: 403,
            error: 'Forbidden',
          },
          before: () => rte.data.setAclUserRules('~* +@all -exists')
        },
      ].map(createCheckFn);
    });
  });
});
