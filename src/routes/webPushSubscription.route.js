import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { addWebPushSubscription, deleteWebPushSubscription } from '../controllers/webPushSubscription.controller'

const webPushSubscription = Router()

webPushSubscription.post('/web-push/subscribe', authenticated, addWebPushSubscription)
webPushSubscription.delete('/web-push', authenticated, deleteWebPushSubscription)

export default webPushSubscription
