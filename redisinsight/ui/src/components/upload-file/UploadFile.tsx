import React from 'react'
import { EuiButtonEmpty, EuiText, EuiIcon } from '@elastic/eui'

import styles from './styles.module.scss'

export interface Props {
  onFileChange: (string: string) => void
  onClick?: () => void
  accept?: string
  id?: string
}

const UploadFile = ({ onFileChange, onClick, accept, id = 'upload-input-file' }: Props) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        onFileChange(e?.target?.result as string)
      }
      reader.readAsText(e.target.files[0])
      // reset input value after reading file
      e.target.value = ''
    }
  }
  return (
    <EuiButtonEmpty
      className={styles.emptyBtn}
      onClick={() => onClick?.()}
      data-testid="upload-file-btn"
    >
      <label htmlFor={id} className={styles.uploadBtn}>
        <EuiIcon className={styles.icon} type="folderOpen" />
        <EuiText className={styles.label}>Upload</EuiText>
        <input
          type="file"
          id={id}
          data-testid={id}
          accept={accept || '*'}
          onChange={handleFileChange}
          className={styles.fileDrop}
          aria-label="Select file"
        />
      </label>
    </EuiButtonEmpty>
  )
}

export default UploadFile
