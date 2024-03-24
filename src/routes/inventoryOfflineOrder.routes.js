import { Router } from 'express'
import {
 createOfflineOrder, getOfflineOrdersAggregation, getSpecificOrderDetails, updateOfflineOrderDetails
} from '../controllers/inventoryOfflineOrder.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const router = Router()

// post
router.post('/inventory/offline-order', authenticated, createOfflineOrder)

//put 
router.put('/inventory/offline-order/:id', authenticated, updateOfflineOrderDetails)

//get

router.get('/inventory/offline-order', authenticated, getOfflineOrdersAggregation)
router.get('/inventory/offline-order/:id', authenticated, getSpecificOrderDetails)




export default router
