import cx from 'classnames'
import React from 'react'
import JSONBigInt from 'json-bigint'

import JsonPretty from 'uiSrc/components/json-viewer/components/json-pretty'

interface Props {
  value: string
  expanded?: boolean
  space?: number
  useNativeBigInt?: boolean
}

const JSONViewer = (props: Props) => {
  const { value, expanded = false, space = 2, useNativeBigInt = true } = props

  try {
    const data = JSONBigInt({ useNativeBigInt }).parse(value)

    return {
      value: (
        <div className={cx('jsonViewer', { 'jsonViewer-collapsed': !expanded })} data-testid="value-as-json">
          <JsonPretty data={data} space={space} />
        </div>
      ),
      isValid: true
    }
  } catch (e) {
    return {
      value,
      isValid: false
    }
  }
}

export default JSONViewer
