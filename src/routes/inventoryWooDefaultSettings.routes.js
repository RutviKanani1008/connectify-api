import { Router } from 'express'

import { authenticated } from '../middlewares/authenticated.middleware'
import {
 getWooDefaultSettings
} from '../controllers/InventoryWooDefaultSettings.controller'

const router = Router()

// get
router.get('/inventory/woo-settings', authenticated, getWooDefaultSettings)


export default router
