import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import * as reportFeatureCommentsController from '../controllers/reportFeatureComments.controller'

const reportFeatureComments = Router()

reportFeatureComments.get(
  '/report-feature-comments/:itemId',
  authenticated,
  reportFeatureCommentsController.getAllReportFeatureComments
)
reportFeatureComments.post(
  '/report-feature-comments/:itemId',
  authenticated,
  reportFeatureCommentsController.addReportFeatureComment
)
reportFeatureComments.put(
  '/report-feature-comments/:id',
  authenticated,
  reportFeatureCommentsController.editReportFeatureComment
)
reportFeatureComments.delete(
  '/report-feature-comments/:id',
  authenticated,
  reportFeatureCommentsController.deleteReportFeatureComment
)

export default reportFeatureComments
