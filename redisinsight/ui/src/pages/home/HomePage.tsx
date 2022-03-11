import { EuiPage, EuiPageBody, EuiResizableContainer, EuiResizeObserver } from '@elastic/eui'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import {
  clusterSelector,
  resetDataRedisCluster,
  resetInstancesRedisCluster,
} from 'uiSrc/slices/cluster'
import { Nullable, setTitle } from 'uiSrc/utils'
import { PageHeader } from 'uiSrc/components'
import { BrowserStorageItem } from 'uiSrc/constants'
import { Instance } from 'uiSrc/slices/interfaces'
import { cloudSelector, resetSubscriptionsRedisCloud } from 'uiSrc/slices/cloud'
import { fetchInstancesAction, instancesSelector } from 'uiSrc/slices/instances'
import { localStorageService } from 'uiSrc/services'
import { resetDataSentinel, sentinelSelector } from 'uiSrc/slices/sentinel'
import { appAnalyticsInfoSelector } from 'uiSrc/slices/app/info'
import { sendEventTelemetry, sendPageViewTelemetry, TelemetryEvent, TelemetryPageView } from 'uiSrc/telemetry'
import AddDatabaseContainer from './components/AddDatabases/AddDatabasesContainer'
import DatabasesList from './components/DatabasesListComponent/DatabasesListWrapper'
import WelcomeComponent from './components/WelcomeComponent/WelcomeComponent'
import AddInstanceControls from './components/AddInstanceControls/AddInstanceControls'

import './styles.scss'
import styles from './styles.module.scss'

const HomePage = () => {
  const [width, setWidth] = useState(0)
  const [addDialogIsOpen, setAddDialogIsOpen] = useState(false)
  const [editDialogIsOpen, setEditDialogIsOpen] = useState(false)
  const [dialogIsOpen, setDialogIsOpen] = useState(false)
  const [welcomeIsShow, setWelcomeIsShow] = useState(
    !localStorageService.get(BrowserStorageItem.instancesCount)
  )
  const [isPageViewSent, setIsPageViewSent] = useState(false)

  const [editedInstance, setEditedInstance] = useState<Nullable<Instance>>(null)

  const dispatch = useDispatch()

  const { credentials: clusterCredentials } = useSelector(clusterSelector)
  const { credentials: cloudCredentials } = useSelector(cloudSelector)
  const { instance: sentinelInstance } = useSelector(sentinelSelector)

  const {
    loading,
    data: instances,
    changedSuccessfully: isChangedInstance,
    deletedSuccessfully: isDeletedInstance,
  } = useSelector(instancesSelector)

  const { identified: analyticsIdentified } = useSelector(appAnalyticsInfoSelector)

  !welcomeIsShow && setTitle('My Redis databases')

  useEffect(() => {
    dispatch(fetchInstancesAction())
    dispatch(resetInstancesRedisCluster())
    dispatch(resetSubscriptionsRedisCloud())
  }, [])

  useEffect(() => {
    if (isDeletedInstance) {
      dispatch(fetchInstancesAction())
    }
  }, [isDeletedInstance])

  useEffect(() => {
    if (isChangedInstance) {
      setAddDialogIsOpen(!isChangedInstance)
      setEditDialogIsOpen(!isChangedInstance)
      setEditedInstance(null)
      // send page view after adding database from welcome page
      sendPageViewTelemetry({
        name: TelemetryPageView.DATABASES_LIST_PAGE
      })
    }
  }, [isChangedInstance])

  useEffect(() => {
    if (!isPageViewSent && !isChangedInstance && instances.length && analyticsIdentified) {
      setIsPageViewSent(true)
      sendPageViewTelemetry({
        name: TelemetryPageView.DATABASES_LIST_PAGE
      })
    }
  }, [instances, analyticsIdentified, isPageViewSent, isChangedInstance])

  useEffect(() => {
    if (clusterCredentials || cloudCredentials || sentinelInstance) {
      setAddDialogIsOpen(true)
    }
  }, [clusterCredentials, cloudCredentials, sentinelInstance])

  useEffect(() => {
    const isDialogOpen = !!instances.length && (addDialogIsOpen || editDialogIsOpen)

    const instancesCashCount = JSON.parse(
      localStorageService.get(BrowserStorageItem.instancesCount) ?? '0'
    )

    const isShowWelcome = !instances.length && !addDialogIsOpen && !editDialogIsOpen && !instancesCashCount

    setDialogIsOpen(isDialogOpen)

    setWelcomeIsShow(isShowWelcome)
  }, [addDialogIsOpen, editDialogIsOpen, instances, loading])

  useEffect(() => {
    if (editedInstance) {
      const found = instances.find((item: Instance) => item.id === editedInstance.id)
      if (found) {
        setEditedInstance(found)
      }
    }
  }, [instances])

  const onInstanceChanged = () => ({})

  const closeEditDialog = () => {
    setEditedInstance(null)
    setEditDialogIsOpen(false)

    sendEventTelemetry({
      event: TelemetryEvent.CONFIG_DATABASES_DATABASE_EDIT_CANCELLED_CLICKED,
      eventData: {
        databaseId: editedInstance?.id
      }
    })
  }

  const handleClose = () => {
    dispatch(resetDataRedisCluster())
    dispatch(resetDataSentinel())

    setAddDialogIsOpen(false)
    setEditedInstance(null)
    setEditDialogIsOpen(false)

    sendEventTelemetry({
      event: TelemetryEvent.CONFIG_DATABASES_ADD_FORM_DISMISSED
    })
  }

  const handleAddInstance = () => {
    setAddDialogIsOpen(true)
    setEditedInstance(null)
    setEditDialogIsOpen(false)
  }

  const handleEditInstance = (instance: Instance) => {
    setEditedInstance(instance)
    setEditDialogIsOpen(true)
    setAddDialogIsOpen(false)
  }

  const handleDeleteInstances = (instances: Instance[]) => {
    if (instances.find((instance) => instance.id === editedInstance?.id)) {
      setEditedInstance(null)
      setEditDialogIsOpen(false)
    }
  }

  const onResize = ({ width: innerWidth }: { width: number }) => {
    setWidth(innerWidth)
  }

  if (welcomeIsShow) {
    return (
      <WelcomeComponent onAddInstance={handleAddInstance} />
    )
  }

  return (
    <>
      <PageHeader title="My Redis databases" />
      <div />
      <EuiResizeObserver onResize={onResize}>
        {(resizeRef) => (
          <EuiPage>
            <EuiPageBody component="div">
              <AddInstanceControls
                key="instance-controls"
                onAddInstance={handleAddInstance}
                direction="row"
                welcomePage={!instances.length}
              />
              {dialogIsOpen ? (
                <div key="homePage" className="homePage">
                  <EuiResizableContainer style={{ height: '100%' }}>
                    {(EuiResizablePanel, EuiResizableButton) => (
                      <>
                        <EuiResizablePanel
                          scrollable={false}
                          initialSize={62}
                          id="databases"
                          minSize="50%"
                          paddingSize="none"
                        >
                          <div ref={resizeRef}>
                            <DatabasesList
                              width={width}
                              dialogIsOpen={dialogIsOpen}
                              editedInstance={editedInstance}
                              onEditInstance={handleEditInstance}
                              onDeleteInstances={handleDeleteInstances}
                            />
                          </div>
                        </EuiResizablePanel>

                        <EuiResizableButton style={{ margin: 0 }} />

                        <EuiResizablePanel
                          scrollable={false}
                          initialSize={38}
                          className={cx({
                            [styles.contentActive]: editDialogIsOpen,
                          })}
                          id="form"
                          minSize="538px"
                          paddingSize="none"
                          style={{ minWidth: '494px' }}
                        >
                          {editDialogIsOpen && (
                            <AddDatabaseContainer
                              editMode
                              width={width}
                              isResizablePanel
                              editedInstance={editedInstance}
                              onClose={closeEditDialog}
                              onDbAdded={onInstanceChanged}
                            />
                          )}

                          {addDialogIsOpen && (
                            <AddDatabaseContainer
                              editMode={false}
                              width={width}
                              isResizablePanel
                              editedInstance={sentinelInstance ?? null}
                              onClose={handleClose}
                              onDbAdded={onInstanceChanged}
                              isFullWidth={!instances.length}
                            />
                          )}
                          <div id="footerDatabaseForm" />
                        </EuiResizablePanel>
                      </>
                    )}
                  </EuiResizableContainer>
                </div>
              ) : (
                <div key="homePage" className="homePage" ref={resizeRef}>
                  {!!instances.length || loading ? (
                    <DatabasesList
                      width={width}
                      editedInstance={editedInstance}
                      dialogIsOpen={dialogIsOpen}
                      onEditInstance={handleEditInstance}
                      onDeleteInstances={handleDeleteInstances}
                    />
                  ) : (
                    <>
                      {addDialogIsOpen && (
                        <AddDatabaseContainer
                          editMode={false}
                          width={width}
                          isResizablePanel
                          editedInstance={sentinelInstance ?? null}
                          onClose={handleClose}
                          onDbAdded={onInstanceChanged}
                          isFullWidth={!instances.length}
                        />
                      )}
                      <div id="footerDatabaseForm" />
                    </>
                  )}
                </div>
              )}
            </EuiPageBody>
          </EuiPage>
        )}
      </EuiResizeObserver>
    </>
  )
}

export default HomePage
