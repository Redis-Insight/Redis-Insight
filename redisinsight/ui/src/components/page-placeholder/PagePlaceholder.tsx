import React from 'react'
import { EuiLoadingLogo, EuiEmptyPrompt } from '@elastic/eui'
import LogoIcon from 'uiSrc/assets/img/logo_small.svg?react'

const PagePlaceholder = () => (
  <>
    { process.env.NODE_ENV !== 'development' && (
      <EuiEmptyPrompt
        data-testid="page-placeholder"
        icon={<EuiLoadingLogo logo={LogoIcon} size="xl" style={{ fontSize: '40px' }} />}
        titleSize="s"
      />
    )}
  </>

)

export default PagePlaceholder
