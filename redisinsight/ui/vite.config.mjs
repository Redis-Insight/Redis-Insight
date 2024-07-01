import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'
// import { compression } from 'vite-plugin-compression2'
import { fileURLToPath, URL } from 'url'
import path from 'path'

const hostedApiBaseUrl = process.env.RI_HOSTED_API_BASE_URL
const isElectron = process.env.RI_APP_TYPE === 'electron'
// set path to index.tsx in the index.html
process.env.RI_INDEX_NAME = isElectron ? 'indexElectron.tsx' : 'index.tsx'
const outDir = isElectron ? '../dist/renderer' : './dist'

const apiUrl = process.env.RI_SERVER_TLS_CERT && process.env.RI_SERVER_TLS_KEY
  ? 'https://localhost'
  : 'http://localhost'

let base
if (hostedApiBaseUrl) {
  base = '/'
} else {
  base = process.env.NODE_ENV === 'development' ? '/' : (isElectron ? '' : '/__RIPROXYPATH__')
}

/**
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  base,
  plugins: [
    react(),
    svgr({ include: ['**/*.svg?react'] }),
    // !isElectron && compression({
    //   include: [/\.(js)$/, /\.(css)$/],
    //   deleteOriginalAssets: true
    // }),
  ],
  resolve: {
    alias: {
      lodash: 'lodash-es',
      '@elastic/eui$': '@elastic/eui/optimize/lib',
      uiSrc: fileURLToPath(new URL('./src', import.meta.url)),
      apiSrc: fileURLToPath(new URL('../api/src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
  },
  envPrefix: 'RI_',
  optimizeDeps: {
    include: [
      'monaco-editor'
      // 'monaco-yaml/yaml.worker',
    ],
    esbuildOptions: {
      // fix for https://github.com/bvaughn/react-virtualized/issues/1722
      plugins: [fixReactVirtualized],
    },
  },
  build: {
    commonjsOptions: {
      exclude: ['./packages'],
    },
    outDir,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // TODO chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          return 'index'
        },
      },
    },
    define: {
      this: 'window',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // add @layer app for css ordering. Styles without layer have the highest priority
        // https://github.com/vitejs/vite/issues/3924
        additionalData: (source, filename) => {
          if (path.extname(filename) === '.scss') {
            const skipFiles = ['/main.scss', '/App.scss']
            if (skipFiles.every((file) => !filename.endsWith(file))) {
              return `
                @use "uiSrc/styles/mixins/_eui.scss";
                @use "uiSrc/styles/mixins/_global.scss";
                @layer app { ${source} }
              `
            }
          }
          return source
        },
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {
      RI_API_PREFIX: 'api',
      RI_APP_PORT: '5540',
      RI_BASE_API_URL: apiUrl,
      RI_RESOURCES_BASE_URL: apiUrl,
      RI_PIPELINE_COUNT_DEFAULT: '5',
      RI_SCAN_COUNT_DEFAULT: '500',
      RI_SCAN_TREE_COUNT_DEFAULT: '10000',
      RI_APP_TYPE: process.env.RI_APP_TYPE,
      RI_CONNECTIONS_TIMEOUT_DEFAULT: 30 * 1000,
      RI_HOSTED_API_BASE_URL: hostedApiBaseUrl,
      RI_CSRF_ENDPOINT: process.env.RI_CSRF_ENDPOINT,
    },
  },
  // hack: apply proxy path to monaco webworker
  experimental: {
    renderBuiltUrl() {
      return { relative: true }
    },
  }
})
