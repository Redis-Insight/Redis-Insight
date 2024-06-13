import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { ClientContext, ClientMetadata } from 'src/common/models';
import { Validator } from 'class-validator';
import { API_HEADER_DATABASE_INDEX, API_PARAM_DATABASE_ID } from 'src/common/constants';
import { ApiHeader, ApiParam } from '@nestjs/swagger';
import { sessionMetadataFromRequestExecutionContext } from 'src/common/decorators/session/session-metadata.decorator';

const validator = new Validator();

export interface IClientMetadataParamOptions {
  databaseIdParam?: string,
  uniqueIdParam?: string,
  context?: ClientContext,
  ignoreDbIndex?: boolean,
}

export const clientMetadataParamFactory = (
  options: IClientMetadataParamOptions,
  ctx: ExecutionContext,
): ClientMetadata => {
  const req = ctx.switchToHttp().getRequest();

  let databaseId;
  if (options?.databaseIdParam) {
    databaseId = req.params?.[options.databaseIdParam];
  }

  let uniqueId;
  if (options?.uniqueIdParam) {
    uniqueId = req.params?.[options.uniqueIdParam];
  }

  const clientMetadata = plainToClass(ClientMetadata, {
    sessionMetadata: sessionMetadataFromRequestExecutionContext(undefined, ctx),
    databaseId,
    uniqueId,
    context: options?.context || ClientContext.Common,
    db: options?.ignoreDbIndex ? undefined : req?.headers?.[API_HEADER_DATABASE_INDEX],
  });

  const errors = validator.validateSync(clientMetadata, {
    whitelist: false, // we need this to allow additional fields if needed for flexibility
  });

  if (errors?.length) {
    throw new BadRequestException(Object.values(errors[0].constraints) || 'Bad request');
  }

  return clientMetadata;
};

export const ClientMetadataParam = (
  options?: IClientMetadataParamOptions,
) => {
  const opts: IClientMetadataParamOptions = {
    context: ClientContext.Common,
    databaseIdParam: API_PARAM_DATABASE_ID,
    ignoreDbIndex: false,
    ...options,
  };

  return createParamDecorator(clientMetadataParamFactory, [
    (target: any, key: string) => {
      // Here it is. Use the `@ApiQuery` decorator purely as a function to define the meta only once here.
      ApiParam({
        name: opts.databaseIdParam,
        schema: { type: 'string' },
        required: true,
      })(target, key, Object.getOwnPropertyDescriptor(target, key));
      if (!opts.ignoreDbIndex) {
        ApiHeader({
          name: API_HEADER_DATABASE_INDEX,
          schema: {
            default: undefined,
            type: 'number',
            minimum: 0,
          },
          required: false,
        })(target, key, Object.getOwnPropertyDescriptor(target, key));
      }
    },
  ])(opts);
};
