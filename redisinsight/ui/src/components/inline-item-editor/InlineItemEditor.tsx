import React, {
  ChangeEvent,
  FormEvent,
  Ref,
  useEffect,
  useRef,
  useState,
} from 'react'
import { capitalize } from 'lodash'
import cx from 'classnames'
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexItem,
  EuiForm,
  EuiOutsideClickDetector,
  EuiFocusTrap,
  EuiWindowEvent,
} from '@elastic/eui'
import { IconSize } from '@elastic/eui/src/components/icon/icon'
import styles from './styles.module.scss'

type Positions = 'top' | 'bottom' | 'left' | 'right'
type Design = 'default' | 'separate'

export interface Props {
  onDecline: (event?: React.MouseEvent<HTMLElement>) => void
  onApply: (value: string) => void
  onChange?: (value: string) => void
  fieldName?: string
  initialValue?: string
  placeholder?: string
  controlsPosition?: Positions
  controlsDesign?: Design
  maxLength?: number
  expandable?: boolean
  isLoading?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  disableEmpty?: boolean
  disableByValidation?: (value: string) => boolean
  children?: React.ReactElement
  validation?: (value: string) => string
  declineOnUnmount?: boolean
  iconSize?: IconSize
  viewChildrenMode?: boolean
  autoComplete?: string
}

const InlineItemEditor = (props: Props) => {
  const {
    initialValue = '',
    placeholder = '',
    controlsPosition = 'bottom',
    controlsDesign = 'default',
    onDecline,
    onApply,
    onChange,
    fieldName,
    maxLength,
    children,
    expandable,
    isLoading,
    isInvalid,
    disableEmpty,
    disableByValidation,
    validation,
    declineOnUnmount = true,
    viewChildrenMode,
    iconSize,
    isDisabled,
    autoComplete = 'off',
  } = props
  const containerEl: Ref<HTMLDivElement> = useRef(null)
  const [value, setValue] = useState<string>(initialValue)
  const [isError, setIsError] = useState<boolean>(false)

  const inputRef: Ref<HTMLInputElement> = useRef(null)

  useEffect(() =>
    // componentWillUnmount
    () => {
      declineOnUnmount && onDecline()
    },
  [])

  useEffect(() => {
    setTimeout(() => {
      inputRef?.current?.focus()
      inputRef?.current?.select()
    }, 100)
  }, [])

  const handleChangeValue = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    if (disableByValidation) {
      setIsError(disableByValidation(newValue))
    }

    if (validation) {
      const validatedValue = validation(newValue)
      setValue(validatedValue)
      onChange?.(validatedValue)
    } else {
      setValue(newValue)
      onChange?.(newValue)
    }
  }

  const handleClickOutside = (event: any) => {
    if (!containerEl?.current?.contains(event.target)) {
      if (!isLoading) {
        onDecline(event)
      } else {
        event.stopPropagation()
        event.preventDefault()
      }
    }
  }

  const handleOnEsc = (e: KeyboardEvent) => {
    if (e.code.toLowerCase() === 'escape' || e.keyCode === 27) {
      e.stopPropagation()
      onDecline()
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    onApply(value)
  }

  const isDisabledApply = (): boolean =>
    !!(isLoading || isError || isDisabled || (disableEmpty && !value.length))

  return (
    <>
      {viewChildrenMode
        ? children : (
          <EuiOutsideClickDetector onOutsideClick={handleClickOutside}>
            <div ref={containerEl} className={styles.container}>
              <EuiWindowEvent event="keydown" handler={handleOnEsc} />
              <EuiFocusTrap>
                <EuiForm
                  component="form"
                  className="relative"
                  onSubmit={handleFormSubmit}
                >
                  <EuiFlexItem grow component="span">
                    {children || (
                      <>
                        <EuiFieldText
                          name={fieldName}
                          id={fieldName}
                          className={styles.field}
                          maxLength={maxLength || undefined}
                          placeholder={placeholder}
                          value={value}
                          fullWidth={false}
                          compressed
                          onChange={handleChangeValue}
                          isLoading={isLoading}
                          isInvalid={isInvalid}
                          data-testid="inline-item-editor"
                          autoComplete={autoComplete}
                          inputRef={inputRef}
                        />
                        {expandable && (
                          <p className={styles.keyHiddenText}>{value}</p>
                        )}
                      </>
                    )}
                  </EuiFlexItem>
                  <div
                    className={cx(
                      'inlineItemEditor__controls',
                      styles.controls,
                      styles[`controls${capitalize(controlsPosition)}`],
                      styles[`controls${capitalize(controlsDesign)}`],
                    )}
                  >
                    <EuiButtonIcon
                      iconSize={iconSize ?? 'l'}
                      iconType="cross"
                      color="primary"
                      aria-label="Cancel editing"
                      className={cx(styles.btn, styles.declineBtn)}
                      onClick={onDecline}
                      disabled={isLoading}
                      data-testid="cancel-btn"
                    />
                    <EuiButtonIcon
                      iconSize={iconSize ?? 'l'}
                      iconType="check"
                      color="primary"
                      type="submit"
                      aria-label="Apply"
                      className={cx(styles.btn, styles.applyBtn)}
                      disabled={isDisabledApply()}
                      data-testid="apply-btn"
                    />
                  </div>
                </EuiForm>
              </EuiFocusTrap>
            </div>
          </EuiOutsideClickDetector>
        )}
    </>
  )
}

export default InlineItemEditor
