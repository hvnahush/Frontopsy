import { app } from './app.js'
import { failInterruptedCheckups } from './checkups/repository.js'
import { config } from './config.js'
import { pool } from './db/pool.js'

await failInterruptedCheckups().catch((error) => console.error('Could not clean up old checkups', error))

const server = app.listen(config.PORT, () => {
  console.log(`Frontopsy API listening on http://localhost:${config.PORT}`)
})

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0))
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
