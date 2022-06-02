import React, { useState, useEffect, ChangeEvent } from 'react'
import { useSelector } from 'react-redux'
import {
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiPopover,
  EuiButton,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
  EuiText,
  EuiCheckbox,
  EuiSpacer,
  EuiToolTip
} from '@elastic/eui'
import { useFormik } from 'formik'
import { orderBy, filter } from 'lodash'

import { selectedGroupSelector, selectedConsumerSelector } from 'uiSrc/slices/browser/stream'
import { validateNumber } from 'uiSrc/utils'
import { prepareDataForClaimRequest, getDefaultConsumer, ClaimTimeOptions } from 'uiSrc/utils/streamUtils'
import { ClaimPendingEntryDto, ConsumerDto } from 'apiSrc/modules/browser/dto/stream.dto'

import styles from './styles.module.scss'

const getConsumersOptions = (consumers: ConsumerDto[]) => (
  consumers.map((consumer) => ({
    value: consumer.name,
    inputDisplay: (
      <EuiText size="m" className={styles.option}>
        <EuiText className={styles.consumerName}>{consumer.name}</EuiText>
        <EuiText size="s" className={styles.pendingCount} data-testid="pending-count">
          {`pending: ${consumer.pending}`}
        </EuiText>
      </EuiText>
    )
  }))
)

const timeOptions: EuiSuperSelectOption<string>[] = [
  { value: ClaimTimeOptions.ABSOLUTE, inputDisplay: 'Timestamp' },
  { value: ClaimTimeOptions.RELATIVE, inputDisplay: 'Relative Time' },
]

export interface Props {
  id: string
  isOpen: boolean
  closePopover: () => void
  showPopover: () => void
  claimMessage: (data: Partial<ClaimPendingEntryDto>, successAction: () => void) => void
}

const MessageClaimPopover = (props: Props) => {
  const {
    id,
    isOpen,
    closePopover,
    showPopover,
    claimMessage
  } = props

  const {
    data: consumers = [],
  } = useSelector(selectedGroupSelector) ?? {}
  const { name: currentConsumerName } = useSelector(selectedConsumerSelector) ?? { name: '' }

  const [isOptionalShow, setIsOptionalShow] = useState<boolean>(false)
  const [consumerOptions, setConsumerOptions] = useState<EuiSuperSelectOption<string>[]>([])

  const [initialValues, setInitialValues] = useState({
    consumerName: '',
    minIdleTime: '0',
    timeCount: '0',
    timeOption: ClaimTimeOptions.ABSOLUTE,
    retryCount: '0',
    force: false
  })

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validateOnBlur: false,
    onSubmit: (values) => {
      const data = prepareDataForClaimRequest(values, [id], isOptionalShow)
      claimMessage(data, handleClosePopover)
    },
  })

  const handleClosePopover = () => {
    closePopover()
    setIsOptionalShow(false)
    formik.resetForm()
  }

  useEffect(() => {
    const consumersWithoutCurrent = filter(consumers, (consumer) => consumer.name !== currentConsumerName)
    const sortedConsumers = orderBy(getConsumersOptions(consumersWithoutCurrent), ['name'], ['asc'])
    if (sortedConsumers.length) {
      setConsumerOptions(sortedConsumers)
      setInitialValues({
        ...initialValues,
        consumerName: getDefaultConsumer(consumersWithoutCurrent)?.name
      })
    }
  }, [consumers, currentConsumerName])

  const button = (
    <EuiButton
      size="s"
      color="secondary"
      aria-label="Claim pending message"
      onClick={showPopover}
      data-testid="claim-pending-message"
      className={styles.claimBtn}
      disabled={consumers.length < 2}
    >
      CLAIM
    </EuiButton>
  )

  const buttonTooltip = (
    <EuiToolTip
      content="There is no consumer to claim the message."
      position="top"
      display="inlineBlock"
      anchorClassName="flex-row"
    >
      {button}
    </EuiToolTip>
  )

  return (
    <EuiPopover
      key={id}
      onWheel={(e) => e.stopPropagation()}
      anchorPosition="leftCenter"
      ownFocus
      isOpen={isOpen}
      className="popover"
      panelPaddingSize="m"
      anchorClassName="claimPendingMessage"
      panelClassName={styles.popoverWrapper}
      closePopover={() => {}}
      button={consumers.length < 2 ? buttonTooltip : button}
    >
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Consumer">
              <EuiSuperSelect
                fullWidth
                itemClassName={styles.consumerOption}
                valueOfSelected={formik.values.consumerName}
                options={consumerOptions}
                className={styles.consumerField}
                name="consumerName"
                onChange={(value) => formik.setFieldValue('consumerName', value)}
                data-testid="destination-select"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem className={styles.relative}>
            <EuiFormRow
              label="Min Idle Time"
            >
              <EuiFieldNumber
                name="minIdleTime"
                id="minIdleTime"
                data-testid="min-idle-time"
                placeholder="0"
                className={styles.fieldWithAppend}
                value={formik.values.minIdleTime}
                append="ms"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  formik.setFieldValue(
                    e.target.name,
                    validateNumber(e.target.value.trim())
                  )
                }}
                type="text"
                min={0}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isOptionalShow && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup className={styles.container} alignItems="center">
              <EuiFlexItem className={styles.idle}>
                <EuiFormRow label="Idle Time">
                  <EuiFieldNumber
                    name="timeCount"
                    id="timeCount"
                    data-testid="time-count"
                    placeholder="0"
                    className={styles.fieldWithAppend}
                    value={formik.values.timeCount}
                    append="ms"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      formik.setFieldValue(
                        e.target.name,
                        validateNumber(e.target.value.trim())
                      )
                    }}
                    type="text"
                    min={0}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem className={styles.timeSelect}>
                <EuiFormRow className={styles.hiddenLabel} label="time">
                  <EuiSuperSelect
                    itemClassName={styles.timeOption}
                    valueOfSelected={formik.values.timeOption}
                    options={timeOptions}
                    className={styles.timeOptionField}
                    name="consumerName"
                    onChange={(value) => formik.setFieldValue('timeOption', value)}
                    data-testid="time-option-select"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label="Retry Count">
                  <EuiFieldNumber
                    name="retryCount"
                    id="retryCount"
                    data-testid="retry-count"
                    placeholder="0"
                    className={styles.retryCountField}
                    value={formik.values.retryCount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      formik.setFieldValue(
                        e.target.name,
                        validateNumber(e.target.value.trim())
                      )
                    }}
                    type="text"
                    min={0}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem className={styles.grow}>
                <EuiFormRow className={styles.hiddenLabel} label="force">
                  <EuiCheckbox
                    id="force_claim"
                    name="force"
                    label="Force Claim"
                    checked={formik.values.force}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      formik.setFieldValue(e.target.name, !formik.values.force)
                    }}
                    data-testid="force-claim-checkbox"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <EuiFlexGroup className={styles.footer}>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Optional Parameters"
              checked={isOptionalShow}
              onChange={(e) => setIsOptionalShow(e.target.checked)}
              className={styles.switchOption}
              data-testid="optional-parameters-switcher"
              compressed
            />
          </EuiFlexItem>
          <div>
            <EuiButton
              color="secondary"
              className={styles.footerBtn}
              onClick={handleClosePopover}
            >
              Cancel
            </EuiButton>
            <EuiButton
              fill
              color="secondary"
              className={styles.footerBtn}
              size="m"
              type="submit"
              onClick={() => formik.handleSubmit()}
              data-testid="btn-submit"
            >
              Claim
            </EuiButton>
          </div>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPopover>
  )
}

export default MessageClaimPopover
