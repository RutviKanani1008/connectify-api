import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import * as reportProblemController from '../controllers/reportProblem.controller'

const reportProblem = Router()

reportProblem.get('/report-problems/:id', authenticated, reportProblemController.getReportProblemById)
reportProblem.get('/report-problems', authenticated, reportProblemController.getAllReportProblems)
reportProblem.put('/report-problems/read-new', authenticated, reportProblemController.updateReadNewReportProblems)
reportProblem.put('/report-problems/:id', authenticated, reportProblemController.updateReportProblemById)
reportProblem.delete('/report-problems/:id', authenticated, reportProblemController.deleteReportProblem)

export default reportProblem
