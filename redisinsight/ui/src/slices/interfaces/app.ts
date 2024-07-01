import { AxiosError } from 'axios'
import { RelativeWidthSizes } from 'uiSrc/components/virtual-table/interfaces'
import { Nullable } from 'uiSrc/utils'
import { DurationUnits, FeatureFlags, ICommands, SortOrder } from 'uiSrc/constants'
import { GetServerInfoResponse } from 'apiSrc/modules/server/dto/server.dto'
import { RedisString as RedisStringAPI } from 'apiSrc/common/constants/redis-string'

export interface CustomError {
  details?: any[];
  error: string
  message: string
  statusCode: number
  errorCode?: number
  resourceId?: string
}

export interface ErrorOptions {
  message: string | JSX.Element
  code?: string
  config?: object
  request?: object
  response?: object
}

export interface EnhancedAxiosError extends AxiosError<CustomError> {
}

export interface IError extends AxiosError {
  id: string
  instanceId?: string
  title?: string
  additionalInfo?: Record<string, any>
}

export interface IMessage {
  id: string
  title: string
  message: string | JSX.Element
  group?: string
  className?: string
}

export enum AppWorkspace {
  Databases = 'databases',
  RDI = 'rdi'
}

export interface StateAppInfo {
  loading: boolean
  error: string
  server: Nullable<GetServerInfoResponse>
  encoding: RedisResponseEncoding,
  electron: {
    isUpdateAvailable: Nullable<boolean>
    updateDownloadedVersion: string
    isReleaseNotesViewed: Nullable<boolean>
  }
  isShortcutsFlyoutOpen: boolean
}

export interface StateAppContext {
  workspace: AppWorkspace
  contextInstanceId: string
  contextRdiInstanceId: string
  lastBrowserPage: string
  dbConfig: {
    treeViewDelimiter: string
    treeViewSort: SortOrder
    slowLogDurationUnit: DurationUnits
    showHiddenRecommendations: boolean
  }
  dbIndex: {
    disabled: boolean
  }
  browser: {
    keyList: {
      isDataPatternLoaded: boolean
      isDataRedisearchLoaded: boolean
      scrollPatternTopPosition: number
      scrollRedisearchTopPosition: number
      isNotRendered: boolean
      selectedKey: Nullable<RedisResponseBuffer>
    }
    panelSizes: {
      [key: string]: number
    }
    tree: {
      delimiter: string
      openNodes: {
        [key: string]: boolean
      }
      selectedLeaf: Nullable<string>
    }
    bulkActions: {
      opened: boolean
    },
    keyDetailsSizes: {
      [key: string]: Nullable<RelativeWidthSizes>
    }
  }
  workbench: {
    script: string
    panelSizes: {
      vertical: {
        [key: string]: number
      }
    }
  }
  pubsub: {
    channel: string
    message: string
  }
  analytics: {
    lastViewedPage: string
  }
  capability: {
    source: string
  }
  pipelineManagement: {
    lastViewedPage: string
    isOpenDialog: boolean
  }
}

export interface StateAppRedisCommands {
  loading: boolean
  error: string
  spec: ICommands
  commandsArray: string[]
  commandGroups: string[]
}

export interface IPluginVisualization {
  id: string
  uniqId: string
  name: string
  plugin: any
  activationMethod: string
  matchCommands: string[]
  default?: boolean
  iconDark?: string
  iconLight?: string
}

export interface PluginsResponse {
  static: string
  plugins: IPlugin[]
}
export interface IPlugin {
  name: string
  main: string
  styles: string | string[]
  baseUrl: string
  visualizations: any[]
  internal?: boolean
}

export interface StateAppPlugins {
  loading: boolean
  error: string
  staticPath: string
  plugins: IPlugin[]
  visualizations: IPluginVisualization[]
}

export interface StateAppSocketConnection {
  isConnected: boolean
}

export interface FeatureFlagComponent {
  flag: boolean
  variant?: string
  data?: any
}

export interface StateAppFeatures {
  highlighting: {
    version: string
    features: string[]
    pages: {
      [key: string]: string[]
    }
  }
  onboarding: {
    currentStep: number
    totalSteps: number
    isActive: boolean
  },
  featureFlags: {
    loading: boolean
    features: {
      [key in FeatureFlags]?: FeatureFlagComponent
    }
  }
}
export enum NotificationType {
  Global = 'global'
}

export interface IGlobalNotification {
  type: string
  timestamp: number
  title: string
  body: string
  read: boolean
  category?: string
  categoryColor?: string
}

export interface InfiniteMessage {
  id: string
  Inner: string | JSX.Element
  className?: string
}

export interface StateAppNotifications {
  errors: IError[]
  messages: IMessage[]
  infiniteMessages: InfiniteMessage[]
  notificationCenter: {
    loading: boolean
    lastReceivedNotification: Nullable<IGlobalNotification>
    notifications: IGlobalNotification[]
    isNotificationOpen: boolean
    isCenterOpen: boolean
    totalUnread: number
    shouldDisplayToast: boolean
  }
}

export enum ActionBarStatus {
  Progress = 'progress',
  Success = 'success',
  Default = 'default',
  Close = 'close',
}

export enum RedisResponseEncoding {
  UTF8 = 'utf8',
  ASCII = 'ascii',
  Buffer = 'buffer',
}

export enum RedisResponseBufferType {
  Buffer = 'Buffer'
}

export type RedisResponseBuffer = {
  type: RedisResponseBufferType
  data: UintArray
} & Exclude<RedisStringAPI, string>

export type RedisString = string | RedisResponseBuffer

export type UintArray = number[] | Uint8Array
