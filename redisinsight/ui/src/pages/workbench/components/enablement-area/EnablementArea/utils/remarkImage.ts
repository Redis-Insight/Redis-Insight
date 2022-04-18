import { visit } from 'unist-util-visit'
import { IS_ABSOLUTE_PATH } from 'uiSrc/constants/regex'
import { RESOURCES_BASE_URL } from 'uiSrc/services/resourcesService'
import { ApiEndpoints } from 'uiSrc/constants'
import { IFormatterConfig } from './formatter/formatter.interfaces'

const additionalPath = (search?: string) => {
  switch (true) {
    case search?.indexOf(ApiEndpoints.GUIDES_PATH) !== -1:
      return 'static/guides/'
    case search?.indexOf(ApiEndpoints.TUTORIALS_PATH) !== -1:
      return 'static/tutorials/'
    default:
      return ''
  }
}

export const remarkImage = (config?: IFormatterConfig): (tree: Node) => void => (tree: any) => {
  // Find img node in syntax tree
  visit(tree, 'image', (node) => {
    node.url = IS_ABSOLUTE_PATH.test(node.url || '') ? node.url : `${RESOURCES_BASE_URL}${additionalPath(config?.history?.location?.search)}${node.url.replace(/^\//, '')}`
  })
}
