import axios from 'axios';
import * as fs from 'fs-extra';
import config from 'src/utils/config';
import { AutoUpdatedStaticsProvider } from './auto-updated-statics.provider';

const PATH_CONFIG = config.get('dir_path');
const TUTORIALS = config.get('tutorials');

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

const mockedAdmZip = {
  extractAllTo: jest.fn(),
};
jest.mock('adm-zip', () => jest.fn().mockImplementation(() => mockedAdmZip));

describe('AutoUpdatedStaticsProvider', () => {
  let service: AutoUpdatedStaticsProvider;

  beforeEach(async () => {
    jest.mock('fs-extra', () => mockedFs);
    jest.mock('axios', () => mockedAxios);
    jest.mock('adm-zip', () => jest.fn().mockImplementation(() => mockedAdmZip));

    service = new AutoUpdatedStaticsProvider({
      name: 'TutorialsProvider',
      destinationPath: PATH_CONFIG.tutorials,
      defaultSourcePath: PATH_CONFIG.defaultTutorials,
      updateUrl: TUTORIALS.updateUrl,
      buildInfo: TUTORIALS.buildInfo,
      zip: TUTORIALS.zip,
      devMode: TUTORIALS.devMode,
      shouldAutoUpdate: true,
    });
  });

  describe('onModuleInit', () => {
    it('should not copy defaults when files already exists', async () => {
      const initDefaultsSpy = jest.spyOn(service, 'initDefaults');
      initDefaultsSpy.mockResolvedValueOnce();
      const autoUpdateSpy = jest.spyOn(service, 'autoUpdate');
      autoUpdateSpy.mockResolvedValueOnce();

      await service.onModuleInit();

      expect(initDefaultsSpy).toHaveBeenCalled();
      expect(autoUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('initDefaults', () => {
    it('should not copy defaults when files already exists', async () => {
      mockedFs.pathExists.mockImplementationOnce(async () => true);

      await service.initDefaults();

      expect(mockedFs.ensureDir).not.toHaveBeenCalled();
      expect(mockedFs.copy).not.toHaveBeenCalled();
    });
    it('should copy defaults when no files in home directory', async () => {
      mockedFs.pathExists.mockImplementationOnce(async () => false);

      await service.initDefaults();

      expect(mockedFs.ensureDir).toHaveBeenCalled();
      expect(mockedFs.copy).toHaveBeenCalled();
    });
    it('should not fail when there is an error during copying default files', async () => {
      mockedFs.pathExists.mockImplementationOnce(async () => false);
      mockedFs.copy.mockImplementationOnce(async () => { throw new Error(); });

      await service.initDefaults();
    });
  });

  describe('autoUpdate', () => {
    it('should not try to update when there is nothing to update', async () => {
      const isUpdatesAvailableSpy = jest.spyOn(service, 'isUpdatesAvailable');
      const updateStaticFilesSpy = jest.spyOn(service, 'updateStaticFiles');
      isUpdatesAvailableSpy.mockResolvedValueOnce(false);

      await service.autoUpdate();

      expect(updateStaticFilesSpy).not.toHaveBeenCalled();
    });
    it('should try to update', async () => {
      const isUpdatesAvailableSpy = jest.spyOn(service, 'isUpdatesAvailable');
      const updateStaticFilesSpy = jest.spyOn(service, 'updateStaticFiles');
      isUpdatesAvailableSpy.mockResolvedValueOnce(true);
      updateStaticFilesSpy.mockResolvedValueOnce();

      await service.autoUpdate();

      expect(updateStaticFilesSpy).toHaveBeenCalled();
    });
    it('should not throw and error when update failed', async () => {
      const isUpdatesAvailableSpy = jest.spyOn(service, 'isUpdatesAvailable');
      const updateStaticFilesSpy = jest.spyOn(service, 'updateStaticFiles');
      isUpdatesAvailableSpy.mockResolvedValueOnce(true);
      updateStaticFilesSpy.mockRejectedValueOnce(new Error());

      await service.autoUpdate();

      expect(updateStaticFilesSpy).toHaveBeenCalled();
    });
  });

  describe('updateStaticFiles', () => {
    it('should not process when no archive found', async () => {
      const getLatestArchiveSpy = jest.spyOn(service, 'getLatestArchive');
      getLatestArchiveSpy.mockResolvedValueOnce(null);

      await service.updateStaticFiles();

      expect(mockedFs.remove).not.toHaveBeenCalled();
    });
    it('should extract all files', async () => {
      const getLatestArchiveSpy = jest.spyOn(service, 'getLatestArchive');
      getLatestArchiveSpy.mockResolvedValueOnce(Buffer.from('asdasdsad'));
      mockedAdmZip.extractAllTo.mockResolvedValueOnce(true);
      mockedFs.writeFile.mockImplementationOnce(async () => true);

      await service.updateStaticFiles();
    });
  });

  describe('getLatestArchive', () => {
    it('should return latest archive buffer', async () => {
      const mockedArchiveBuffer = Buffer.alloc(10, 0);
      mockedAxios.get.mockResolvedValueOnce({ data: mockedArchiveBuffer });

      expect(await service.getLatestArchive()).toEqual(mockedArchiveBuffer);
    });
    it('should return null when error during downloading archive', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error());

      expect(await service.getLatestArchive()).toEqual(null);
    });
  });

  describe('isUpdatesAvailable', () => {
    let getCurrentBuildInfoSpy;
    let getRemoteBuildInfoSpy;

    beforeEach(() => {
      getCurrentBuildInfoSpy = jest.spyOn(service, 'getCurrentBuildInfo');
      getRemoteBuildInfoSpy = jest.spyOn(service, 'getRemoteBuildInfo');
    });

    it('should return true when current timestamp is less then remote', async () => {
      getCurrentBuildInfoSpy.mockResolvedValueOnce({ timestamp: 1 });
      getRemoteBuildInfoSpy.mockResolvedValueOnce({ timestamp: 2 });
      expect(await service.isUpdatesAvailable()).toEqual(true);
    });
    it('should return true when no current timestamp but remote timestamp exists', async () => {
      getCurrentBuildInfoSpy.mockResolvedValueOnce({});
      getRemoteBuildInfoSpy.mockResolvedValueOnce({ timestamp: 2 });
      expect(await service.isUpdatesAvailable()).toEqual(true);
    });
    it('should return false when no remote timestamp but has current', async () => {
      getCurrentBuildInfoSpy.mockResolvedValueOnce({ timestamp: 2 });
      getRemoteBuildInfoSpy.mockResolvedValueOnce({});
      expect(await service.isUpdatesAvailable()).toEqual(false);
    });
    it('should return false when no remote and current timestamps', async () => {
      getCurrentBuildInfoSpy.mockResolvedValueOnce({});
      getRemoteBuildInfoSpy.mockResolvedValueOnce({});
      expect(await service.isUpdatesAvailable()).toEqual(false);
    });
    it('should return false when remote is less then current', async () => {
      getCurrentBuildInfoSpy.mockResolvedValueOnce({ timestamp: 2 });
      getRemoteBuildInfoSpy.mockResolvedValueOnce({ timestamp: 1 });
      expect(await service.isUpdatesAvailable()).toEqual(false);
    });
  });

  describe('getRemoteBuildInfo', () => {
    it('should return remote build info json', async () => {
      const mockRemoteBuildInfo = { timestamp: 1 };
      mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from(JSON.stringify(mockRemoteBuildInfo)) });
      expect(await service.getRemoteBuildInfo()).toEqual(mockRemoteBuildInfo);
    });
    it('should return empty object on fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error());
      expect(await service.getRemoteBuildInfo()).toEqual({});
    });
  });

  describe('getCurrentBuildInfo', () => {
    it('should return current build info json', async () => {
      const mockCurrentBuildInfo = { timestamp: 3 };
      mockedFs.readFile.mockImplementationOnce(async () => Buffer.from(JSON.stringify(mockCurrentBuildInfo)));
      expect(await service.getCurrentBuildInfo()).toEqual(mockCurrentBuildInfo);
    });
    it('should return empty object on fail', async () => {
      mockedFs.readFile.mockImplementationOnce(async () => { throw new Error(); });

      expect(await service.getCurrentBuildInfo()).toEqual({});
    });
  });
});
