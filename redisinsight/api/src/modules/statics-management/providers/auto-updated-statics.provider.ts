import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as AdmZip from 'adm-zip';
import { URL } from 'url';
import { join } from 'path';
import { get } from 'lodash';
import { getFile } from 'src/utils';

import { IStaticsProviderOptions } from './auto-updated-statics.interface';

@Injectable()
export class AutoUpdatedStaticsProvider implements OnModuleInit {
  private readonly logger: Logger;

  private readonly options: IStaticsProviderOptions;

  constructor(options: IStaticsProviderOptions) {
    this.logger = new Logger(options.name);
    this.options = options;
  }

  /**
   * Updates latest json on startup
   */
  async onModuleInit() {
    if (this.options.shouldAutoUpdate) {
      // wait for populating default data (should take milliseconds)
      await this.initDefaults().catch((e) => this.logger.warn('Unable to populate default data', e));
      // async operation to not wait for it and not block user in case when no internet connection
      this.autoUpdate();
    }
  }

  /**
   * Simply copy default files prepared during build to the home directory when no files there
   */
  async initDefaults() {
    try {
      if (!await fs.pathExists(
        join(this.options.destinationPath, this.options.buildInfo),
      )) {
        await fs.ensureDir(this.options.destinationPath);
        await fs.copy(this.options.defaultSourcePath, this.options.destinationPath, {
          overwrite: true,
        });
      }
    } catch (e) {
      this.logger.error('Unable to create static files from default', e);
    }
  }

  /**
   * Update static files if needed
   */
  async autoUpdate() {
    this.logger.log('Checking for updates...');
    if (!this.options.devMode && await this.isUpdatesAvailable()) {
      this.logger.log('Updates available! Updating...');

      try {
        await this.updateStaticFiles();
      } catch (e) {
        this.logger.warn('Unable to update auto static files', e);
      }
    }
  }

  async updateStaticFiles(): Promise<void> {
    const latestArchive = await this.getLatestArchive();

    if (latestArchive) {
      const zip = new AdmZip(latestArchive as Buffer);
      await fs.remove(this.options.destinationPath);
      await zip.extractAllTo(this.options.destinationPath, true);
      await fs.writeFile(
        join(this.options.destinationPath, this.options.buildInfo),
        JSON.stringify(await this.getRemoteBuildInfo()),
      );
    }
  }

  /**
   * Download archive from remote
   */
  async getLatestArchive() {
    try {
      return await getFile(new URL(join(this.options.updateUrl, this.options.zip)).toString());
    } catch (e) {
      this.logger.warn('Unable to get remote archive', e);
      return null;
    }
  }

  /**
   * Compare current vs remote build timestamp to understand if update is available.
   *
   * Note: We decided to not use versioning (semver or similar)
   */
  async isUpdatesAvailable(): Promise<boolean> {
    const currentBuildInfo = await this.getCurrentBuildInfo();
    const remoteBuildInfo = await this.getRemoteBuildInfo();

    return get(remoteBuildInfo, ['timestamp'], 0) > get(currentBuildInfo, ['timestamp'], 0);
  }

  /**
   * Get checksum for the remote latest version
   */
  async getRemoteBuildInfo(): Promise<Record<string, any>> {
    try {
      const buildInfoBuffer = await getFile(new URL(join(this.options.updateUrl, this.options.buildInfo)).toString());
      return JSON.parse(buildInfoBuffer.toString());
    } catch (e) {
      this.logger.warn('Unable to get remote build info', e);
      return {};
    }
  }

  /**
   * Get checksum for the current version of statics
   */
  async getCurrentBuildInfo(): Promise<Record<string, any>> {
    try {
      return JSON.parse(await fs.readFile(
        join(this.options.destinationPath, this.options.buildInfo),
        'utf8',
      ));
    } catch (e) {
      this.logger.warn('Unable to get local checksum', e);
      return {};
    }
  }
}
