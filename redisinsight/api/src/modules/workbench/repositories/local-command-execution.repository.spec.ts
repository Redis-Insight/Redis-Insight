import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import {
  mockEncryptionService,
  mockEncryptResult,
  mockQueryBuilderGetMany,
  mockQueryBuilderGetManyRaw,
  mockRepository,
  mockDatabase,
  MockType,
  mockSessionMetadata,
} from 'src/__mocks__';
import { omit } from 'lodash';
import {
  CreateCommandExecutionDto,
  RunQueryMode,
} from 'src/modules/workbench/dto/create-command-execution.dto';
import { CommandExecution } from 'src/modules/workbench/models/command-execution';
import { CommandExecutionResult } from 'src/modules/workbench/models/command-execution-result';
import { CommandExecutionStatus, ICliExecResultFromNode } from 'src/modules/cli/dto/cli.dto';
import { NotFoundException } from '@nestjs/common';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandExecutionEntity } from 'src/modules/workbench/entities/command-execution.entity';
import { KeytarDecryptionErrorException } from 'src/modules/encryption/exceptions';
import ERROR_MESSAGES from 'src/constants/error-messages';
import config from 'src/utils/config';
import { LocalCommandExecutionRepository } from 'src/modules/workbench/repositories/local-command-execution.repository';

const WORKBENCH_CONFIG = config.get('workbench');

const mockNodeEndpoint = {
  host: '127.0.0.1',
  port: 6379,
};

const mockCliNodeResponse: ICliExecResultFromNode = {
  ...mockNodeEndpoint,
  response: 'OK',
  status: CommandExecutionStatus.Success,
};

const mockCreateCommandExecutionDto: CreateCommandExecutionDto = {
  command: 'set foo bar',
  mode: RunQueryMode.ASCII,
};

const mockCommandExecutionEntity = new CommandExecutionEntity({
  id: uuidv4(),
  databaseId: mockDatabase.id,
  command: mockEncryptResult.data,
  result: mockEncryptResult.data,
  mode: mockCreateCommandExecutionDto.mode,
  encryption: 'KEYTAR',
  createdAt: new Date(),
});

const mockCommandExecutionResult: CommandExecutionResult = {
  status: mockCliNodeResponse.status,
  response: mockCliNodeResponse.response,
};

const mockCommandExecutionPartial: Partial<CommandExecution> = new CommandExecution({
  ...mockCreateCommandExecutionDto,
  databaseId: mockDatabase.id,
  result: [mockCommandExecutionResult],
});

describe('LocalCommandExecutionRepository', () => {
  let service: LocalCommandExecutionRepository;
  let repository: MockType<Repository<CommandExecutionEntity>>;
  let encryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalCommandExecutionRepository,
        {
          provide: getRepositoryToken(CommandExecutionEntity),
          useFactory: mockRepository,
        },
        {
          provide: EncryptionService,
          useFactory: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get(LocalCommandExecutionRepository);
    repository = module.get(getRepositoryToken(CommandExecutionEntity));
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('create', () => {
    it('should process new entity', async () => {
      repository.save.mockReturnValueOnce([mockCommandExecutionEntity]);
      encryptionService.encrypt.mockReturnValue(mockEncryptResult);

      expect(await service.createMany(mockSessionMetadata, [mockCommandExecutionPartial])).toEqual([{
        ...mockCommandExecutionPartial,
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
      }]);
    });
    it('should return full result even if size limit exceeded', async () => {
      repository.save.mockReturnValueOnce([mockCommandExecutionEntity]);
      encryptionService.encrypt.mockReturnValue(mockEncryptResult);

      const executionResult = [{
        status: CommandExecutionStatus.Success,
        response: `${Buffer.alloc(WORKBENCH_CONFIG.maxResultSize, 'a').toString()}`,
      }];

      expect(await service.createMany(mockSessionMetadata, [{
        ...mockCommandExecutionPartial,
        result: executionResult,
      }])).toEqual([{
        ...mockCommandExecutionPartial,
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
        result: executionResult,
      }]);

      expect(encryptionService.encrypt).toHaveBeenLastCalledWith(JSON.stringify([{
        status: CommandExecutionStatus.Success,
        response: 'Results have been deleted since they exceed 1 MB. Re-run the command to see new results.',
      }]));
    });
    it('should return with flag isNotStored="true" even if size limit exceeded', async () => {
      repository.save.mockReturnValueOnce([{ ...mockCommandExecutionEntity, isNotStored: true }]);
      encryptionService.encrypt.mockReturnValue(mockEncryptResult);

      const executionResult = [{
        status: CommandExecutionStatus.Success,
        response: `${Buffer.alloc(WORKBENCH_CONFIG.maxResultSize, 'a').toString()}`,
      }];

      expect(await service.createMany(mockSessionMetadata, [{
        ...mockCommandExecutionPartial,
        result: executionResult,
      }])).toEqual([{
        ...mockCommandExecutionPartial,
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
        result: executionResult,
        isNotStored: true,
      }]);

      expect(encryptionService.encrypt).toHaveBeenLastCalledWith(JSON.stringify([
        new CommandExecutionResult({
          status: CommandExecutionStatus.Success,
          response: 'Results have been deleted since they exceed 1 MB. Re-run the command to see new results.',
        }),
      ]));
    });
  });
  describe('getList', () => {
    it('should return list (2) of command execution', async () => {
      const entityResponse = new CommandExecutionEntity({ ...omit(mockCommandExecutionEntity, 'result') });
      mockQueryBuilderGetMany.mockReturnValueOnce([entityResponse, entityResponse]);
      encryptionService.decrypt.mockReturnValueOnce(mockCreateCommandExecutionDto.command);
      encryptionService.decrypt.mockReturnValueOnce(mockCreateCommandExecutionDto.command);

      const commandExecution = new CommandExecution({
        ...omit(mockCommandExecutionPartial, ['result']),
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
      });

      expect(await service.getList(mockSessionMetadata, mockCommandExecutionEntity.databaseId)).toEqual([
        commandExecution,
        commandExecution,
      ]);
    });
    it('should return list (1) of command execution without failed decrypted item', async () => {
      const entityResponse = new CommandExecutionEntity({ ...omit(mockCommandExecutionEntity, 'result') });
      mockQueryBuilderGetMany.mockReturnValueOnce([entityResponse, entityResponse]);
      encryptionService.decrypt.mockReturnValueOnce(mockCreateCommandExecutionDto.command);
      encryptionService.decrypt.mockRejectedValueOnce(new KeytarDecryptionErrorException());

      const commandExecution = new CommandExecution({
        ...omit(mockCommandExecutionPartial, ['result']),
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
      });

      expect(await service.getList(mockSessionMetadata, mockCommandExecutionEntity.databaseId)).toEqual([
        commandExecution,
      ]);
    });
  });
  describe('getOne', () => {
    it('should return decrypted and transformed command execution', async () => {
      repository.findOneBy.mockResolvedValueOnce(mockCommandExecutionEntity);
      encryptionService.decrypt.mockReturnValueOnce(mockCreateCommandExecutionDto.command);
      encryptionService.decrypt.mockReturnValueOnce(JSON.stringify([mockCommandExecutionResult]));

      const commandExecution = new CommandExecution({
        ...mockCommandExecutionPartial,
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
      });

      expect(await service.getOne(mockSessionMetadata, mockDatabase.id, mockCommandExecutionEntity.id)).toEqual(
        commandExecution,
      );
    });
    it('should return null fields in case of decryption errors', async () => {
      repository.findOneBy.mockResolvedValueOnce(mockCommandExecutionEntity);
      encryptionService.decrypt.mockReturnValueOnce(mockCreateCommandExecutionDto.command);
      encryptionService.decrypt.mockRejectedValueOnce(new KeytarDecryptionErrorException());

      const commandExecution = new CommandExecution({
        ...mockCommandExecutionPartial,
        id: mockCommandExecutionEntity.id,
        createdAt: mockCommandExecutionEntity.createdAt,
        result: null,
      });

      expect(await service.getOne(mockSessionMetadata, mockDatabase.id, mockCommandExecutionEntity.id)).toEqual(
        commandExecution,
      );
    });
    it('should return not found exception', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      try {
        await service.getOne(mockSessionMetadata, mockDatabase.id, mockCommandExecutionEntity.id);
        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toEqual(ERROR_MESSAGES.COMMAND_EXECUTION_NOT_FOUND);
      }
    });
  });
  describe('delete', () => {
    it('Should not return anything on delete', async () => {
      repository.delete.mockResolvedValueOnce(1);
      expect(await service.delete(mockSessionMetadata, mockDatabase.id, mockCommandExecutionEntity.id)).toEqual(
        undefined,
      );
    });
  });
  describe('deleteAll', () => {
    it('Should not return anything on delete', async () => {
      repository.delete.mockResolvedValueOnce(1);
      expect(await service.deleteAll(mockSessionMetadata, mockDatabase.id)).toEqual(
        undefined,
      );
    });
  });
  describe('cleanupDatabaseHistory', () => {
    it('Should should not return anything on cleanup', async () => {
      mockQueryBuilderGetManyRaw.mockReturnValueOnce([
        { id: mockCommandExecutionEntity.id },
        { id: mockCommandExecutionEntity.id },
      ]);

      expect(await service['cleanupDatabaseHistory'](mockDatabase.id)).toEqual(
        undefined,
      );
    });
  });
});
