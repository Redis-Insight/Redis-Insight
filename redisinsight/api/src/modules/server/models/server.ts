import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum BuildType {
  RedisStack = 'REDIS_STACK',
  Electron = 'ELECTRON',
  DockerOnPremise = 'DOCKER_ON_PREMISE',
  VSCode = 'VS_CODE',
}

export enum PackageType {
  Flatpak = 'flatpak',
  Snap = 'snap',
  UnknownLinux = 'unknown-linux',
  AppImage = 'app-image',
  Mas = 'mas',
  UnknownDarwin = 'unknown-darwin',
  WindowsStore = 'windows-store',
  UnknownWindows = 'unknown-windows',
  Unknown = 'unknown',
}

export enum AppType {
  RedisStackWeb = 'REDIS_STACK_WEB',
  RedisStackApp = 'REDIS_STACK_ELECTRON',
  Electron = 'ELECTRON',
  Docker = 'DOCKER',
  VSCode = 'VS_CODE',
  Unknown = 'UNKNOWN',
}

export class Server {
  @ApiProperty({
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    type: Date,
  })
  @Expose()
  createDateTime: string;
}
