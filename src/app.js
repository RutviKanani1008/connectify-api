import { config } from 'dotenv'
import express from 'express'
import cors from 'cors'
import dbConnection from './db/connection'
import router from './routes'
import path from 'path'
import { handleInvoiceStatus } from './controllers/invoice.controller'
import { Server } from 'socket.io'
import { wooProductWebhookDetail } from './controllers/inventoryProduct.controller'
import { wooOrderWebhookDetail } from './controllers/inventoryOnlineOrder.controller'

// ** Cron **
import './crons'
import { createServer } from 'http'

const __dirname = path.resolve()

config({ path: `.env.${process.env.NODE_ENV}` })
dbConnection()

const PORT = process.env.PORT || 8000

const app = express()
app.use(cors())
const server = createServer(app)

export const io = new Server(server, {
  cors: { origin: process.env.FRONT_URL }
})

app.use(express.static(path.join(__dirname, './public')))

/* Stripe Response Handler */
app.post('/webhook', express.raw({ type: 'application/json' }), handleInvoiceStatus)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.post('/inventory/product/woowebhook', wooProductWebhookDetail)
app.post('/inventory/order/woowebhook', wooOrderWebhookDetail)

app.use('/', router)

const sockets = {}
io.on('connection', (socket) => {
  console.log('Socket Connected.')
  socket.on('join-socket', ({ userId }) => {
    socket.join(userId)
  })
  socket.on('initializeConnection', (sessionId) => {
    sockets[sessionId] = socket.id
    app.set('sockets', sockets)
  })

  socket.on('terminateConnection', (sessionId) => {
    console.log(sessionId, 'sessionId terminate')
    delete sockets[sessionId]
    app.set('sockets', sockets)
  })
})

app.set('io', io)

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}.`)
})
