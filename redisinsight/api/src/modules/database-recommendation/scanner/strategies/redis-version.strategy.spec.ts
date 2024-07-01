import { RedisVersionStrategy } from 'src/modules/database-recommendation/scanner/strategies';

describe('RedisVersionStrategy', () => {
  let strategy: RedisVersionStrategy;

  beforeEach(() => {
    strategy = new RedisVersionStrategy();
  });

  describe('isRecommendationReached', () => {
    describe('with search module', () => {
      it('should return false when version is more then 7.3', async () => {
        expect(
          await strategy.isRecommendationReached({ version: '7.4.0' }),
        ).toEqual({ isReached: false });
      });

      it('should return false when version is equal to 7.3', async () => {
        expect(
          await strategy.isRecommendationReached({ version: '7.3' }),
        ).toEqual({ isReached: false });
      });

      it('should return true when version less then 7.3', async () => {
        expect(
          await strategy.isRecommendationReached({ version: '6.0.0' }),
        ).toEqual({ isReached: true });
      });
    });
  });
});
