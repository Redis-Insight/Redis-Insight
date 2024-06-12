import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import config, { Config } from 'src/utils/config';
import { join, posix } from 'path';
import * as fs from 'fs';

const SERVER_CONFIG = config.get('server') as Config['server'];

@Injectable()
export class GzipMiddleware implements NestMiddleware {
  use({ url }: Request, res: Response, next: NextFunction) {
    const assetsUrl = posix.join('/', SERVER_CONFIG.proxyPath, 'assets');

    if(!url.startsWith(assetsUrl)) {
      next()
      return
    }

    let urlWithoutProxy = url
    if(SERVER_CONFIG.proxyPath) {
      urlWithoutProxy = url.replace(`/${SERVER_CONFIG.proxyPath}`, '');
    }

    const filePath = join(__dirname, '..', '..', '..', '..', 'ui', 'dist', `${urlWithoutProxy}.gz`);


    if (fs.existsSync(filePath)) {
      const readStream = fs.createReadStream(filePath);
      res.set({
        'Content-Encoding': 'gzip',
        'Content-Type': getFileContentType(urlWithoutProxy),
      });
      readStream.pipe(res);
    } else {
      next();
    }
  }
}

function getFileContentType(url: string): string {
  if (url.endsWith('.js')) {
    return 'text/javascript';
  } else if (url.endsWith('.css')) {
    return 'text/css';
  }
  // all other file types
  return 'text/plain';
}
