import { ipcRenderer } from 'electron'
import { Dispatch } from 'react'
import { omit } from 'lodash'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { setElectronInfo, setReleaseNotesViewed } from 'uiSrc/slices/app/info'
import { addMessageNotification } from 'uiSrc/slices/app/notifications'
import { GetServerInfoResponse } from 'apiSrc/dto/server.dto'
import successMessages from 'uiSrc/components/notifications/success-messages'
import { ElectronStorageItem, IpcEvent } from '../constants'

export const ipcCheckUpdates = async (serverInfo: GetServerInfoResponse, dispatch: Dispatch<any>) => {
  const isUpdateDownloaded = await ipcRenderer.invoke(
    IpcEvent.getStoreValue, ElectronStorageItem.updateDownloaded
  )
  const isUpdateAvailable = await ipcRenderer.invoke(
    IpcEvent.getStoreValue, ElectronStorageItem.isUpdateAvailable
  )
  const updateDownloadedVersion = await ipcRenderer.invoke(
    IpcEvent.getStoreValue,
    ElectronStorageItem.updateDownloadedVersion
  )

  if (isUpdateDownloaded && !isUpdateAvailable) {
    if (serverInfo.appVersion === updateDownloadedVersion) {
      dispatch(addMessageNotification(
        successMessages.INSTALLED_NEW_UPDATE(updateDownloadedVersion, () => dispatch(setReleaseNotesViewed(true)))
      ))
    }

    await ipcRenderer.invoke(IpcEvent.deleteStoreValue, ElectronStorageItem.updateDownloaded)
  }

  if (updateDownloadedVersion && !isUpdateAvailable && serverInfo.appVersion === updateDownloadedVersion) {
    dispatch(setReleaseNotesViewed(false))
  }

  dispatch(setElectronInfo({ updateDownloadedVersion, isUpdateAvailable }))
}

export const ipcSendEvents = async (serverInfo: GetServerInfoResponse) => {
  const isUpdateDownloadedForTelemetry = await ipcRenderer.invoke(
    IpcEvent.getStoreValue, ElectronStorageItem.updateDownloadedForTelemetry
  )
  const isUpdateAvailable = await ipcRenderer.invoke(
    IpcEvent.getStoreValue, ElectronStorageItem.isUpdateAvailable
  )

  if (isUpdateDownloadedForTelemetry && !isUpdateAvailable) {
    const newVer = await ipcRenderer.invoke(
      IpcEvent.getStoreValue,
      ElectronStorageItem.updateDownloadedVersion
    )
    const prevVer = await ipcRenderer.invoke(
      IpcEvent.getStoreValue,
      ElectronStorageItem.updatePreviousVersion
    )
    sendEventTelemetry({
      event: TelemetryEvent.APPLICATION_UPDATED,
      eventData: {
        ...omit(serverInfo, ['id', 'createDateTime']),
        fromVersion: prevVer,
        toVersion: newVer
      },
    })
    await ipcRenderer.invoke(IpcEvent.deleteStoreValue, ElectronStorageItem.updateDownloadedForTelemetry)
  }
}
