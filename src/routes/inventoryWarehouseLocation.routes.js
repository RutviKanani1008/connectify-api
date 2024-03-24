import { Router } from 'express'

import { authenticated } from '../middlewares/authenticated.middleware'
import {
  checkLocationIsexist,
  createWarehouseLocation,
  deleteLocationById,
  getLocation,
  getWarehouseLocations,
  updateLocation
} from '../controllers/inventoryWarehouseLocations.controller'

const router = Router()

// post
router.post('/inventory/warehouse-location', authenticated, createWarehouseLocation)

// get
router.get('/inventory/warehouse-location/is-exist', authenticated, checkLocationIsexist)
router.get('/inventory/warehouse-location/all', authenticated, getWarehouseLocations)
router.get('/inventory/warehouse-location/:id', authenticated, getLocation)

// put
router.put('/inventory/warehouse-location/:id', authenticated, updateLocation)

// delete
router.delete('/inventory/warehouse-location/:id', authenticated, deleteLocationById)

export default router
