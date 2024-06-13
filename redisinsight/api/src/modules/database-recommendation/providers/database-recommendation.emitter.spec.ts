import { Test, TestingModule } from '@nestjs/testing';
import {
  mockDatabaseRecommendation,
  mockDatabaseRecommendationRepository,
  MockType,
} from 'src/__mocks__';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { RecommendationServerEvents } from 'src/modules/database-recommendation/constants';
import {
  DatabaseRecommendationEmitter,
} from 'src/modules/database-recommendation/providers/database-recommendation.emitter';
import { DatabaseRecommendationRepository } from '../repositories/database-recommendation.repository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('DatabaseRecommendationEmitter', () => {
  let service: DatabaseRecommendationEmitter;
  let databaseRecommendationRepositoryMock: MockType<DatabaseRecommendationRepository>;
  let emitter: MockType<EventEmitter2>;

  beforeEach(async () => {
    jest.mock('axios', () => mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseRecommendationEmitter,
        EventEmitter2,
        {
          provide: EventEmitter2,
          useFactory: () => mockEventEmitter,
        },
        {
          provide: DatabaseRecommendationRepository,
          useFactory: mockDatabaseRecommendationRepository,
        },
      ],
    }).compile();

    service = await module.get(DatabaseRecommendationEmitter);
    databaseRecommendationRepositoryMock = await module.get(DatabaseRecommendationRepository);
    emitter = await module.get(EventEmitter2);
    emitter.emit.mockReset();
  });

  describe('newRecommendation', () => {
    it('should return undefined if no recommendations passed', async () => {
      await service.newRecommendation([]);
      expect(emitter.emit).toHaveBeenCalledTimes(0);
    });
    it('should emit 2 new recommendations', async () => {
      databaseRecommendationRepositoryMock.getTotalUnread.mockResolvedValueOnce(2);

      await service.newRecommendation([mockDatabaseRecommendation, mockDatabaseRecommendation]);
      expect(emitter.emit).toHaveBeenCalledTimes(1);
      expect(emitter.emit).toHaveBeenCalledWith(
        RecommendationServerEvents.Recommendation,
        mockDatabaseRecommendation.databaseId,
        {
          recommendations: [
            mockDatabaseRecommendation,
            mockDatabaseRecommendation,
          ],
          totalUnread: 2,
        },
      );
    });
    it('should log an error but not fail', async () => {
      databaseRecommendationRepositoryMock.getTotalUnread.mockRejectedValueOnce(new Error('test error'));

      await service.newRecommendation([mockDatabaseRecommendation]);

      expect(emitter.emit).toHaveBeenCalledTimes(0);
    });
  });
});
