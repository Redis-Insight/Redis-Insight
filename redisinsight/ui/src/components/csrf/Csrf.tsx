import React, { ReactElement, useEffect, useState } from 'react'

import apiService, { setCSRFHeader } from 'uiSrc/services/apiService'
import PagePlaceholder from '../page-placeholder'

const csrfEndpoint = () => process.env.RI_CSRF_ENDPOINT || ''

interface CSRFTokenResponse {
  token: string;
}

const Csrf = ({ children }: { children?: ReactElement }) => {
  const [loading, setLoading] = useState(true)

  const fetchCsrfToken = async () => {
    let data: CSRFTokenResponse | undefined
    try {
      const { data } = await apiService.get<CSRFTokenResponse>(csrfEndpoint())

      setCSRFHeader(data.token)
    } catch (error) {
      console.error('Error fetching CSRF token: ', error)
    } finally {
      setLoading(false)
    }

    return { data }
  }

  useEffect(() => {
    if (!csrfEndpoint()) {
      return
    }

    fetchCsrfToken()
  }, [])

  return loading && csrfEndpoint() ? <PagePlaceholder /> : children || null
}

export default Csrf
