import { KeyValueFormat, SortOrder } from './keys'

export const DEFAULT_DELIMITER = ':'
export const DEFAULT_TREE_SORTING = SortOrder.ASC
export const DEFAULT_SHOW_HIDDEN_RECOMMENDATIONS = false

export const TEXT_UNPRINTABLE_CHARACTERS = {
  title: 'Non-printable characters have been detected',
  content: 'Use Workbench or CLI to edit without data loss.',
}
export const TEXT_DISABLED_FORMATTER_EDITING = 'Cannot edit the value in this format'
export const TEXT_DISABLED_STRING_EDITING = 'Load the entire value to edit it'
export const TEXT_DISABLED_STRING_FORMATTING = 'Load the entire value to select a format'

export const TEXT_INVALID_VALUE = {
  title: 'Value will be saved as Unicode',
  text: 'as it is not valid in the selected format.',
}

export const TEXT_DISABLED_COMPRESSED_VALUE: string = 'Cannot edit the decompressed value'

export const TEXT_FAILED_CONVENT_FORMATTER = (format: KeyValueFormat) => `Failed to convert to ${format}`
