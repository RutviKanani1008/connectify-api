import { Router } from 'express'

import { authenticated } from '../middlewares/authenticated.middleware'
import { getWooStore, saveWooStore } from '../controllers/inventoryWoocommerceConnection.controller'

const router = Router()

// post
router.post('/inventory/woo-connection', authenticated, saveWooStore)

// get
router.get('/inventory/woo-connection', authenticated, getWooStore)

export default router
