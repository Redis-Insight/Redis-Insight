/* eslint-disable sonarjs/no-nested-template-literals */
/* eslint-disable no-restricted-globals */
// @ts-nocheck
export const importPluginScript = () => (config) => {
  const { scriptSrc, stylesSrc, iframeId, modules, baseUrl } = JSON.parse(config)
  const events = {
    EXECUTE_COMMAND: 'executeCommand',
    EXECUTE_REDIS_COMMAND: 'executeRedisCommand'
  }

  Object.defineProperty(globalThis, 'state', {
    value: {
      callbacks: { counter: 0 },
      pluginState: {},
      config: { scriptSrc, stylesSrc, iframeId, baseUrl },
      modules
    },
    writable: false
  })

  const { callbacks } = globalThis.state

  const sendMessageToMain = (data = {}) => {
    const event = document.createEvent('Event')
    event.initEvent('message', false, false)
    event.data = data
    event.origin = '*'
    parent.dispatchEvent(event)
  }

  const providePluginSDK = () => {
    globalThis.PluginSDK = {
      setHeaderText: (text) => {
        sendMessageToMain({
          event: 'setHeaderText',
          iframeId,
          text
        })
      },
      setPluginLoadSucceed: () => {
        sendMessageToMain({
          event: 'loaded',
          iframeId,
        })
      },
      setPluginLoadFailed: (error) => {
        sendMessageToMain({
          event: 'error',
          iframeId,
          error,
        })
      }
    }
  }

  const listenEvents = () => {
    globalThis.onmessage = (e) => {
      // eslint-disable-next-line sonarjs/no-collapsible-if
      if (e.data.event === events.EXECUTE_COMMAND) {
        const { plugin } = globalThis
        // eslint-disable-next-line no-prototype-builtins
        if (plugin.hasOwnProperty(e.data.method)) {
          const action = plugin[e.data.method]
          if (typeof action === 'function') {
            action(e.data.data)
          }
        }
      }

      // eslint-disable-next-line sonarjs/no-collapsible-if
      if (e.data.event === events.EXECUTE_REDIS_COMMAND) {
        // eslint-disable-next-line no-prototype-builtins
        if (callbacks.hasOwnProperty(e.data.requestId)) {
          const action = callbacks[e.data.requestId]
          if (typeof action === 'function') {
            action(e.data.data)
          }
          delete callbacks[e.data.requestId]
        }
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      sendMessageToMain({
        event: 'heightChanged',
        iframeId,
        height: document.body.offsetHeight
      })
    })

    resizeObserver.observe(document.body)

    document.addEventListener('click', () => {
      sendMessageToMain({
        event: 'click',
        iframeId,
      })
    })
  }

  providePluginSDK()
  listenEvents()
}

export const prepareIframeHtml = (config) => {
  const importPluginScriptInner: string = importPluginScript().toString()
  const { scriptSrc, scriptPath, stylesSrc, bodyClass } = config
  const stylesLinks = stylesSrc.map((styleSrc: string) => `<link rel="stylesheet" href=${styleSrc} />`).join('')
  const configString = JSON.stringify(config)

  return `
      <head>
        ${stylesLinks}
        <!-- Forbid XMLHttpRequest (AJAX), WebSocket, fetch(), <a ping> or EventSource -->
        <meta http-equiv="Content-Security-Policy" content="connect-src 'none';">
      </head>
      <body class="${bodyClass}" style="height: fit-content">
        <div id="app"></div>
        <script>
          globalThis.plugin = {}
          ;(${importPluginScriptInner})(\`${configString}\`);
          import(\`${scriptSrc}\`)
              .then((module) => {
                  globalThis.plugin = { ...module.default };
                  globalThis.PluginSDK.setPluginLoadSucceed();
              })
              .catch((e) => {
                  var error = \`${scriptPath} not found. Check if it has been renamed or deleted and try again.\`
                  globalThis.PluginSDK.setPluginLoadFailed(error)
              })
        </script>
        <script src="${scriptSrc}" type="module"></script>
      </body>
`
}
