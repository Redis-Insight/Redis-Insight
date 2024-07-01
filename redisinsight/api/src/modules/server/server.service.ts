import {
  Injectable, InternalServerErrorException, Logger, OnApplicationBootstrap,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import config, { Config } from 'src/utils/config';
import { AppAnalyticsEvents } from 'src/constants/app-events';
import { TelemetryEvents } from 'src/constants/telemetry-events';
import { ServerInfoNotFoundException } from 'src/constants/exceptions';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { ServerRepository } from 'src/modules/server/repositories/server.repository';
import { AppType, BuildType, PackageType } from 'src/modules/server/models/server';
import { GetServerInfoResponse } from 'src/modules/server/dto/server.dto';
import { FeaturesConfigService } from 'src/modules/feature/features-config.service';

const SERVER_CONFIG = config.get('server') as Config['server'];
const REDIS_STACK_CONFIG = config.get('redisStack') as Config['redisStack'];

@Injectable()
export class ServerService implements OnApplicationBootstrap {
  private logger = new Logger('ServerService');

  private sessionId: number;

  constructor(
    private readonly repository: ServerRepository,
    private readonly featuresConfigService: FeaturesConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onApplicationBootstrap(sessionId: number = new Date().getTime()) {
    this.sessionId = sessionId;
    await this.upsertServerInfo();
  }

  // todo: make id required
  private async upsertServerInfo(id: string = '') {
    this.logger.log('Checking server info.');

    let startEvent = TelemetryEvents.ApplicationFirstStart;

    if (await this.repository.exists(id)) {
      this.logger.log('First application launch.');
      startEvent = TelemetryEvents.ApplicationStarted;
    }

    const server = await this.repository.getOrCreate(id);

    this.logger.log('Application started.');

    this.eventEmitter.emit(AppAnalyticsEvents.Initialize, {
      anonymousId: server.id,
      sessionId: this.sessionId,
      appType: ServerService.getAppType(SERVER_CONFIG.buildType),
      appVersion: SERVER_CONFIG.appVersion,
      packageType: ServerService.getPackageType(SERVER_CONFIG.buildType),
      ...(await this.featuresConfigService.getControlInfo()),
    });

    // do not track start events for non-electron builds
    if (SERVER_CONFIG?.buildType.toUpperCase() === 'ELECTRON') {
      this.eventEmitter.emit(AppAnalyticsEvents.Track, {
        event: startEvent,
        eventData: {
          appVersion: SERVER_CONFIG.appVersion,
          osPlatform: process.platform,
          buildType: SERVER_CONFIG.buildType,
          port: SERVER_CONFIG.port,
          packageType: ServerService.getPackageType(SERVER_CONFIG.buildType),
        },
        nonTracking: true,
      });
    }
  }

  /**
   * Method to get server info
   */
  public async getInfo(id = ''): Promise<GetServerInfoResponse> {
    this.logger.log('Getting server info.');
    try {
      const info = await this.repository.getOrCreate(id);
      if (!info) {
        return Promise.reject(new ServerInfoNotFoundException());
      }

      const result = {
        ...info,
        sessionId: this.sessionId,
        appVersion: SERVER_CONFIG.appVersion,
        osPlatform: process.platform,
        buildType: SERVER_CONFIG.buildType,
        appType: ServerService.getAppType(SERVER_CONFIG.buildType),
        encryptionStrategies: await this.encryptionService.getAvailableEncryptionStrategies(),
        fixedDatabaseId: REDIS_STACK_CONFIG?.id,
        packageType: ServerService.getPackageType(SERVER_CONFIG.buildType),
        ...(await this.featuresConfigService.getControlInfo()),
      };
      this.logger.log('Succeed to get server info.');
      return result;
    } catch (error) {
      this.logger.error('Failed to get application settings.', error);
      throw new InternalServerErrorException();
    }
  }

  static getAppType(buildType: string): AppType {
    switch (buildType) {
      case BuildType.DockerOnPremise:
        return AppType.Docker;
      case BuildType.Electron:
        return AppType.Electron;
      case BuildType.RedisStack:
        return AppType.RedisStackWeb;
      case BuildType.VSCode:
        return AppType.VSCode;
      default:
        return AppType.Unknown;
    }
  }

  static getPackageType(buildType: string): PackageType {
    if (buildType === BuildType.Electron) {
      // Darwin
      if (process.platform === 'darwin') {
        if (process.env.mas || process['mas']) {
          return PackageType.Mas;
        }

        return PackageType.UnknownDarwin;
      }

      // Linux
      if (process.platform === 'linux') {
        if (process.env.APPIMAGE) {
          return PackageType.AppImage;
        }

        if (process.env.SNAP_INSTANCE_NAME || process.env.SNAP_DATA) {
          return PackageType.Snap;
        }

        if (process.env.container) {
          return PackageType.Flatpak;
        }

        return PackageType.UnknownLinux;
      }

      // Windows
      if (process.platform === 'win32') {
        if (process.env.windowsStore || process['windowsStore']) {
          return PackageType.WindowsStore;
        }

        return PackageType.UnknownWindows;
      }

      return PackageType.Unknown;
    }

    return undefined;
  }
}
