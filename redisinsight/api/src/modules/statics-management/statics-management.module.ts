import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import config, { Config } from 'src/utils/config';
import { Response } from 'express';
import { AutoUpdatedStaticsProvider } from './providers/auto-updated-statics.provider';

const SERVER_CONFIG = config.get('server') as Config['server'];
const PATH_CONFIG = config.get('dir_path') as Config['dir_path'];
const TUTORIALS_CONFIG = config.get('tutorials') as Config['tutorials'];

const CONTENT_CONFIG = config.get('content');

const downloadableStaticFiles = (res: Response) => {
  if (res.req?.query?.download === 'true') {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment;');
  }
};

@Module({})
export class StaticsManagementModule {
  static register({ shouldAutoUpdate } = { shouldAutoUpdate: true }): DynamicModule {
    return {
      module: StaticsManagementModule,
      imports: [
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.tutorialsUri,
          rootPath: join(PATH_CONFIG.tutorials),
          serveStaticOptions: {
            fallthrough: false,
            setHeaders: downloadableStaticFiles,
          },
        }),
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.customTutorialsUri,
          rootPath: join(PATH_CONFIG.customTutorials),
          serveStaticOptions: {
            fallthrough: false,
            setHeaders: downloadableStaticFiles,
          },
        }),
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.contentUri,
          rootPath: join(PATH_CONFIG.content),
          serveStaticOptions: {
            fallthrough: false,
          },
        }),
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.defaultPluginsUri,
          rootPath: join(PATH_CONFIG.defaultPlugins),
          serveStaticOptions: {
            fallthrough: false,
          },
        }),
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.customPluginsUri,
          rootPath: join(PATH_CONFIG.customPlugins),
          serveStaticOptions: {
            fallthrough: false,
          },
        }),
        ServeStaticModule.forRoot({
          serveRoot: SERVER_CONFIG.pluginsAssetsUri,
          rootPath: join(PATH_CONFIG.pluginsAssets),
          serveStaticOptions: {
            fallthrough: false,
          },
        }),
      ],
      providers: [
        {
          provide: 'TutorialsProvider',
          useFactory: () => new AutoUpdatedStaticsProvider({
            name: 'TutorialsProvider',
            destinationPath: PATH_CONFIG.tutorials,
            defaultSourcePath: PATH_CONFIG.defaultTutorials,
            shouldAutoUpdate,
            ...TUTORIALS_CONFIG,
          }),
        },
        {
          provide: 'ContentProvider',
          useFactory: () => new AutoUpdatedStaticsProvider({
            name: 'ContentProvider',
            destinationPath: PATH_CONFIG.content,
            defaultSourcePath: PATH_CONFIG.defaultContent,
            shouldAutoUpdate,
            ...CONTENT_CONFIG,
          }),
        },
      ],
    }
  }
}
