import {
  expect,
  describe,
  before,
  deps,
  requirements,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  getMainCheckFn,
} from '../deps';
const { server, request, constants, rte } = deps;
import * as Joi from 'joi';
import { convertArrayReplyToObject } from 'src/modules/redis/utils';

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).delete(`/${constants.API.DATABASES}/${instanceId}/hash/fields`);

// input data schema
const dataSchema = Joi.object({
  keyName: Joi.string().allow('').required(),
  fields: Joi.array().items(Joi.any()).required(), // todo: investigate BE validation
}).strict();

const validInputData = {
  keyName: constants.getRandomString(),
  fields: [constants.getRandomString()],
};

const responseSchema = Joi.object().keys({
  affected: Joi.number().required(),
}).required();

const mainCheckFn = getMainCheckFn(endpoint);

describe('DELETE /databases/:instanceId/hash/fields', () => {
  describe('Modes', () => {
    requirements('!rte.bigData');
    beforeEach(() => rte.data.generateBinKeys(true));

    [
      {
        name: 'Should remove hash field from buff',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_BUF_OBJ_1,
          fields: [constants.TEST_HASH_FIELD_BIN_BUF_OBJ_1],
        },
        responseBody: {
          affected: 1,
        },
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(0);
        },
      },
      {
        name: 'Should remove hash field from ascii',
        data: {
          keyName: constants.TEST_HASH_KEY_BIN_ASCII_1,
          fields: [constants.TEST_HASH_FIELD_BIN_ASCII_1],
        },
        responseBody: {
          affected: 1,
        },
        after: async () => {
          expect(await rte.client.exists(constants.TEST_HASH_KEY_BIN_BUFFER_1)).to.eql(0);
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
          name: 'Should ignore not existing field',
          data: {
            keyName: constants.TEST_HASH_KEY_2,
            fields: [constants.getRandomString()],
          },
          responseSchema,
          responseBody: {
            affected: 0,
          },
          after: async () => {
            const fields = convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_2));
            (new Array(3000).fill(0)).map((_, i) => {
              expect(fields[`field_${i + 1}`]).to.eql(`value_${i + 1}`);
            });
          }
        },
        {
          name: 'Should remove 1 field',
          data: {
            keyName: constants.TEST_HASH_KEY_2,
            fields: ['field_3000'],
          },
          responseSchema,
          responseBody: {
            affected: 1,
          },
          after: async () => {
            const fields = convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_2));
            (new Array(2999).fill(0)).map((_, i) => {
              expect(fields[`field_${i + 1}`]).to.eql(`value_${i + 1}`);
            });
          }
        },
        {
          name: 'Should remove multiple fields',
          data: {
            keyName: constants.TEST_HASH_KEY_2,
            fields: ['field_2999', 'field_2998', 'field_1', 'field_2'],
          },
          responseSchema,
          responseBody: {
            affected: 4,
          },
          after: async () => {
            const fields = convertArrayReplyToObject(await rte.client.hgetall(constants.TEST_HASH_KEY_2));
            (new Array(2995).fill(0)).map((_, i) => {
              expect(fields[`field_${i + 3}`]).to.eql(`value_${i + 3}`);
            });
          }
        },
        {
          name: 'Should remove all fields and the key',
          data: {
            keyName: constants.TEST_HASH_KEY_2,
            fields: [
              ...(new Array(2995).fill(0)).map((_, i) => `field_${i + 3}`)
            ],
          },
          responseSchema,
          responseBody: {
            affected: 2995,
          },
          after: async () => {
            expect(await rte.client.exists(constants.TEST_HASH_KEY_2)).to.eql(0);
          }
        },
        {
          name: 'Should return BadRequest error if try to modify incorrect data type',
          data: {
            keyName: constants.TEST_STRING_KEY_1,
            members: [constants.getRandomString()],
          },
          statusCode: 400,
          responseBody: {
            statusCode: 400,
            error: 'Bad Request',
          },
        },
        {
          name: 'Should return NotFound error if key does not exists',
          data: {
            keyName: constants.getRandomString(),
            fields: [constants.getRandomString()],
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
            fields: [constants.getRandomString()],
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
          name: 'Should not delete member',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [constants.getRandomString()],
          },
          responseSchema,
          responseBody: {
            affected: 0,
          },
        },
        {
          name: 'Should throw error if no permissions for "hdel" command',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [constants.getRandomString()],
          },
          statusCode: 403,
          responseBody: {
            statusCode: 403,
            error: 'Forbidden',
          },
          before: () => rte.data.setAclUserRules('~* +@all -hdel')
        },
        {
          name: 'Should throw error if no permissions for "exists" command',
          endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
          data: {
            keyName: constants.TEST_HASH_KEY_1,
            fields: [constants.getRandomString()],
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
