import { createApp, type ServerConfig } from './app.js'
import type { Server } from 'node:http'

export { GitService } from './services/gitService.js'
export { MidiService } from './services/midiService.js'
export { CacheService } from './services/cacheService.js'
export { BundleService } from './services/bundleService.js'
export { WavService } from './services/wavService.js'
export type { ServerConfig } from './app.js'

let serverInstance: Server | null = null

export async function startServer(config: ServerConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const app = createApp(config)

      serverInstance = app.listen(config.port, config.host, () => {
        resolve()
      })

      serverInstance.on('error', (error) => {
        reject(error)
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!serverInstance) {
      resolve()
      return
    }

    serverInstance.close((error) => {
      if (error) {
        reject(error)
      } else {
        serverInstance = null
        resolve()
      }
    })
  })
}
