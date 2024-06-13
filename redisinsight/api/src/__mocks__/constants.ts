import { mockSessionMetadata } from 'src/__mocks__/common';

export const mockConstantsProvider = jest.fn(() => ({
  getSystemSessionMetadata: jest.fn().mockReturnValue(mockSessionMetadata),
}));
