import React, { ChangeEvent, useState, useEffect, useContext } from 'react'
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui'
import cx from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { toNumber } from 'lodash'
import { useHistory } from 'react-router'

import { BuildType } from 'uiSrc/constants/env'
import { appInfoSelector } from 'uiSrc/slices/app/info'
import { Nullable, getDbIndex } from 'uiSrc/utils'
import { Pages, Theme } from 'uiSrc/constants'
import { ThemeContext } from 'uiSrc/contexts/themeContext'
import InlineItemEditor from 'uiSrc/components/inline-item-editor/InlineItemEditor'
import RediStackDarkMin from 'uiSrc/assets/img/modules/redistack/RediStackDark-min.svg'
import RediStackLightMin from 'uiSrc/assets/img/modules/redistack/RediStackLight-min.svg'
import RediStackLightLogo from 'uiSrc/assets/img/modules/redistack/RedisStackLogoLight.svg'
import RediStackDarkLogo from 'uiSrc/assets/img/modules/redistack/RedisStackLogoDark.svg'

import { getRedisModulesSummary, sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import {
  changeInstanceAliasAction,
  checkConnectToInstanceAction,
  setConnectedInstanceId
} from 'uiSrc/slices/instances/instances'
import { resetKeys } from 'uiSrc/slices/browser/keys'
import { appContextSelector, resetRdiContext, setAppContextInitialState } from 'uiSrc/slices/app/context'
import { AdditionalRedisModule } from 'apiSrc/modules/database/models/additional.redis.module'
import styles from './styles.module.scss'

export interface Props {
  alias: string
  database?: Nullable<number>
  isLoading: boolean
  onAliasEdited?: (value: string) => void
  isRediStack?: boolean
  isCloneMode: boolean
  id?: string
  provider?: string
  setIsCloneMode: (value: boolean) => void
  modules: AdditionalRedisModule[]
}

const DatabaseAlias = (props: Props) => {
  const {
    alias,
    database,
    id,
    provider,
    onAliasEdited,
    isLoading,
    isRediStack,
    isCloneMode,
    setIsCloneMode,
    modules,
  } = props

  const { server } = useSelector(appInfoSelector)
  const { contextInstanceId } = useSelector(appContextSelector)

  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(alias)

  const { theme } = useContext(ThemeContext)
  const history = useHistory()
  const dispatch = useDispatch()

  useEffect(() => {
    setValue(alias)
  }, [alias])

  const setEditMode = () => {
    setIsEditing(true)
  }

  const onChange = ({ currentTarget: { value } }: ChangeEvent<HTMLInputElement>) => {
    isEditing && setValue(value)
  }

  const connectToInstance = () => {
    // reset rdi context
    dispatch(resetRdiContext())

    if (contextInstanceId && contextInstanceId !== id) {
      dispatch(resetKeys())
      dispatch(setAppContextInitialState())
    }
    dispatch(setConnectedInstanceId(id ?? ''))
    history.push(Pages.keys(id ?? ''))
  }

  const handleOpen = (event: any) => {
    event.stopPropagation()
    event.preventDefault()
    const modulesSummary = getRedisModulesSummary(modules)
    sendEventTelemetry({
      event: TelemetryEvent.CONFIG_DATABASES_OPEN_DATABASE_BUTTON_CLICKED,
      eventData: {
        databaseId: id,
        provider,
        ...modulesSummary,
      }
    })
    dispatch(checkConnectToInstanceAction(id, connectToInstance))
    // onOpen()
  }

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsCloneMode(true)
    sendEventTelemetry({
      event: TelemetryEvent.CONFIG_DATABASES_DATABASE_CLONE_REQUESTED,
      eventData: {
        databaseId: id
      }
    })
  }

  const handleApplyChanges = () => {
    setIsEditing(false)
    dispatch(changeInstanceAliasAction(
      id,
      value,
      () => {
        onAliasEdited?.(value)
      },
      () => setValue(alias)
    ))
  }

  const handleCloneBack = () => {
    setIsCloneMode(false)
    sendEventTelemetry({
      event: TelemetryEvent.CONFIG_DATABASES_DATABASE_CLONE_CANCELLED,
      eventData: {
        databaseId: id
      }
    })
  }

  const handleDeclineChanges = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation()
    setValue(alias)
    setIsEditing(false)
  }

  return (
    <>
      <EuiFlexGroup responsive={false} justifyContent="flexStart" alignItems="center" gutterSize="xs">
        {isCloneMode && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              onClick={handleCloneBack}
              iconSize="m"
              iconType="sortLeft"
              className={styles.iconLeftArrow}
              aria-label="back"
              data-testid="back-btn"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false} style={{ overflow: isEditing ? 'inherit' : 'hidden' }}>
          <EuiFlexGroup
            responsive={false}
            justifyContent="spaceBetween"
            gutterSize="xs"
          >
            {isRediStack && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={(
                    <EuiIcon
                      type={theme === Theme.Dark ? RediStackDarkLogo : RediStackLightLogo}
                      className={styles.tooltipLogo}
                      data-testid="tooltip-redis-stack-icon"
                    />
                  )}
                  position="bottom"
                >
                  <EuiIcon
                    type={theme === Theme.Dark ? RediStackDarkMin : RediStackLightMin}
                    className={styles.redistackIcon}
                    data-testid="redis-stack-icon"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem
              grow
              onClick={setEditMode}
              data-testid="edit-alias-btn"
              style={{ overflow: isEditing ? 'inherit' : 'hidden', maxWidth: '360px' }}
            >
              {!isCloneMode && (isEditing || isLoading) ? (
                <EuiFlexGrid
                  responsive
                  className="relative"
                  gutterSize="none"
                >
                  <EuiFlexItem
                    grow={1}
                    component="span"
                    className="fluid"
                  >
                    <>
                      <InlineItemEditor
                        onApply={handleApplyChanges}
                        onDecline={handleDeclineChanges}
                        viewChildrenMode={!isEditing}
                        isLoading={isLoading}
                        isDisabled={!value}
                        declineOnUnmount={false}
                      >
                        <EuiFieldText
                          name="alias"
                          id="alias"
                          className={cx(styles.input)}
                          placeholder="Enter Database Alias"
                          value={value}
                          fullWidth={false}
                          maxLength={500}
                          compressed
                          isLoading={isLoading}
                          onChange={onChange}
                          append={!isEditing
                            ? <EuiIcon type="pencil" color="subdued" /> : ''}
                          autoComplete="off"
                          data-testid="alias-input"
                        />
                      </InlineItemEditor>
                      <p className={styles.hiddenText}>{value}</p>
                    </>
                  </EuiFlexItem>
                </EuiFlexGrid>
              ) : (
                <EuiText className={cx(styles.alias, { [styles.aliasEditing]: !isCloneMode })}>
                  <b className={styles.aliasText} data-testid="db-alias">
                    {isCloneMode && (<span>Clone {alias}</span>)}
                    {!isCloneMode && (<span className={cx(styles.aliasTextEditing)}>{alias}</span>)}
                  </b>
                  <b>
                    {getDbIndex(toNumber(database))}
                  </b>
                  {!isCloneMode && (<EuiIcon type="pencil" className={cx(styles.aliasEditIcon)} />)}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {!isCloneMode && (
        <EuiFlexGroup responsive={false} gutterSize="m" style={{ marginTop: 6 }}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="secondary"
              iconType="kqlFunction"
              aria-label="Connect to database"
              data-testid="connect-to-db-btn"
              className={styles.btnOpen}
              onClick={handleOpen}
            >
              Open
            </EuiButton>
          </EuiFlexItem>
          {server?.buildType !== BuildType.RedisStack && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="secondary"
                iconType="copy"
                aria-label="Clone database"
                data-testid="clone-db-btn"
                className={styles.btnClone}
                onClick={handleClone}
              >
                Clone
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </>
  )
}

export default DatabaseAlias
