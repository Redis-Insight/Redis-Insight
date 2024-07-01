import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory, useParams } from 'react-router-dom'
import { EuiIcon } from '@elastic/eui'
import {
  aiExpertChatSelector,
  askExpertChatbotAction,
  getExpertChatHistoryAction,
  removeExpertChatHistoryAction,
  updateExpertChatAgreements,
} from 'uiSrc/slices/panels/aiAssistant'
import { findTutorialPath, getCommandsFromQuery, isRedisearchAvailable, Nullable } from 'uiSrc/utils'
import { connectedInstanceSelector, freeInstancesSelector } from 'uiSrc/slices/instances/instances'

import { sendEventTelemetry, TELEMETRY_EMPTY_VALUE, TelemetryEvent } from 'uiSrc/telemetry'
import { AiChatMessage, AiChatType } from 'uiSrc/slices/interfaces/aiAssistant'
import { appRedisCommandsSelector } from 'uiSrc/slices/app/redis-commands'
import { oauthCloudUserSelector } from 'uiSrc/slices/oauth/cloud'
import { fetchRedisearchListAction } from 'uiSrc/slices/browser/redisearch'
import TelescopeImg from 'uiSrc/assets/img/telescope-dark.svg?react'
import { openTutorialByPath } from 'uiSrc/slices/panels/sidePanels'
import { TutorialsIds } from 'uiSrc/constants'
import NoIndexesInitialMessage from './components/no-indexes-initial-message'
import ExpertChatHeader from './components/expert-chat-header'

import { EXPERT_CHAT_AGREEMENTS, EXPERT_CHAT_INITIAL_MESSAGE } from '../texts'
import { ChatForm, ChatHistory } from '../shared'

import styles from './styles.module.scss'

const ExpertChat = () => {
  const { messages, agreements, loading } = useSelector(aiExpertChatSelector)
  const { name: connectedInstanceName, modules, provider } = useSelector(connectedInstanceSelector)
  const { commandsArray: REDIS_COMMANDS_ARRAY } = useSelector(appRedisCommandsSelector)
  const { data: userOAuthProfile } = useSelector(oauthCloudUserSelector)
  const freeInstances = useSelector(freeInstancesSelector) || []

  const [isNoIndexes, setIsNoIndexes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inProgressMessage, setinProgressMessage] = useState<Nullable<AiChatMessage>>(null)

  const currentAccountIdRef = useRef(userOAuthProfile?.id)
  const { instanceId } = useParams<{ instanceId: string }>()

  const isAgreementsAccepted = agreements.includes(instanceId) || messages.length > 0

  const dispatch = useDispatch()
  const history = useHistory()

  useEffect(() => {
    if (!instanceId) {
      return
    }

    // changed account
    if (currentAccountIdRef.current !== userOAuthProfile?.id) {
      currentAccountIdRef.current = userOAuthProfile?.id
      dispatch(getExpertChatHistoryAction(instanceId))
      return
    }

    dispatch(getExpertChatHistoryAction(instanceId))
  }, [instanceId, userOAuthProfile])

  useEffect(() => {
    if (!instanceId) return
    if (!isRedisearchAvailable(modules)) return
    if (messages.length) return

    getIndexes()
  }, [instanceId, modules])

  const getIndexes = () => {
    setIsLoading(true)
    dispatch(
      fetchRedisearchListAction(
        (indexes) => {
          setIsLoading(false)
          setIsNoIndexes(!indexes.length)
        },
        () => setIsLoading(false),
        false
      )
    )
  }

  const handleSubmit = useCallback((message: string) => {
    if (!isAgreementsAccepted) {
      dispatch(updateExpertChatAgreements(instanceId))

      sendEventTelemetry({
        event: TelemetryEvent.AI_CHAT_BOT_TERMS_ACCEPTED,
        eventData: {
          databaseId: instanceId,
          chat: AiChatType.Query,
        }
      })
    }

    dispatch(askExpertChatbotAction(
      instanceId,
      message,
      {
        onMessage: (message: AiChatMessage) => setinProgressMessage({ ...message }),
        onError: (errorCode: number) => {
          sendEventTelemetry({
            event: TelemetryEvent.AI_CHAT_BOT_ERROR_MESSAGE_RECEIVED,
            eventData: {
              chat: AiChatType.Query,
              errorCode
            }
          })
        },
        onFinish: () => setinProgressMessage(null)
      }
    ))

    sendEventTelemetry({
      event: TelemetryEvent.AI_CHAT_MESSAGE_SENT,
      eventData: {
        chat: AiChatType.Query
      }
    })
  }, [instanceId, isAgreementsAccepted])

  const onRunCommand = useCallback((query: string) => {
    const command = getCommandsFromQuery(query, REDIS_COMMANDS_ARRAY) || ''
    sendEventTelemetry({
      event: TelemetryEvent.AI_CHAT_BOT_COMMAND_RUN_CLICKED,
      eventData: {
        databaseId: instanceId,
        chat: AiChatType.Query,
        provider,
        command
      }
    })
  }, [instanceId, provider])

  const onClearSession = useCallback(() => {
    dispatch(removeExpertChatHistoryAction(instanceId))

    sendEventTelemetry({
      event: TelemetryEvent.AI_CHAT_SESSION_RESTARTED,
      eventData: {
        chat: AiChatType.Query
      }
    })
  }, [])

  const handleAgreementsDisplay = useCallback(() => {
    sendEventTelemetry({
      event: TelemetryEvent.AI_CHAT_BOT_TERMS_DISPLAYED,
      eventData: {
        chat: AiChatType.Query,
      }
    })
  }, [])

  const handleClickTutorial = () => {
    const tutorialPath = findTutorialPath({ id: TutorialsIds.RedisUseCases })
    dispatch(openTutorialByPath(tutorialPath, history, true))

    sendEventTelemetry({
      event: TelemetryEvent.EXPLORE_PANEL_TUTORIAL_OPENED,
      eventData: {
        databaseId: instanceId || TELEMETRY_EMPTY_VALUE,
        source: 'sample_data',
      }
    })
  }

  const getValidationMessage = () => {
    if (!instanceId) {
      return {
        title: 'Open a database',
        content: 'Open your Redis database with search & query, or create a new database to get started.'
      }
    }

    if (!isRedisearchAvailable(modules)) {
      return {
        title: 'Search & query capability is not available',
        content: freeInstances?.length
          ? 'Use your free all-in-one Redis Cloud database to start exploring these capabilities.'
          : 'Create a free Redis Stack database with search & query capability that extends the core capabilities of open-source Redis.',
        icon: (
          <EuiIcon
            className={styles.iconTelescope}
            type={TelescopeImg}
          />
        )
      }
    }

    return undefined
  }

  return (
    <div className={styles.wrapper} data-testid="ai-document-chat">
      <ExpertChatHeader
        connectedInstanceName={connectedInstanceName}
        databaseId={instanceId}
        isClearDisabled={!messages?.length || !instanceId}
        onRestart={onClearSession}
      />
      <div className={styles.chatHistory}>
        <ChatHistory
          autoScroll
          isLoading={loading || isLoading}
          modules={modules}
          initialMessage={isNoIndexes
            ? <NoIndexesInitialMessage onClickTutorial={handleClickTutorial} onSuccess={getIndexes} />
            : EXPERT_CHAT_INITIAL_MESSAGE}
          inProgressMessage={inProgressMessage}
          history={messages}
          onRunCommand={onRunCommand}
          onRestart={onClearSession}
        />
      </div>
      <div className={styles.chatForm}>
        <ChatForm
          onAgreementsDisplayed={handleAgreementsDisplay}
          agreements={!isAgreementsAccepted ? EXPERT_CHAT_AGREEMENTS : undefined}
          isDisabled={!instanceId || inProgressMessage?.content === ''}
          validation={getValidationMessage()}
          placeholder="Ask me to query your data (e.g. How many road bikes?)"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

export default ExpertChat
