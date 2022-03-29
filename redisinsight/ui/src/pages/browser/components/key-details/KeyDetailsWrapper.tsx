import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  deleteKeyAction,
  editKey,
  editKeyTTL,
  fetchKeyInfo,
  refreshKeyInfoAction,
  selectedKeySelector,
} from 'uiSrc/slices/keys'
import { KeyTypes } from 'uiSrc/constants'
import { refreshHashFieldsAction } from 'uiSrc/slices/hash'
import { refreshZsetMembersAction } from 'uiSrc/slices/zset'
import { resetStringValue } from 'uiSrc/slices/string'
import { refreshSetMembersAction } from 'uiSrc/slices/set'
import { refreshListElementsAction } from 'uiSrc/slices/list'
import KeyDetails from './KeyDetails/KeyDetails'

export interface Props {
  onCloseKey: () => void;
  onEditKey: (key: string, newKey: string) => void;
  onDeleteKey: () => void;
  keyProp: string | null;
}

const KeyDetailsWrapper = ({ onCloseKey, onEditKey, onDeleteKey, keyProp }: Props) => {
  const dispatch = useDispatch()

  const selectedKey = useSelector(selectedKeySelector)

  useEffect(() => {
    if (keyProp === null) {
      return
    }
    // Restore key details from context in future
    // (selectedKey.data?.name !== keyProp)
    dispatch(fetchKeyInfo(keyProp))
  }, [keyProp])

  const handleDeleteKey = (key: string, type: string) => {
    if (type === KeyTypes.String) {
      dispatch(deleteKeyAction(key, () => {
        dispatch(resetStringValue())
        onDeleteKey()
      }))
      return
    }
    dispatch(deleteKeyAction(key, onDeleteKey))
  }

  const handleRefreshKey = (key: string, type: KeyTypes) => {
    switch (type) {
      case KeyTypes.Hash: {
        dispatch(refreshKeyInfoAction(key))
        dispatch(refreshHashFieldsAction(key))
        break
      }
      case KeyTypes.ZSet: {
        dispatch(refreshKeyInfoAction(key))
        dispatch(refreshZsetMembersAction(key))
        break
      }
      case KeyTypes.Set: {
        dispatch(refreshKeyInfoAction(key))
        dispatch(refreshSetMembersAction(key))
        break
      }
      case KeyTypes.List: {
        dispatch(refreshKeyInfoAction(key))
        dispatch(refreshListElementsAction(key))
        break
      }
      default:
        dispatch(fetchKeyInfo(key))
    }
  }

  const handleEditTTL = (key: string, ttl: number) => {
    dispatch(editKeyTTL(key, ttl))
  }
  const handleEditKey = (oldKey: string, newKey: string, onFailure?: () => void) => {
    dispatch(editKey(oldKey, newKey, () => onEditKey(oldKey, newKey), onFailure))
  }

  const handleClose = () => {
    onCloseKey()
  }

  return (
    <KeyDetails
      selectedKey={selectedKey}
      onClose={handleClose}
      onRefresh={handleRefreshKey}
      onDelete={handleDeleteKey}
      onEditTTL={handleEditTTL}
      onEditKey={handleEditKey}
    />
  )
}

export default KeyDetailsWrapper
