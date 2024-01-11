import { EuiPage, EuiPageBody, EuiPanel, EuiResizableContainer, EuiResizeObserver } from '@elastic/eui'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { RdiInstance } from 'uiSrc/slices/interfaces'
import {
  createInstanceAction,
  editInstanceAction,
  fetchInstancesAction,
  instancesSelector
} from 'uiSrc/slices/rdi/instances'
import {
  TelemetryEvent,
  TelemetryPageView,
  sendEventTelemetry,
  sendPageViewTelemetry
} from 'uiSrc/telemetry'
import EmptyMessage from './components/EmptyMessage'
import ConnectionForm from '../connection-form/ConnectionForm'
import RdiHeader from '../header/RdiHeader'
import RdiInstancesListWrapper from '../instance-list/RdiInstancesListWrapper'

import styles from './styles.module.scss'

const RdiPage = () => {
  const [width, setWidth] = useState(0)
  const [isConnectionFormOpen, setIsConnectionFormOpen] = useState(false)
  const [editInstance, setEditInstance] = useState<RdiInstance | null>(null)
  const [isPageViewSent, setIsPageViewSent] = useState(false)

  const { data, loading, loadingChanging } = useSelector(instancesSelector)

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchInstancesAction())
  }, [])

  useEffect(() => {
    if (!isPageViewSent) {
      sendPageView()
    }
  }, [isPageViewSent])

  const sendPageView = () => {
    sendPageViewTelemetry({
      name: TelemetryPageView.RDI_INSTANCES_PAGE,
    })
    setIsPageViewSent(true)
  }

  const onResize = ({ width: innerWidth }: { width: number }) => {
    setWidth(innerWidth)
  }

  const handleAddInstance = (instance: Partial<RdiInstance>) => {
    const onSuccess = () => {
      setIsConnectionFormOpen(false)
      setEditInstance(null)
    }

    if (editInstance) {
      dispatch(editInstanceAction({ ...editInstance, ...instance }, onSuccess))
    } else {
      dispatch(createInstanceAction({ ...instance }, onSuccess))
    }

    sendEventTelemetry({
      event: TelemetryEvent.RDI_INSTANCE_SUBMITTED
    })
  }

  const handleOpenConnectionForm = () => {
    setIsConnectionFormOpen(true)
    sendEventTelemetry({
      event: TelemetryEvent.RDI_INSTANCE_ADD_CLICKED
    })
  }

  const handleCloseConnectionForm = () => {
    setIsConnectionFormOpen(false)
    setEditInstance(null)
    sendEventTelemetry({
      event: TelemetryEvent.RDI_INSTANCE_ADD_CANCELLED
    })
  }

  const handleEditInstance = (instance: RdiInstance) => {
    setEditInstance(instance)
    setIsConnectionFormOpen(true)
  }

  const handleDeleteInstance = (instances: RdiInstance[]) => {
    sendEventTelemetry({
      event: TelemetryEvent.RDI_INSTANCE_DELETED,
      eventData: {
        ids: instances.map(({ id }) => id)
      }
    })

    setEditInstance(null)
    setIsConnectionFormOpen(false)
  }

  const InstanceList = () =>
    (!data.length ? (
      <EuiPanel className={styles.emptyPanel} borderRadius="none">
        {!loading && !loadingChanging && <EmptyMessage onAddInstanceClick={handleOpenConnectionForm} />}
      </EuiPanel>
    ) : (
      <EuiResizeObserver onResize={onResize}>
        {(resizeRef) => (
          <div key="homePage" className="homePage" data-testid="rdi-instance-list" ref={resizeRef}>
            <RdiInstancesListWrapper
              width={width}
              dialogIsOpen={isConnectionFormOpen}
              editedInstance={editInstance}
              onEditInstance={handleEditInstance}
              onDeleteInstances={handleDeleteInstance}
            />
          </div>
        )}
      </EuiResizeObserver>
    ))

  return (
    <EuiPage className={styles.page}>
      <EuiPageBody component="div">
        <div className={styles.header}>
          <RdiHeader onRdiInstanceClick={handleOpenConnectionForm} />
        </div>
        {!isConnectionFormOpen ? (
          <InstanceList />
        ) : (
          <EuiResizableContainer style={{ height: '100%' }}>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel scrollable={false} initialSize={65} id="instances" minSize="50%" paddingSize="none">
                  <InstanceList />
                </EuiResizablePanel>
                <EuiResizableButton style={{ margin: 0 }} />
                <EuiResizablePanel
                  scrollable={false}
                  initialSize={35}
                  id="connection-form"
                  paddingSize="none"
                  minSize="400px"
                >
                  <ConnectionForm
                    onAddInstance={handleAddInstance}
                    onCancel={handleCloseConnectionForm}
                    editInstance={editInstance}
                    isLoading={loading || loadingChanging}
                  />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        )}
      </EuiPageBody>
    </EuiPage>
  )
}

export default RdiPage
