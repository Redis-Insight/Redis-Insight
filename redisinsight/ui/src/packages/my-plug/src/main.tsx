/* eslint-disable react/jsx-filename-extension */
import React from 'react'
import { render } from 'react-dom'
import response from './response.json'
import App from './App'

interface Props {
  command?: string
  data?: any
  status?: string
}

const renderPlugin = (props:Props) => {
  const { command = '', status = '', data: response = {} } = props
  render(<App command={command} response={response} status={status} />,
    document.getElementById('app'))
}

if (process.env.NODE_ENV === 'development') {
  renderPlugin({ command: '', data: response, status: 'success' })
}

// This is a required action - export the main function for execution of the visualization
export default { renderPlugin }
