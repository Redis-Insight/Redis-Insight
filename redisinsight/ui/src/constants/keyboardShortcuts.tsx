import React from 'react'
import { isMacOs } from 'uiSrc/utils/dom'

// TODO: use i18n file for labels & descriptions
const COMMON_SHORTCUTS = {
  _separator: '+',
  desktop: {
    newWindow: {
      description: 'Open a new window',
      keys: ['Ctrl', 'N']
    },
    reloadPage: {
      description: 'Reload the page',
      keys: ['Ctrl', 'R']
    }
  },
  cli: {
    autocompleteNext: {
      description: 'Autocomplete with the next command',
      keys: ['Tab']
    },
    autocompletePrev: {
      description: 'Autocomplete with the previous command',
      keys: ['Shift', 'Tab']
    },
    clearSearch: {
      description: 'Clear the screen',
      keys: ['Ctrl', 'L']
    },
    prevCommand: {
      description: 'Return to the previous command',
      keys: ['Up Arrow']
    },
    nextCommand: {
      description: 'Scroll the list of commands in the opposite direction to the Up Arrow',
      keys: ['Down Arrow']
    }
  },
  workbench: {
    runQuery: {
      label: 'Run',
      description: 'Run Command',
      keys: ['Ctrl', 'Enter'],
    },
    nextLine: {
      description: 'Go to the next line',
      keys: ['Enter'],
    },
    listOfCommands: {
      description: 'Display the list of commands and information about commands and their arguments in the suggestion list',
      keys: ['Ctrl', 'Space']
    },
    triggerHints: {
      description: 'Trigger Command Hints',
      keys: ['Ctrl', 'Shift', 'Space']
    },
    quickHistoryAccess: {
      description: 'Quick-access to command history',
      keys: ['Up Arrow']
    },
    nonRedisEditor: {
      description: 'Use Non-Redis Editor',
      keys: ['Shift', 'Space'],
    }
  },
  rdi: {
    openDedicatedEditor: {
      description: 'Open a dedicated SQL or JMESPath editor:',
      keys: ['Shift', 'Space']
    }
  }
}

const MAC_SHORTCUTS = {
  _separator: '',
  desktop: {
    newWindow: {
      description: 'Open a new window',
      keys: [(<span className="cmdSymbol">⌘</span>), 'N']
    },
    reloadPage: {
      description: 'Reload the page',
      keys: [(<span className="cmdSymbol">⌘</span>), 'R']
    }
  },
  cli: {
    autocompleteNext: {
      description: 'Autocomplete with the next command',
      keys: ['Tab']
    },
    autocompletePrev: {
      description: 'Autocomplete with the previous command',
      keys: [(<span className="shiftSymbol">⇧</span>), 'Tab']
    },
    clearSearch: {
      description: 'Clear the screen',
      keys: [(<span className="cmdSymbol">⌘</span>), 'K']
    },
    prevCommand: {
      description: 'Return to the previous command',
      keys: [(<span className="badgeArrowUp">↑</span>)]
    },
    nextCommand: {
      description: 'Scroll the list of commands in the opposite direction to the Up Arrow',
      keys: [(<span className="badgeArrowDown">↓</span>)]
    }
  },
  workbench: {
    runQuery: {
      label: 'Run commands',
      description: 'Run Commands',
      keys: [(<span className="cmdSymbol">⌘</span>), 'Enter'],
    },
    nextLine: {
      description: 'Go to the next line',
      keys: ['Enter'],
    },
    listOfCommands: {
      description: 'Display the list of commands and information about commands and their arguments in the suggestion list',
      keys: [(<span className="cmdSymbol">⌘</span>), 'Space']
    },
    triggerHints: {
      description: 'Trigger Command Hints',
      keys: [(<span className="cmdSymbol">⌘</span>), (<span className="shiftSymbol">⇧</span>), 'Space']
    },
    quickHistoryAccess: {
      description: 'Quick-access to command history',
      keys: ['Up Arrow']
    },
    nonRedisEditor: {
      description: 'Use Non-Redis Editor',
      keys: [(<span className="shiftSymbol">⇧</span>), 'Space'],
    }
  },
  rdi: {
    openDedicatedEditor: {
      description: 'Open a dedicated SQL or JMESPath editor',
      keys: [(<span className="shiftSymbol">⇧</span>), 'Space']
    }
  }
}

export const KEYBOARD_SHORTCUTS = isMacOs() ? MAC_SHORTCUTS : COMMON_SHORTCUTS
