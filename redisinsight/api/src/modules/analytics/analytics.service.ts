import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { get } from 'lodash';
import * as Analytics from 'analytics-node';
import { AppAnalyticsEvents } from 'src/constants';
import config from 'src/utils/config';
import { SettingsService } from 'src/modules/settings/settings.service';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';

export const NON_TRACKING_ANONYMOUS_ID = '00000000-0000-0000-0000-000000000001';
const ANALYTICS_CONFIG = config.get('analytics');

export interface ITelemetryEvent {
  event: string;
  eventData: Object;
  nonTracking: boolean;
  traits?: Object;
}

export interface ITelemetryInitEvent {
  anonymousId: string;
  sessionId: number;
  appType: string;
  controlNumber: number;
  controlGroup: string;
  appVersion: string;
}

export enum Telemetry {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

@Injectable()
export class AnalyticsService {
  private anonymousId: string = NON_TRACKING_ANONYMOUS_ID;

  private sessionId: number = -1;

  private appType: string = 'unknown';

  private controlNumber: number = -1;

  private controlGroup: string = '-1';

  private appVersion: string = '2.0.0';

  private analytics: Analytics;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly constantsProvider: ConstantsProvider,
  ) {}

  public getAnonymousId(): string {
    return this.anonymousId;
  }

  @OnEvent(AppAnalyticsEvents.Initialize)
  public initialize(payload: ITelemetryInitEvent) {
    const {
      anonymousId, sessionId, appType, controlNumber, controlGroup, appVersion,
    } = payload;
    this.sessionId = sessionId;
    this.anonymousId = anonymousId;
    this.appType = appType;
    this.controlGroup = controlGroup;
    this.appVersion = appVersion;
    this.controlNumber = controlNumber;
    this.analytics = new Analytics(ANALYTICS_CONFIG.writeKey, {
      flushInterval: ANALYTICS_CONFIG.flushInterval,
    });
  }

  @OnEvent(AppAnalyticsEvents.Track)
  async sendEvent(payload: ITelemetryEvent) {
    try {
      // The event is reported only if the user's permission is granted.
      // The anonymousId is also sent along with the event.
      //
      // The `nonTracking` argument can be set to True to mark an event that doesn't track the specific
      // user in any way. When `nonTracking` is True, the event is sent regardless of whether the user's permission
      // for analytics is granted or not.
      // If permissions not granted
      // anonymousId will includes "00000000-0000-0000-0000-000000000001" value without any user identifiers.
      const {
        event, eventData, nonTracking, traits = {},
      } = payload;
      const isAnalyticsGranted = await this.checkIsAnalyticsGranted();

      if (isAnalyticsGranted || nonTracking) {
        this.analytics.track({
          anonymousId: !isAnalyticsGranted && nonTracking ? NON_TRACKING_ANONYMOUS_ID : this.anonymousId,
          integrations: { Amplitude: { session_id: this.sessionId } },
          event,
          context: {
            traits: {
              ...traits,
              telemetry: isAnalyticsGranted ? Telemetry.Enabled : Telemetry.Disabled,
            },
          },
          properties: {
            ...eventData,
            anonymousId: this.anonymousId,
            buildType: this.appType,
            controlNumber: this.controlNumber,
            controlGroup: this.controlGroup,
            appVersion: this.appVersion,
          },
        });
      }
    } catch (e) {
      // continue regardless of error
    }
  }

  @OnEvent(AppAnalyticsEvents.Page)
  async sendPage(payload: ITelemetryEvent) {
    try {
      // The event is reported only if the user's permission is granted.
      // The anonymousId is also sent along with the event.
      //
      // The `nonTracking` argument can be set to True to mark an event that doesn't track the specific
      // user in any way. When `nonTracking` is True, the event is sent regardless of whether the user's permission
      // for analytics is granted or not.
      // If permissions not granted anonymousId includes "UNSET" value without any user identifiers.
      const {
        event, eventData, nonTracking, traits = {},
      } = payload;
      const isAnalyticsGranted = await this.checkIsAnalyticsGranted();

      if (isAnalyticsGranted || nonTracking) {
        this.analytics.page({
          name: event,
          anonymousId: !isAnalyticsGranted && nonTracking ? NON_TRACKING_ANONYMOUS_ID : this.anonymousId,
          integrations: { Amplitude: { session_id: this.sessionId } },
          context: {
            traits: {
              ...traits,
              telemetry: isAnalyticsGranted ? Telemetry.Enabled : Telemetry.Disabled,
            },
          },
          properties: {
            ...eventData,
            anonymousId: this.anonymousId,
            buildType: this.appType,
            controlNumber: this.controlNumber,
            controlGroup: this.controlGroup,
            appVersion: this.appVersion,
          },
        });
      }
    } catch (e) {
      // continue regardless of error
    }
  }

  private async checkIsAnalyticsGranted() {
    return !!get(
      // todo: [USER_CONTEXT] define how to fetch userId?
      await this.settingsService.getAppSettings(this.constantsProvider.getSystemSessionMetadata()),
      'agreements.analytics',
      false,
    );
  }
}
