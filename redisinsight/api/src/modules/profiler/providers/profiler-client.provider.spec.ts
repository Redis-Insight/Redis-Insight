import { Test, TestingModule } from '@nestjs/testing';
import { LogFileProvider } from 'src/modules/profiler/providers/log-file.provider';
import {
  mockDatabaseService,
  mockLogFile, mockLogFileProvider, mockMonitorSettings,
  mockSessionMetadata,
  mockSocket,
  MockType,
} from 'src/__mocks__';
import { ProfilerClientProvider } from 'src/modules/profiler/providers/profiler-client.provider';
import { DatabaseService } from 'src/modules/database/database.service';

describe('ProfilerClientProvider', () => {
  let service: ProfilerClientProvider;
  let logFileProvider: MockType<LogFileProvider>;
  let databaseService: MockType<DatabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilerClientProvider,
        {
          provide: LogFileProvider,
          useFactory: () => mockLogFileProvider,
        },
        {
          provide: DatabaseService,
          useFactory: mockDatabaseService,
        },
      ],
    }).compile();

    service = await module.get(ProfilerClientProvider);
    logFileProvider = await module.get(LogFileProvider);
    databaseService = await module.get(DatabaseService);

    logFileProvider.getOrCreate.mockReturnValue(mockLogFile);
  });

  it('getOrCreateClient', async () => {
    await service.getOrCreateClient(
      mockSessionMetadata,
      mockLogFile.instanceId,
      mockSocket,
      null,
    );

    expect(service['profilerClients'].size).toEqual(1);
    expect(databaseService.get).not.toHaveBeenCalled();
    expect(logFileProvider.getOrCreate).not.toHaveBeenCalled();

    await service.getOrCreateClient(
      mockSessionMetadata,
      mockLogFile.instanceId,
      { ...mockSocket, id: '2' },
      mockMonitorSettings,
    );

    expect(service['profilerClients'].size).toEqual(2);
    expect(databaseService.get).toHaveBeenCalled();
    expect(logFileProvider.getOrCreate).toHaveBeenCalled();
  });

  it('getClient', async () => {
    const profilerClient = await service.getOrCreateClient(
      mockSessionMetadata,
      mockLogFile.instanceId,
      mockSocket,
      null,
    );

    expect(await service.getClient(profilerClient.id)).toEqual(profilerClient);
  });
});
