import {
  expect,
  describe,
  before,
  deps,
  requirements,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  getMainCheckFn
} from '../deps';
const { server, request, constants, rte } = deps;
import * as Joi from 'joi';
import { convertArrayReplyToObject } from 'src/modules/redis/utils';

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).put(`/${constants.API.DATABASES}/${instanceId}/hash`);

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
}).strict();

const validInputData = {
  keyName: constants.getRandomString(),
  fields: [{
    field: constants.TEST_HASH_FIELD_1_NAME,
    value: constants.TEST_HASH_FIELD_1_VALUE,
  }],
};

const mainCheckFn = getMainCheckFn(endpoint);

describe('PUT /databases/:instanceId/hash', () => {
  describe('Modes', () => {
    requirements('!rte.bigData');
    beforeEach(() => rte.data.generateBinKeys(true));

    [
      {
        name: 'Should edit hash from buff',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_BUF_OBJ_1,
          fields: [{
            field: constants.TEST_HASH_FIELD_BIN_BUF_OBJ_1,
            value: constants.TEST_STRING_VALUE_BIN_BUF_OBJ_1,
          }],
        },
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(1);
          expect(await rte.data.sendCommand('hscan', [constants.TEST_HASH_KEY_BIN_BUFFER_1, 0], null)).to.deep.eq([
            Buffer.from('0'),
            [
              constants.TEST_HASH_FIELD_BIN_BUFFER_1,
              constants.TEST_STRING_VALUE_BIN_BUFFER_1,
            ],
          ]);
        },
      },
      {
        name: 'Should edit hash from ascii',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_ASCII_1,
          fields: [{
            field: constants.TEST_HASH_FIELD_BIN_ASCII_1,
            value: constants.TEST_STRING_VALUE_BIN_ASCII_1,
          }],
        },
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(1);
          expect(await rte.data.sendCommand('hscan', [constants.TEST_HASH_KEY_BIN_BUFFER_1, 0], null)).to.deep.eq([
            Buffer.from('0'),
            [
              constants.TEST_HASH_FIELD_BIN_BUFFER_1,
              constants.TEST_STRING_VALUE_BIN_BUFFER_1,
            ],
          ]);
        },
      },
    ].map(mainCheckFn);
  });

  describe('Main', () => {
    before(async () => await rte.data.generateKeys(true));

    describe('Validation', () => {
      generateInvalidDataTestCases(dataSchema, validInputData).map(
        validateInvalidDataTestCase(endpoint, dataSchema),
      );
    });

    describe('Common', () => {
      [
        {
          name: 'Should add new field and edit existing value',
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [{
              field: constants.TEST_HASH_FIELD_1_NAME,
              value: '',
            }, {
              field: 'new_field',
              value: 'new_value',
            }],
          },
          statusCode: 200,
          after: async () => {
            expect(convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_1))).to.eql({
              [constants.TEST_HASH_FIELD_1_NAME]: '',
              [constants.TEST_HASH_FIELD_2_NAME]: constants.TEST_HASH_FIELD_2_VALUE,
              ['new_field']: 'new_value',
            });
          }
        },
        {
          name: 'Should return NotFound error if key does not exists',
          data: {
            keyName: constants.getRandomString(),
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 404,
          responseBody: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Key with this name does not exist.',
          },
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
      ].map(mainCheckFn);
    });

    describe('ACL', () => {
      requirements('rte.acl');
      before(async () => rte.data.setAclUserRules('~* +@all'));

      [
        {
          name: 'Should create regular item',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [{
              field: constants.getRandomString(),
              value: constants.getRandomString(),
            }],
          },
          statusCode: 200,
        },
        {
          name: 'Should throw error if no permissions for "hset" command',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
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
            keyName: constants.TEST_HASH_KEY_1,
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
      ].map(mainCheckFn);
    });
  });
});
