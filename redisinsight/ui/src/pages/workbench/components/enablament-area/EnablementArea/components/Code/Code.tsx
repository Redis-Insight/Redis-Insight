import React, { useContext } from 'react'
import { startCase } from 'lodash'
import { useLocation } from 'react-router-dom'

import EnablementAreaContext from 'uiSrc/pages/workbench/contexts/enablementAreaContext'
import { getFileInfo } from 'uiSrc/pages/workbench/components/enablament-area/EnablementArea/utils/getFileInfo'

import CodeButton from '../CodeButton'

export interface Props {
  label: string;
  children: string;
}

const Code = ({ children, ...rest }: Props) => {
  const { search } = useLocation()
  const { setScript } = useContext(EnablementAreaContext)

  const loadContent = () => {
    const pagePath = new URLSearchParams(search).get('guide')
    if (pagePath) {
      const pageInfo = getFileInfo(pagePath)
      setScript(children, `${pageInfo.location}/${pageInfo.name}`, startCase(rest.label))
    } else {
      setScript(children)
    }
  }

  return (
    <CodeButton className="mb-s mt-s" onClick={loadContent} {...rest} />
  )
}

export default Code
