import { Test, TestingModule } from '@nestjs/testing';
import {
  mockAppSettings,
  mockAppSettingsWithoutPermissions, mockAppVersion, mockConstantsProvider, mockControlGroup, mockControlNumber,
  mockSettingsService,
  MockType,
} from 'src/__mocks__';
import { TelemetryEvents } from 'src/constants';
import { AppType } from 'src/modules/server/models/server';
import { SettingsService } from 'src/modules/settings/settings.service';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';
import {
  AnalyticsService,
  Telemetry,
  NON_TRACKING_ANONYMOUS_ID,
} from './analytics.service';

let mockAnalyticsTrack;
let mockAnalyticsPage;
jest.mock(
  'analytics-node',
  () => jest.fn()
    .mockImplementation(() => ({
      track: mockAnalyticsTrack,
      page: mockAnalyticsPage,
    })),
);

const mockAnonymousId = 'a77b23c1-7816-4ea4-b61f-d37795a0f805';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let settingsService: MockType<SettingsService>;
  const sessionId = new Date().getTime();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: SettingsService,
          useFactory: mockSettingsService,
        },
        {
          provide: ConstantsProvider,
          useFactory: mockConstantsProvider,
        },
      ],
    }).compile();

    settingsService = module.get(SettingsService);
    service = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    const anonymousId = service.getAnonymousId();

    expect(service).toBeDefined();
    expect(anonymousId).toEqual(NON_TRACKING_ANONYMOUS_ID);
  });

  describe('initialize', () => {
    it('should set anonymousId', () => {
      service.initialize({
        anonymousId: mockAnonymousId,
        sessionId,
        appType: AppType.Electron,
        controlNumber: mockControlNumber,
        controlGroup: mockControlGroup,
        appVersion: mockAppVersion,
      });

      const anonymousId = service.getAnonymousId();

      expect(anonymousId).toEqual(mockAnonymousId);
    });
  });

  describe('sendEvent', () => {
    beforeEach(() => {
      mockAnalyticsTrack = jest.fn();
      service.initialize({
        anonymousId: mockAnonymousId,
        sessionId,
        appType: AppType.Electron,
        controlNumber: mockControlNumber,
        controlGroup: mockControlGroup,
        appVersion: mockAppVersion,
      });
    });
    it('should send event with anonymousId if permission are granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettings);

      await service.sendEvent({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: false,
      });

      expect(mockAnalyticsTrack).toHaveBeenCalledWith({
        anonymousId: mockAnonymousId,
        integrations: { Amplitude: { session_id: sessionId } },
        event: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Enabled,
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
    it('should not send event if permission are not granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettingsWithoutPermissions);

      await service.sendEvent({
        event: 'SOME_EVENT',
        eventData: {},
        nonTracking: false,
      });

      expect(mockAnalyticsTrack).not.toHaveBeenCalled();
    });
    it('should send event for non tracking events event if permission are not granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettingsWithoutPermissions);

      await service.sendEvent({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: true,
      });

      expect(mockAnalyticsTrack).toHaveBeenCalledWith({
        anonymousId: NON_TRACKING_ANONYMOUS_ID,
        integrations: { Amplitude: { session_id: sessionId } },
        event: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Disabled,
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
    it('should send event for non tracking with regular payload', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettings);

      await service.sendEvent({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: true,
      });

      expect(mockAnalyticsTrack).toHaveBeenCalledWith({
        anonymousId: mockAnonymousId,
        integrations: { Amplitude: { session_id: sessionId } },
        event: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Enabled,
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
  });

  describe('sendPage', () => {
    beforeEach(() => {
      mockAnalyticsPage = jest.fn();
      service.initialize({
        anonymousId: mockAnonymousId,
        sessionId,
        appType: AppType.Electron,
        controlNumber: mockControlNumber,
        controlGroup: mockControlGroup,
        appVersion: mockAppVersion,
      });
    });
    it('should send page with anonymousId if permission are granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettings);

      await service.sendPage({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: false,
        traits: {
          telemetry: 'will be overwritten',
          custom: 'trait',
        },
      });

      expect(mockAnalyticsPage).toHaveBeenCalledWith({
        anonymousId: mockAnonymousId,
        integrations: { Amplitude: { session_id: sessionId } },
        name: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Enabled,
            custom: 'trait',
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
    it('should not send page if permission are not granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettingsWithoutPermissions);

      await service.sendPage({
        event: 'SOME_EVENT',
        eventData: {},
        nonTracking: false,
      });

      expect(mockAnalyticsPage).not.toHaveBeenCalled();
    });
    it('should send page for non tracking events event if permission are not granted', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettingsWithoutPermissions);

      await service.sendPage({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: true,
      });

      expect(mockAnalyticsPage).toHaveBeenCalledWith({
        anonymousId: NON_TRACKING_ANONYMOUS_ID,
        integrations: { Amplitude: { session_id: sessionId } },
        name: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Disabled,
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
    it('should send page for non tracking events with regular payload', async () => {
      settingsService.getAppSettings.mockResolvedValue(mockAppSettings);

      await service.sendPage({
        event: TelemetryEvents.ApplicationStarted,
        eventData: {},
        nonTracking: true,
      });

      expect(mockAnalyticsPage).toHaveBeenCalledWith({
        anonymousId: mockAnonymousId,
        integrations: { Amplitude: { session_id: sessionId } },
        name: TelemetryEvents.ApplicationStarted,
        context: {
          traits: {
            telemetry: Telemetry.Enabled,
          },
        },
        properties: {
          anonymousId: mockAnonymousId,
          buildType: AppType.Electron,
          controlNumber: mockControlNumber,
          controlGroup: mockControlGroup,
          appVersion: mockAppVersion,
        },
      });
    });
  });
});
