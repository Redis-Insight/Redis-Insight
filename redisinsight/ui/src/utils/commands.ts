import { flatten, isArray, isEmpty, reject } from 'lodash'
import {
  CommandArgsType,
  CommandGroup,
  CommandPrefix,
  ICommandArg,
  ICommandArgGenerated
} from 'uiSrc/constants'

export const getComplexityShortNotation = (complexity: string[] | string): string => {
  const value = isArray(complexity) ? complexity.join(' ') : complexity
  return value.endsWith(')') && value.startsWith('O') ? value : ''
}

const generateArgName = (
  arg: ICommandArg,
  pureName: boolean = false,
  onlyMandatory: boolean = false
): string | string[] => {
  const { name: propName = '', enum: enumArg, command, optional, multiple, type, block } = arg

  if (onlyMandatory && optional) return ''

  const name = isArray(propName) ? propName?.join(' ') : propName
  const enumName = enumArg && (!pureName || !name) ? enumArg?.join('|') : name
  const commandName = command ? command + (enumName ? ` ${enumName}` : '') : enumName
  const optionalName = optional ? `[${commandName}]` : commandName

  const multipleNameTemp = [...commandName?.split?.(' '), `[${commandName} ...]`]
  const multipleName = optional ? `[${multipleNameTemp.join(' ')}]` : multipleNameTemp

  if (type === CommandArgsType.Block && isArray(block)) {
    const blocks = flatten(block?.map?.((block) => generateArgName(block, pureName, onlyMandatory)))
    return optional ? `[${blocks?.join?.(' ')}]` : blocks
  }

  return (multiple && !pureName && !onlyMandatory ? multipleName : optionalName) ?? ''
}

export const generateArgs = (args: ICommandArg[]): ICommandArgGenerated[] =>
  flatten(
    args.map((arg) => ({
      ...arg,
      generatedName: generateArgName(arg, true),
    }))
  )

export const generateArgsNames = (
  args: ICommandArg[],
  pureName: boolean = false,
  onlyMandatory: boolean = false
): string[] =>
  reject(
    flatten(
      args.map((arg) => generateArgName(arg, pureName, onlyMandatory))
    ),
    isEmpty
  )

const getExternalCommandFormat = (commandName = '') =>
  commandName
    .replace(/\s+/g, '_')
    .replace(/[.]+/g, '')
    .toLowerCase()

export const getDocUrlForCommand = (
  commandName: string,
  commandGroup: CommandGroup | string = CommandGroup.Generic
): string => {
  let command = getExternalCommandFormat(commandName)
  const commandStartsWith = commandName.split('.')[0]

  switch (commandStartsWith) {
    case CommandPrefix.Search:
      return `https://oss.redis.com/redisearch/Commands/#${command}`
    case CommandPrefix.JSON:
      return `https://oss.redis.com/redisjson/commands/#${command}`
    case CommandPrefix.TimeSeries:
      return `https://oss.redis.com/redistimeseries/commands/#${command}`
    case CommandPrefix.Graph:
      return `https://oss.redis.com/redisgraph/commands/#${command}`
    case CommandPrefix.AI:
      return `https://oss.redis.com/redisai/commands/#${command}`
    default:
      command = commandName.replace(/\s+/g, '-').toLowerCase()
      return `https://redis.io/commands/${command}`
  }
}
