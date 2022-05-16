export const MAX_TTL_NUMBER = 2147483647
export const MAX_PORT_NUMBER = 65535
export const MAX_DATABASE_INDEX_NUMBER = 99
export const MAX_SCORE_DECIMAL_LENGTH = 15

export const entryIdRegex = /^(\*)$|^(([0-9]+)(-)((\*)$|([0-9]+$)))/

export const validateField = (text: string) => text.replace(/\s/g, '')

export const validateEntryId = (initValue: string) => initValue.replace(/[^0-9-*]+/gi, '')

export const validateCountNumber = (initValue: string) => {
  const value = initValue.replace(/[^0-9]+/gi, '')

  if (+value <= 0) {
    return ''
  }

  return value
}

export const validateTTLNumber = (initValue: string) => {
  const value = +initValue.replace(/[^0-9]+/gi, '')

  if (value > MAX_TTL_NUMBER) {
    return MAX_TTL_NUMBER.toString()
  }

  if (value < 0 || (value === 0 && initValue !== '0')) {
    return ''
  }

  return value.toString()
}

export const validateTTLNumberForAddKey = (iniValue: string) =>
  validateTTLNumber(iniValue).replace(/^(0)?/, '')

export const validateListIndex = (initValue: string) => initValue.replace(/[^0-9]+/gi, '')

export const validateScoreNumber = (initValue: string) => {
  let value = initValue
    .replace(/[^-0-9.]+/gi, '')
    .replace(/^(-?\d*\.?)|(-?\d*)\.?/g, '$1$2')
    .replace(/(?!^)-/g, '')

  if (value.includes('.') && value.split('.')[1].length > MAX_SCORE_DECIMAL_LENGTH) {
    const numberOfExceed = value.split('.')[1].length - MAX_SCORE_DECIMAL_LENGTH
    value = value.slice(0, -numberOfExceed)
  }
  return value.toString()
}

export const validateEmail = (email: string) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

export const validatePortNumber = (initValue: string) => validateNumber(initValue, MAX_PORT_NUMBER)

export const validateNumber = (initValue: string, maxNumber: number = MAX_PORT_NUMBER) => {
  const value = initValue ? +initValue.replace(/[^0-9]+/gi, '') : ''

  if (value > maxNumber) {
    return maxNumber.toString()
  }

  if (value < 0) {
    return ''
  }

  return value.toString()
}

export const validateCertName = (initValue: string) =>
  initValue.replace(/[^ a-zA-Z0-9!@#$%^&*-_()[\]]+/gi, '').toString()

export const isRequiredStringsValid = (...params: string[]) => params.every((p = '') => p.length > 0)
