import { Router } from 'express'
import { changePosition, emit, exportData, exportTaskData, resetPosition } from '../controllers/general.controller'
import { authQueue, authenticated } from '../middlewares/authenticated.middleware'
import { updateReportProblem } from '../repositories/reportProblem.repository'

const general = Router()

general.get('/export-data', authenticated, exportData)
general.post('/change-position', authenticated, changePosition)
general.post('/reset-position', resetPosition)
general.post('/export-task-data', authenticated, exportTaskData)
general.post('/emit', authQueue, emit)
general.get('/update-report-problems', updateReportProblem)

export default general
