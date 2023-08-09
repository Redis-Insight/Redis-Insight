import { AxiosError } from 'axios'
import { RelativeWidthSizes } from 'uiSrc/components/virtual-table/interfaces'
import { Nullable } from 'uiSrc/utils'
import { DurationUnits, FeatureFlags, ICommands } from 'uiSrc/constants'
import { IKeyPropTypes } from 'uiSrc/constants/prop-types/keys'
import { GetServerInfoResponse } from 'apiSrc/modules/server/dto/server.dto'
import { RedisString as RedisStringAPI } from 'apiSrc/common/constants/redis-string'
import { CloudUser } from 'apiSrc/modules/cloud/user/models'
import { CloudJobInfo } from 'apiSrc/modules/cloud/job/models'
import { CloudSubscriptionPlanResponse } from 'apiSrc/modules/cloud/subscription/dto'
import { Instance } from './instances'

export interface CustomError {
  error: string
  message: string
  statusCode: number
  errorCode?: number
}

export interface EnhancedAxiosError extends AxiosError<CustomError> {
}

export interface IError extends AxiosError {
  id: string
  instanceId?: string
  title?: string
}

export interface IMessage {
  id: string
  title: string
  message: string | JSX.Element
  group?: string
  className?: string
}

export interface StateAppInfo {
  loading: boolean
  error: string
  server: Nullable<GetServerInfoResponse>
  encoding: RedisResponseEncoding,
  analytics: {
    segmentWriteKey: string
    identified: boolean
  }
  electron: {
    isUpdateAvailable: Nullable<boolean>
    updateDownloadedVersion: string
    isReleaseNotesViewed: Nullable<boolean>
  }
  isShortcutsFlyoutOpen: boolean
}

export interface StateAppContext {
  contextInstanceId: string
  lastPage: string
  dbConfig: {
    treeViewDelimiter: string
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
      panelSizes: {
        [key: string]: number
      }
      openNodes: {
        [key: string]: boolean
      }
      selectedLeaf: {
        [key: string]: {
          [key: string]: IKeyPropTypes
        }
      }
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
    enablementArea: {
      isMinimized: boolean
      search: string
      itemScrollTop: number
    },
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
  triggeredFunctions: {
    lastViewedPage: string
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

export interface StateAppOAuth {
  loading: boolean
  error: string
  message: string
  source: Nullable<OAuthSocialSource>
  job: Nullable<CloudJobInfo>
  user: {
    error: string
    loading: boolean
    data: Nullable<CloudUser>
    freeDb: CloudUserFreeDbState
  }
  plan: {
    isOpenDialog: boolean
    data: CloudSubscriptionPlanResponse[]
    loading: boolean
  }
  isOpenSignInDialog: boolean
  isOpenSelectAccountDialog: boolean
  showProgress: boolean
  agreement: boolean
}

export interface CloudUserFreeDbState {
  loading: boolean
  error: string
  data: Nullable<Instance>
}

export enum OAuthSocialSource {
  ListOfDatabases = 'list of databases',
  WelcomeScreen = 'welcome screen',
  BrowserContentMenu = 'browser content menu',
  BrowserFiltering = 'browser filtering',
  BrowserSearch = 'browser search',
  RediSearch = 'workbench RediSearch',
  RedisJSON = 'workbench RedisJSON',
  RedisTimeSeries = 'workbench RedisTimeSeries',
  RedisGraph = 'workbench RedisGraph',
  RedisBloom = 'workbench RedisBloom',
  Autodiscovery = 'autodiscovery',
  TriggersAndFunctionsPage = 'page triggers and functions',
  'triggers and functions' = 'workbench triggers and functions',
}

export interface StateAppActionBar {
  status: ActionBarStatus
  text?: string
  actions?: ActionBarActions[]
}

export interface ActionBarActions {
  onClick: () => void
  label: string
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
