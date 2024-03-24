import { Router } from 'express'
import {
  getOnlineOrdersAggregation, getSpecificOrderDetails, updateOnlineOrderDetails
} from '../controllers/inventoryOnlineOrder.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

//get

router.get('/inventory/online-order', authenticated, getOnlineOrdersAggregation)
router.get('/inventory/online-order/:id', authenticated, getSpecificOrderDetails)

router.put('/inventory/online-order/:id', authenticated, updateOnlineOrderDetails)

export default router
