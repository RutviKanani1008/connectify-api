import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import * as featureRequestController from '../controllers/featureRequest.controller'

const featureRequest = Router()

featureRequest.get('/feature-requests/:id', authenticated, featureRequestController.getFeatureRequestById)
featureRequest.get('/feature-requests', authenticated, featureRequestController.getAllFeatureRequests)
featureRequest.put('/feature-requests/read-new', authenticated, featureRequestController.updateReadNewFeatureRequests)
featureRequest.put('/feature-requests/:id', authenticated, featureRequestController.updateFeatureRequestById)
featureRequest.delete('/feature-requests/:id', authenticated, featureRequestController.deleteFeatureRequest)

export default featureRequest
