import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io, Socket } from 'socket.io-client'

import { SocketEvent } from 'uiSrc/constants'
import { NotificationEvent } from 'uiSrc/constants/notifications'
import { setNewNotificationAction } from 'uiSrc/slices/app/notifications'
import { setIsConnected } from 'uiSrc/slices/app/socket-connection'
import { userSettingsSelector } from 'uiSrc/slices/user/user-settings'
import { getBaseApiUrl, Nullable } from 'uiSrc/utils'

interface IProps {
  retryDelay?: number;
}

const CommonAppSubscription = ({ retryDelay = 60000 } : IProps) => {
  const socketRef = useRef<Nullable<Socket>>(null)
  const { config } = useSelector(userSettingsSelector)

  const dispatch = useDispatch()

  useEffect(() => {
    if (socketRef.current?.connected) {
      return
    }
    let retryTimer: NodeJS.Timer

    socketRef.current = io(`${getBaseApiUrl()}`, {
      forceNew: true,
      rejectUnauthorized: false,
    })

    socketRef.current.on(SocketEvent.Connect, () => {
      clearTimeout(retryTimer)
      dispatch(setIsConnected(true))
    })

    socketRef.current.on(NotificationEvent.Notification, (data) => {
      dispatch(setNewNotificationAction(data))
    })

    // Catch disconnect
    socketRef.current?.on(SocketEvent.Disconnect, () => {
      if (retryDelay) {
        retryTimer = setTimeout(handleDisconnect, retryDelay)
      } else {
        handleDisconnect()
      }
    })
  }, [])

  useEffect(() => {
    config?.agreements?.notifications
  }, [config])

  const handleDisconnect = () => {
    dispatch(setIsConnected(false))
    socketRef.current?.removeAllListeners()
    socketRef.current?.disconnect()
  }

  return null
}

export default CommonAppSubscription
